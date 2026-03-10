/**
 * Agentic Analysis Plugin
 *
 * Uses the Claude Agent SDK's query() to let Claude freely investigate
 * a document, then returns structured findings as Comments.
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import type {
  SDKResultSuccess,
  SDKResultError,
} from "@anthropic-ai/claude-agent-sdk";
import { mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

import type { Comment } from "../../../shared/types";
import type {
  AnalysisResult,
  RoutingExample,
  SimpleAnalysisPlugin,
  TextChunk,
} from "../../types";
import { CommentBuilder } from "../../utils/CommentBuilder";
import { logger } from "../../../shared/logger";
import { findTextLocation } from "../../../tools/smart-text-searcher/core";
import { aiConfig } from "../../../config";
import { loadAgenticProfileOrDefault } from "./profile-loader";
import { buildAgenticQueryOptions } from "./orchestrator";
import { createEvaluationServer } from "./tools";
import { AgenticTelemetry } from "./telemetry";
export type { AgenticTelemetryRecord } from "./telemetry";

// ---------------------------------------------------------------------------
// Streaming event types
// ---------------------------------------------------------------------------

export type AgenticStreamEvent =
  | { type: "init"; model: string; tools: string[] }
  | { type: "assistant_text"; text: string }
  | { type: "tool_use"; toolName: string; input: string }
  | { type: "tool_result"; output: string }
  | { type: "status"; message: string }
  | { type: "cost_update"; cost: number; turns: number }
  | { type: "result"; findings: number; grade: number; cost: number }
  | { type: "error"; message: string }
  // Sub-agent tracking events (v2 multi-agent mode)
  | { type: "subagent_start"; agentName: string; taskId: string }
  | { type: "subagent_text"; agentName: string; text: string }
  | { type: "subagent_tool_use"; agentName: string; toolName: string; input: string }
  | { type: "subagent_tool_result"; agentName: string; output: string }
  | { type: "subagent_complete"; agentName: string; taskId: string; durationMs?: number }
  // SDK lifecycle events
  | { type: "tool_progress"; toolName: string; toolUseId: string; elapsedSeconds: number }
  | { type: "task_notification"; taskId: string; taskStatus: string; summary: string }
  | { type: "compacting" };

export interface AgenticPluginOptions {
  onMessage?: (event: AgenticStreamEvent) => void;
  /** Called with a telemetry snapshot after key events. Used for incremental DB persistence. */
  onTelemetryUpdate?: (telemetry: Record<string, unknown>) => void | Promise<void>;
  maxBudgetUsd?: number;
  profileId?: string;
  /** Path to temp workspace where document and findings are stored */
  workspacePath?: string;
  /** Document title for metadata.json */
  documentTitle?: string;
}

// ---------------------------------------------------------------------------
// Sub-agent tracker — maps SDK tool_use IDs to agent names
// ---------------------------------------------------------------------------

export class SubAgentTracker {
  // Maps tool_use_id (from Task tool calls) → agentName
  private taskMap = new Map<string, string>();

  /**
   * When the orchestrator calls the Task tool, extract the agent name
   * from the input and remember the mapping.
   */
  trackTaskSpawn(toolUseId: string, input: unknown): string | null {
    if (!input || typeof input !== "object") return null;
    const inp = input as Record<string, unknown>;

    // The Task tool input typically has a "description" or "prompt" field
    // that indicates which subagent is being spawned. The SDK uses
    // "subagent_type" or the agent name directly.
    const agentName =
      (typeof inp.subagent_type === "string" && inp.subagent_type) ||
      (typeof inp.description === "string" && inp.description) ||
      null;

    if (agentName) {
      this.taskMap.set(toolUseId, agentName);
    }
    return agentName;
  }

