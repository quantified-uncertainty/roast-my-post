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
import { loadAgenticProfileOrDefault } from "./profile-loader";
import { buildAgenticQueryOptions } from "./orchestrator";
import { createEvaluationServer } from "./tools";

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
  | { type: "subagent_complete"; agentName: string; taskId: string };

export interface AgenticPluginOptions {
  onMessage?: (event: AgenticStreamEvent) => void;
  maxBudgetUsd?: number;
  profileId?: string;
  /** Path to temp workspace where document and findings are stored */
  workspacePath?: string;
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

export const AGENTIC_SYSTEM_PROMPT = `You are a document analyst. Analyze the provided document thoroughly for:

1. **Factual errors** - Claims that are demonstrably wrong
2. **Logical fallacies** - Flawed reasoning patterns
3. **Unsupported claims** - Assertions without adequate evidence
4. **Quality issues** - Unclear writing, contradictions, or misleading framing

Use web search to verify factual claims when possible. Be specific - quote exact text from the document for each finding.

Focus on substantive issues. Do not flag stylistic preferences or minor formatting concerns.`;

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
              "Detailed explanation of the issue and why it matters.",
          },
        },
        required: ["type", "severity", "quotedText", "header", "description"],
      },
    },
    summary: {
      type: "string" as const,
      description: "Overall summary of the document analysis.",
    },
    overallGrade: {
      type: "number" as const,
      description: "Quality score from 0 to 100.",
      minimum: 0,
      maximum: 100,
    },
  },
  required: ["findings", "summary", "overallGrade"],
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
  private maxBudgetUsd: number;
  private profileId?: string;
  private workspacePath?: string;
  private numTurns = 0;

  constructor(options?: AgenticPluginOptions) {
    this.onMessage = options?.onMessage;
    this.maxBudgetUsd = options?.maxBudgetUsd ?? 2.0;
    this.profileId = options?.profileId;
    this.workspacePath = options?.workspacePath;
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

  async analyze(
    _chunks: TextChunk[],
    documentText: string
  ): Promise<AnalysisResult> {
    this.processingStartTime = Date.now();

    if (this.hasRun) {
      return this.getResults();
    }

    try {
      const output = await this.runAgenticAnalysis(documentText);

      for (const finding of output.findings) {
        const comment = await this.createCommentFromFinding(finding, documentText);
        if (comment) {
          this.comments.push(comment);
        }
      }

      this.summaryText = output.summary;
      this.analysisText = output.summary;
      this.gradeValue = output.overallGrade;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Agentic analysis failed:", error instanceof Error ? error : new Error(errorMessage));
      this.summaryText = `Agentic analysis failed: ${errorMessage}`;
      this.analysisText = this.summaryText;
      this.emit({ type: "error", message: errorMessage });
    }

    this.hasRun = true;
    return this.getResults();
  }

  private emit(event: AgenticStreamEvent): void {
    try {
      this.onMessage?.(event);
    } catch {
      // Don't let callback errors break the analysis
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
        this.emit({
          type: "init",
          model: message.model,
          tools: message.tools,
        });
        // Only log agent info in multi-agent mode (when we've defined custom agents)
        if (config.enableSubAgents && "agents" in message && Array.isArray(message.agents) && message.agents.length > 0) {
          this.emit({
            type: "status",
            message: `SDK initialized with agents: ${(message.agents as string[]).join(", ")}`,
          });
        }
      } else if (message.type === "assistant") {
        const agentName = tracker?.getAgentName(message.parent_tool_use_id ?? undefined);

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
                this.emit({ type: "subagent_start", agentName: spawned, taskId: block.id });
              }
            }

            this.emit(
              agentName
                ? { type: "subagent_tool_use", agentName, toolName: block.name, input: JSON.stringify(block.input) }
                : { type: "tool_use", toolName: block.name, input: JSON.stringify(block.input) }
            );
          }
        }
      } else if (message.type === "user") {
        const agentName = tracker?.getAgentName(message.parent_tool_use_id ?? undefined);

        // Extract full tool result from message.message content blocks
        const parts: string[] = [];
        const msg = message.message;
        if (msg && "content" in msg && Array.isArray(msg.content)) {
          for (const block of msg.content) {
            if (typeof block === "string") {
              parts.push(block);
            } else if (block.type === "tool_result") {
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
        const rawOutput = parts.join("\n");
        const output = stripSystemReminders(rawOutput);
        if (output) {
          this.emit(
            agentName
              ? { type: "subagent_tool_result", agentName, output }
              : { type: "tool_result", output }
          );
        }
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
          overallGrade: 0,
        };
      }
    }

    return {
      findings: [],
      summary: "Analysis produced no result",
      overallGrade: 0,
    };
  }

  private parseResult(resultText: string): AgenticAnalysisOutput {
    try {
      const parsed = JSON.parse(resultText);
      return {
        findings: Array.isArray(parsed.findings) ? parsed.findings : [],
        summary: parsed.summary || "",
        overallGrade:
          typeof parsed.overallGrade === "number" ? parsed.overallGrade : 0,
      };
    } catch {
      logger.warn("Failed to parse agentic analysis result as JSON");
      return {
        findings: [],
        summary: resultText.slice(0, 500),
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
    return {
      summary: this.summaryText,
      analysis: this.analysisText,
      comments: this.comments,
      cost: this.totalCost,
      grade: this.gradeValue,
      pipelineTelemetry: {
        numTurns: this.numTurns,
      },
    };
  }
}