  /**
   * Look up the agent name for a message that has a parent_tool_use_id.
   */
  getAgentName(parentToolUseId: string | undefined): string | null {
    if (!parentToolUseId) return null;
    return this.taskMap.get(parentToolUseId) ?? null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip SDK-injected <system-reminder>...</system-reminder> tags from tool output */
function stripSystemReminders(text: string): string {
  return text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "").trim();
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export { AGENTIC_SYSTEM_PROMPT } from "./prompts";

interface AgenticFinding {
  type: "factual_error" | "logical_fallacy" | "unsupported_claim" | "quality_issue";
  severity: "error" | "warning" | "info";
  quotedText: string;
  header: string;
  description: string;
}

interface AgenticAnalysisOutput {
  findings: AgenticFinding[];
  summary: string;
  analysis: string;
  overallGrade: number;
}

const FINDINGS_JSON_SCHEMA = {
  type: "object" as const,
  properties: {
    findings: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          type: {
            type: "string" as const,
            enum: [
              "factual_error",
              "logical_fallacy",
              "unsupported_claim",
              "quality_issue",
            ],
          },
          severity: {
            type: "string" as const,
            enum: ["error", "warning", "info"],
          },
          quotedText: {
            type: "string" as const,
            description:
              "Exact text quoted from the document. Must be a verbatim substring.",
          },
          header: {
            type: "string" as const,
            description: "Brief title for this finding (5-10 words).",
          },
          description: {
            type: "string" as const,
            description:
              "Detailed explanation using markdown formatting (bold, bullets, links). For fact-check findings, include source URLs as markdown links.",
          },
        },
        required: ["type", "severity", "quotedText", "header", "description"],
      },
    },
    summary: {
      type: "string" as const,
      description: "One-line summary of the analysis (e.g., 'Found 4 issues: 1 factual error, 2 unsupported claims, 1 clarity issue').",
    },
    analysis: {
      type: "string" as const,
      description:
        "Detailed analysis in structured markdown with headers (##), bullet points, and **bold** for key conclusions. Include: overall document assessment, breakdown of findings by type and severity, key strengths of the document, and a brief note on the document's epistemic quality. 2-4 paragraphs.",
    },
    overallGrade: {
      type: "number" as const,
      description: "Quality score from 0 to 100.",
      minimum: 0,
      maximum: 100,
    },
  },
  required: ["findings", "summary", "analysis", "overallGrade"],
};

const SEVERITY_TO_LEVEL: Record<
  string,
  "error" | "warning" | "info"
> = {
  error: "error",
  warning: "warning",
  info: "info",
};

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export class AgenticPlugin implements SimpleAnalysisPlugin {
  readonly runOnAllChunks = true;

  private totalCost = 0;
  private hasRun = false;
  private comments: Comment[] = [];
  private summaryText = "";
  private analysisText = "";
  private gradeValue?: number;
  private processingStartTime = 0;
  private onMessage?: (event: AgenticStreamEvent) => void;
  private onTelemetryUpdate?: (telemetry: Record<string, unknown>) => void | Promise<void>;
  private maxBudgetUsd: number;
  private profileId?: string;
  private workspacePath?: string;
  private documentTitle?: string;
  private numTurns = 0;
  private agentStartTimes = new Map<string, number>();
  private telemetry: AgenticTelemetry;

  constructor(options?: AgenticPluginOptions) {
    this.onMessage = options?.onMessage;
    this.onTelemetryUpdate = options?.onTelemetryUpdate;
    this.maxBudgetUsd = options?.maxBudgetUsd ?? 2.0;
    this.profileId = options?.profileId;
    this.workspacePath = options?.workspacePath;
    this.documentTitle = options?.documentTitle;
    this.telemetry = new AgenticTelemetry({
      maxBudgetUsd: this.maxBudgetUsd,
      profileId: this.profileId,
      workspacePath: this.workspacePath,
    });
  }

  /** Returns the workspace path (created during analyze if not provided) */
  getWorkspacePath(): string | undefined {
    return this.workspacePath;
  }

  name(): string {
    return "AGENTIC";
  }

  promptForWhenToUse(): string {
    return "Agentic analysis uses Claude with web search to thoroughly analyze documents for errors, fallacies, unsupported claims, and quality issues.";
  }

  routingExamples(): RoutingExample[] {
    return [];
  }

  getCost(): number {
    return this.totalCost;
  }

  getDebugInfo(): Record<string, unknown> {
    return {
      hasRun: this.hasRun,
      findingsCount: this.comments.length,
      cost: this.totalCost,
      grade: this.gradeValue,
    };
  }

  /** Returns current telemetry snapshot (partial data OK — useful on timeout) */
  getTelemetry(): Record<string, unknown> {
    return this.telemetry.toJSON() as unknown as Record<string, unknown>;
  }

  async analyze(
    _chunks: TextChunk[],
    documentText: string
  ): Promise<AnalysisResult> {
    this.processingStartTime = Date.now();

    if (this.hasRun) {
      return this.getResults();
    }

    try {
      await this.ensureWorkspace(documentText);
      const output = await this.runAgenticAnalysis(documentText);

      for (const finding of output.findings) {
        const comment = await this.createCommentFromFinding(finding, documentText);
        if (comment) {
          this.comments.push(comment);
        }
      }

      this.summaryText = output.summary;
      this.analysisText = output.analysis;
      this.gradeValue = output.overallGrade;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Agentic analysis failed:", error instanceof Error ? error : new Error(errorMessage));
      this.telemetry.recordError(errorMessage, this.totalCost, this.numTurns);
      this.persistTelemetry();
      this.summaryText = `Agentic analysis failed: ${errorMessage}`;
      this.analysisText = this.summaryText;
      this.emit({ type: "error", message: errorMessage });
    } finally {
      await this.cleanupWorkspace();
    }

    this.hasRun = true;
    return this.getResults();
  }

  private emit(event: AgenticStreamEvent): void {
    this.logEvent(event);
    try {
      this.onMessage?.(event);
    } catch {
      // Don't let callback errors break the analysis
    }
  }

  /** Log a stream event to the console in a compact, readable format */
  private logEvent(event: AgenticStreamEvent): void {
    switch (event.type) {
      case "init":
        logger.dev(`[agentic] Init: model=${event.model} tools=${event.tools.length}`);
        break;
      case "subagent_start":
        logger.dev(`[agentic] Sub-agent started: ${event.agentName} (task=${event.taskId})`);
        break;
      case "subagent_complete":
        logger.dev(`[agentic] Sub-agent completed: ${event.agentName} (${event.durationMs ? `${(event.durationMs / 1000).toFixed(1)}s` : "?"})`);
        break;
      case "subagent_text":
        logger.dev(`[agentic]   ${event.agentName}: ${event.text.slice(0, 200)}${event.text.length > 200 ? "..." : ""}`);
        break;
      case "subagent_tool_use":
        logger.dev(`[agentic]   ${event.agentName} → ${event.toolName}\n${event.input.slice(0, 500)}${event.input.length > 500 ? "..." : ""}`);
        break;
      case "subagent_tool_result":
        logger.dev(`[agentic]   ${event.agentName} ← ${event.output.slice(0, 500)}${event.output.length > 500 ? "..." : ""}`);
        break;
      case "assistant_text":
        logger.dev(`[agentic] text: ${event.text.slice(0, 200)}${event.text.length > 200 ? "..." : ""}`);
        break;
      case "tool_use":
        logger.dev(`[agentic] Tool call: ${event.toolName}\n${event.input.slice(0, 500)}${event.input.length > 500 ? "..." : ""}`);
        break;
      case "tool_result":
        logger.dev(`[agentic] Tool result: ${event.output.slice(0, 500)}${event.output.length > 500 ? "..." : ""}`);
        break;
      case "tool_progress":
        logger.dev(`[agentic] Tool progress: ${event.toolName} ${event.elapsedSeconds}s`);
        break;
      case "task_notification":
        logger.dev(`[agentic] Task notification: ${event.taskId} → ${event.taskStatus}`);
        break;
      case "cost_update":
        logger.dev(`[agentic] Cost: $${event.cost.toFixed(4)} (${event.turns} turns)`);
        break;
      case "result":
        logger.dev(`[agentic] Result: ${event.findings} findings, grade=${event.grade}, cost=$${event.cost.toFixed(4)}`);
        break;
      case "error":
        logger.dev(`[agentic] Error: ${event.message}`);
        break;
      case "compacting":
        logger.dev(`[agentic] Context compacting...`);
        break;
      case "status":
        logger.dev(`[agentic] ${event.message}`);
        break;
    }
  }

  /** Persist current telemetry snapshot via callback (fire-and-forget) */
  private persistTelemetry(): void {
    if (!this.onTelemetryUpdate) return;
    try {
      const snapshot = this.telemetry.toJSON() as unknown as Record<string, unknown>;
      // Fire-and-forget — don't await to avoid slowing down the message loop
      const result = this.onTelemetryUpdate(snapshot);
      // Catch promise rejections silently
      if (result && typeof result === "object" && "catch" in result) {
        (result as Promise<void>).catch(() => {});
      }
    } catch {
      // Don't let persistence errors break the analysis
    }
  }

  /**
   * Ensure workspace directory exists with document.md and findings/ subdir.
   * If workspacePath wasn't provided, generates a new temp directory.
   */
  private async ensureWorkspace(documentText: string): Promise<void> {
    if (!this.workspacePath) {
      this.workspacePath = join("/tmp", `agentic-${randomUUID()}`);
    }

    await mkdir(this.workspacePath, { recursive: true });
    await mkdir(join(this.workspacePath, "findings"), { recursive: true });
    await writeFile(join(this.workspacePath, "document.md"), documentText, "utf-8");
    await writeFile(
      join(this.workspacePath, "metadata.json"),
      JSON.stringify({ title: this.documentTitle ?? "Untitled" }, null, 2),
      "utf-8"
    );

    this.emit({ type: "status", message: `Workspace: ${this.workspacePath}` });
    logger.info(`Agentic workspace ready at ${this.workspacePath}`);
  }

  /**
   * Remove the temp workspace directory after analysis completes.
   * Enabled by default to prevent /tmp accumulation.
   * Set AGENTIC_CLEANUP_WORKSPACE=false to preserve workspaces for debugging.
   */
  private async cleanupWorkspace(): Promise<void> {
    if (!this.workspacePath) return;
    if (!aiConfig.agenticCleanupWorkspace) {
      logger.info(`Agentic workspace preserved at ${this.workspacePath}`);
      return;
    }
    try {
      await rm(this.workspacePath, { recursive: true, force: true });
      logger.info(`Agentic workspace cleaned up: ${this.workspacePath}`);
    } catch (err) {
      logger.warn(`Failed to clean up workspace ${this.workspacePath}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private async runAgenticAnalysis(
    documentText: string
  ): Promise<AgenticAnalysisOutput> {
    const config = await loadAgenticProfileOrDefault(this.profileId, "system-agentic");
    logger.info(`Loaded agentic config: version=${config.version} enableSubAgents=${config.enableSubAgents} model=${config.model} profileId=${this.profileId ?? "default"}`);

    // Create MCP evaluation server with config (e.g., fallacy checker profile)
    const evaluationServer = createEvaluationServer({
      fallacyCheckProfileId: config.fallacyCheckProfileId,
    });

    // Build SDK options — branches between single-agent and multi-agent modes
    const emitFn = (event: { type: string; message: string }) => this.emit(event as AgenticStreamEvent);
    const queryOptions = buildAgenticQueryOptions(config, evaluationServer, this.workspacePath, emitFn);

    // If workspace is available, tell the agent where to find the document
    const workspaceInfo = this.workspacePath
      ? `\n\nThe document is available at: ${this.workspacePath}/document.md\nYou can use Read, Grep, and Glob tools to access it. You may also write notes to the workspace.`
      : "";

    const prompt = `<document>\n${documentText}\n</document>\n\nAnalyze this document thoroughly. For each issue found, quote the exact text from the document.${workspaceInfo}`;

    // Create sub-agent tracker for v2 mode
    const tracker = config.enableSubAgents ? new SubAgentTracker() : null;

    if (config.enableSubAgents) {
      const agentNames = queryOptions.agents ? Object.keys(queryOptions.agents) : [];
      this.emit({
        type: "status",
        message: `Multi-agent mode enabled with ${agentNames.length} sub-agents: ${agentNames.join(", ")}${config.enableMcpTools ? " (MCP tools ON)" : ""}`,
      });
    }

    for await (const message of query({
      prompt,
      options: {
        ...queryOptions,
        persistSession: false,
        outputFormat: {
          type: "json_schema",
          schema: FINDINGS_JSON_SCHEMA,
        },
      },
    })) {
      if (message.type === "system" && "subtype" in message && message.subtype === "init") {
        const initAgents = "agents" in message && Array.isArray(message.agents)
          ? (message.agents as string[])
          : undefined;
        this.telemetry.recordInit(message.model, message.tools, initAgents);
        this.telemetry.recordEventCompleted();
        this.persistTelemetry();
        this.emit({
          type: "init",
          model: message.model,
          tools: message.tools,
        });
        // Only log agent info in multi-agent mode (when we've defined custom agents)
        if (config.enableSubAgents && initAgents && initAgents.length > 0) {
          this.emit({
            type: "status",
            message: `SDK initialized with agents: ${initAgents.join(", ")}`,
          });
        }
      } else if (message.type === "assistant") {
        const agentName = tracker?.getAgentName(message.parent_tool_use_id ?? undefined);

        // Extract token usage from the assistant message
        const msgUsage = message.message?.usage;
        const tokenUsage = msgUsage ? {
          inputTokens: msgUsage.input_tokens ?? 0,
          outputTokens: msgUsage.output_tokens ?? 0,
          cacheReadInputTokens: msgUsage.cache_read_input_tokens ?? undefined,
          cacheCreationInputTokens: msgUsage.cache_creation_input_tokens ?? undefined,
        } : undefined;

        this.telemetry.recordAssistantMessage(agentName ?? undefined, tokenUsage);

        // Log token usage for visibility
        if (tokenUsage) {
          const cacheInfo = tokenUsage.cacheReadInputTokens
            ? ` cache_read=${tokenUsage.cacheReadInputTokens}`
            : "";
          logger.dev(`[agentic] ${agentName ? `  ${agentName} ` : ""}tokens: in=${tokenUsage.inputTokens} out=${tokenUsage.outputTokens}${cacheInfo}`);
        }

        for (const block of message.message.content) {
          if (block.type === "text") {
            this.emit(
              agentName
                ? { type: "subagent_text", agentName, text: block.text }
                : { type: "assistant_text", text: block.text }
            );
          } else if (block.type === "tool_use") {
            // Track Task tool spawns for sub-agent mapping
            if (block.name === "Task" && tracker) {
              const spawned = tracker.trackTaskSpawn(block.id, block.input);
              if (spawned) {
                this.agentStartTimes.set(spawned, Date.now());
                this.telemetry.recordSubAgentStart(spawned, block.id);
                this.emit({ type: "subagent_start", agentName: spawned, taskId: block.id });
              }
            }

            // Record tool call — find the parent task ID for sub-agent attribution
            const parentTaskId = agentName
              ? message.parent_tool_use_id ?? undefined
              : undefined;
            this.telemetry.recordToolCall(block.name, block.id, parentTaskId);

            this.emit(
              agentName
                ? { type: "subagent_tool_use", agentName, toolName: block.name, input: JSON.stringify(block.input) }
                : { type: "tool_use", toolName: block.name, input: JSON.stringify(block.input) }
            );
          }
        }
        this.persistTelemetry();
      } else if (message.type === "user") {
        const agentName = tracker?.getAgentName(message.parent_tool_use_id ?? undefined);

        // Extract full tool result from message.message content blocks
        const parts: string[] = [];
        const toolUseIds: string[] = [];
        const msg = message.message;
        if (msg && "content" in msg && Array.isArray(msg.content)) {
          for (const block of msg.content) {
            if (typeof block === "string") {
              parts.push(block);
            } else if (block.type === "tool_result") {
              if (block.tool_use_id) toolUseIds.push(block.tool_use_id);
              const content = block.content;
              if (typeof content === "string") {
                parts.push(content);
              } else if (Array.isArray(content)) {
                for (const c of content) {
                  if (c.type === "text") parts.push(c.text);
                }
              }
            }
          }
        }
        // Fall back to tool_use_result if message parsing yielded nothing
        if (parts.length === 0 && message.tool_use_result) {
          parts.push(
            typeof message.tool_use_result === "string"
              ? message.tool_use_result
              : JSON.stringify(message.tool_use_result)
          );
        }

        // Record tool result completions in telemetry
        for (const tuId of toolUseIds) {
          this.telemetry.recordToolResult(tuId);
        }
        this.telemetry.recordEventCompleted();

        const rawOutput = parts.join("\n");
        const output = stripSystemReminders(rawOutput);
        if (output) {
          this.emit(
            agentName
              ? { type: "subagent_tool_result", agentName, output }
              : { type: "tool_result", output }
          );
        }
        this.persistTelemetry();
      } else if (message.type === "result") {
        if (message.subtype === "success") {
          const successMsg = message as SDKResultSuccess;
          this.totalCost = successMsg.total_cost_usd;
          this.numTurns = successMsg.num_turns;

          this.emit({
            type: "cost_update",
            cost: successMsg.total_cost_usd,
            turns: successMsg.num_turns,
          });

          const parsed = successMsg.structured_output
            ? (successMsg.structured_output as AgenticAnalysisOutput)
            : this.parseResult(successMsg.result);

          this.telemetry.recordCompletion(
            successMsg.total_cost_usd,
            successMsg.num_turns,
            parsed.findings.length,
            parsed.overallGrade
          );
          this.persistTelemetry();

          this.emit({
            type: "result",
            findings: parsed.findings.length,
            grade: parsed.overallGrade,
            cost: successMsg.total_cost_usd,
          });

          return parsed;
        }

        // Handle error results
        const errorMsg = message as SDKResultError;
        this.totalCost = errorMsg.total_cost_usd;
        const reason =
          errorMsg.subtype === "error_max_turns"
            ? "max turns exceeded"
            : errorMsg.subtype === "error_max_budget_usd"
              ? "budget exceeded"
              : errorMsg.errors?.join("; ") || "unknown error";

        this.telemetry.recordError(reason, errorMsg.total_cost_usd, errorMsg.num_turns);
        this.persistTelemetry();

        this.emit({ type: "error", message: reason });
        this.emit({
          type: "cost_update",
          cost: errorMsg.total_cost_usd,
          turns: errorMsg.num_turns,
        });

        logger.warn(`Agentic analysis ended with: ${reason}`);
        return {
          findings: [],
          summary: `Analysis ended early: ${reason}`,
          analysis: `Analysis ended early: ${reason}`,
          overallGrade: 0,
        };
      } else if (message.type === "tool_progress") {
        this.telemetry.recordToolProgress(
          message.tool_name,
          message.tool_use_id,
          message.elapsed_time_seconds
        );
        this.emit({
          type: "tool_progress",
          toolName: message.tool_name,
          toolUseId: message.tool_use_id,
          elapsedSeconds: message.elapsed_time_seconds,
        });
        this.persistTelemetry();
      } else if (message.type === "system" && "subtype" in message && message.subtype === "task_notification") {
        const taskMsg = message as { task_id: string; status: string; summary: string };
        // Map task_id to agent name if tracked
        const agentName = tracker?.getAgentName(taskMsg.task_id);
        if (agentName) {
          const startTime = this.agentStartTimes.get(agentName);
          const durationMs = startTime ? Date.now() - startTime : undefined;
          const taskStatus = taskMsg.status === "completed" ? "completed" as const : "failed" as const;
          this.telemetry.recordSubAgentComplete(taskMsg.task_id, taskStatus);
          this.emit({ type: "subagent_complete", agentName, taskId: taskMsg.task_id, durationMs });
        }
        this.emit({
          type: "task_notification",
          taskId: taskMsg.task_id,
          taskStatus: taskMsg.status,
          summary: taskMsg.summary,
        });
        this.persistTelemetry();
      } else if (message.type === "system" && "subtype" in message && message.subtype === "compact_boundary") {
        const compactMsg = message as { compact_metadata?: { trigger?: string; pre_tokens?: number } };
        const preTokens = compactMsg.compact_metadata?.pre_tokens;
        logger.dev(`[agentic] Context compacted: pre_tokens=${preTokens ?? "?"} trigger=${compactMsg.compact_metadata?.trigger ?? "?"}`);
        this.telemetry.recordCompacting(preTokens);
        this.emit({ type: "compacting" });
        this.persistTelemetry();
      } else if (message.type === "system" && "subtype" in message && message.subtype === "status") {
        const statusMsg = message as { status: string | null };
        if (statusMsg.status === "compacting") {
          this.telemetry.recordCompacting();
          this.emit({ type: "compacting" });
          this.persistTelemetry();
        }
      }
    }

    return {
      findings: [],
      summary: "Analysis produced no result",
      analysis: "Analysis produced no result",
      overallGrade: 0,
    };
  }

  private parseResult(resultText: string): AgenticAnalysisOutput {
    try {
      const parsed = JSON.parse(resultText);
      return {
        findings: Array.isArray(parsed.findings) ? parsed.findings : [],
        summary: parsed.summary || "",
        analysis: parsed.analysis || parsed.summary || "",
        overallGrade:
          typeof parsed.overallGrade === "number" ? parsed.overallGrade : 0,
      };
    } catch {
      logger.warn("Failed to parse agentic analysis result as JSON");
      return {
        findings: [],
        summary: resultText.slice(0, 500),
        analysis: resultText.slice(0, 500),
        overallGrade: 0,
      };
    }
  }

  private async createCommentFromFinding(
    finding: AgenticFinding,
    documentText: string
  ): Promise<Comment | null> {
    const location = await findTextLocation(finding.quotedText, documentText, {
      normalizeQuotes: true,
      partialMatch: true,
    });

    if (!location) {
      logger.warn(
        `Agentic finding quoted text not found in document: "${finding.quotedText.slice(0, 80)}..."`
      );
      return null;
    }

    return CommentBuilder.build({
      plugin: "agentic",
      location: {
        startOffset: location.startOffset,
        endOffset: location.endOffset,
        quotedText: location.quotedText,
      },
      chunkId: "full-document",
      processingStartTime: this.processingStartTime,
      toolChain: [
        {
          toolName: "agentic-analysis",
          stage: "verification",
          timestamp: new Date().toISOString(),
          result: {
            type: finding.type,
            severity: finding.severity,
            header: finding.header,
            description: finding.description,
            quotedText: finding.quotedText,
          },
        },
      ],
      header: finding.header,
      level: SEVERITY_TO_LEVEL[finding.severity] || "info",
      description: finding.description,
    });
  }

  private getResults(): AnalysisResult {
    const telemetrySnapshot = this.telemetry.toJSON() as unknown as Record<string, unknown>;

    logger.dev("[agentic] Telemetry snapshot:", JSON.stringify(telemetrySnapshot, null, 2));

    return {
      summary: this.summaryText,
      analysis: this.analysisText,
      comments: this.comments,
      cost: this.totalCost,
      grade: this.gradeValue,
      pipelineTelemetry: telemetrySnapshot,
    };
  }
}
