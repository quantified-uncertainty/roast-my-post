/**
 * Agentic Plugin Telemetry
 *
 * Incrementally collects telemetry data as events flow through the
 * agentic message loop. Partial data is available at any point via toJSON(),
 * so even timed-out or failed runs produce useful diagnostics.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ToolCallMetrics {
  toolName: string;
  toolUseId: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}

interface McpToolCallMetrics extends ToolCallMetrics {
  /** Parsed metadata from the MCP tool response (e.g. totalDurationMs, extractor count) */
  responseMetadata?: Record<string, unknown>;
}

interface SubAgentMetrics {
  agentName: string;
  taskId: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  status: "running" | "completed" | "failed";
  toolCalls: ToolCallMetrics[];
  mcpToolCalls: McpToolCallMetrics[];
}

interface CompactingEvent {
  timestamp: string;
  /** Token count before compaction */
  preTokens?: number;
}

interface ToolProgressEvent {
  toolName: string;
  toolUseId: string;
  elapsedSeconds: number;
  timestamp: string;
}

interface ApiCallGap {
  /** When the last tool result / init completed */
  afterEvent: string;
  /** When the next assistant message arrived */
  assistantAt: string;
  /** Duration of the gap in ms (Claude API thinking time) */
  durationMs: number;
  /** Which sub-agent context, if any */
  agentName?: string;
  /** Token usage for this API call (from assistant message) */
  usage?: TokenUsage;
}

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
}

interface CumulativeTokenUsage {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheCreationTokens: number;
  /** Number of API calls made */
  apiCalls: number;
}

export interface AgenticTelemetryRecord {
  // Overall
  startedAt: string;
  completedAt?: string;
  totalDurationMs?: number;
  model?: string;
  tools?: string[];
  agents?: string[];
  totalCostUsd?: number;
  numTurns?: number;
  maxBudgetUsd?: number;
  profileId?: string;
  profileName?: string;
  workspacePath?: string;
  success?: boolean;
  error?: string;
  findingsCount?: number;
  grade?: number;

  // Per sub-agent
  subAgents: SubAgentMetrics[];

  // Orchestrator-level tool calls (not inside a sub-agent)
  orchestratorToolCalls: ToolCallMetrics[];

  // SDK lifecycle
  compactingEvents: CompactingEvent[];
  toolProgressEvents: ToolProgressEvent[];

  // API call gaps — time spent waiting for Claude to respond (thinking time)
  apiCallGaps: ApiCallGap[];

  // Token usage
  tokenUsage: CumulativeTokenUsage;
}

interface TelemetryOptions {
  maxBudgetUsd?: number;
  profileId?: string;
  workspacePath?: string;
}

interface PendingToolCall {
  metrics: ToolCallMetrics;
  parentAgent?: string;
}

// MCP tool name prefixes we track for enriched metadata
const MCP_TOOL_PREFIXES = ["mcp__roast-evaluators__"];

function isMcpTool(toolName: string): boolean {
  return MCP_TOOL_PREFIXES.some((p) => toolName.startsWith(p));
}

// ---------------------------------------------------------------------------
// Collector class
// ---------------------------------------------------------------------------

export class AgenticTelemetry {
  private startedAt: string;
  private completedAt?: string;
  private model?: string;
  private tools?: string[];
  private agents?: string[];
  private totalCostUsd?: number;
  private numTurns?: number;
  private maxBudgetUsd?: number;
  private profileId?: string;
  private profileName?: string;
  private workspacePath?: string;
  private success?: boolean;
  private error?: string;
  private findingsCount?: number;
  private grade?: number;

  private subAgentMap = new Map<string, SubAgentMetrics>();
  private orchestratorToolCalls: ToolCallMetrics[] = [];
  private pendingToolCalls = new Map<string, PendingToolCall>();

  private compactingEvents: CompactingEvent[] = [];
  private toolProgressEvents: ToolProgressEvent[] = [];
  private apiCallGaps: ApiCallGap[] = [];
  private cumulativeTokens: CumulativeTokenUsage = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheReadTokens: 0,
    totalCacheCreationTokens: 0,
    apiCalls: 0,
  };
  /** Timestamp of the last non-assistant event (tool_result, init, etc.) */
  private lastNonAssistantEventAt?: string;

  constructor(opts?: TelemetryOptions) {
    this.startedAt = new Date().toISOString();
    this.maxBudgetUsd = opts?.maxBudgetUsd;
    this.profileId = opts?.profileId;
    this.workspacePath = opts?.workspacePath;
  }

  // ----- Recording methods -----

  recordInit(model: string, tools: string[], agents?: string[]): void {
    this.model = model;
    this.tools = tools;
    this.agents = agents;
  }

  recordSubAgentStart(agentName: string, taskId: string): void {
    const metrics: SubAgentMetrics = {
      agentName,
      taskId,
      startedAt: new Date().toISOString(),
      status: "running",
      toolCalls: [],
      mcpToolCalls: [],
    };
    this.subAgentMap.set(taskId, metrics);
  }

  recordSubAgentComplete(taskId: string, status: "completed" | "failed"): void {
    const agent = this.subAgentMap.get(taskId);
    if (!agent) return;
    agent.completedAt = new Date().toISOString();
    agent.status = status;
    agent.durationMs =
      new Date(agent.completedAt).getTime() - new Date(agent.startedAt).getTime();
  }

  recordToolCall(toolName: string, toolUseId: string, parentAgentTaskId?: string): void {
    const metrics: ToolCallMetrics = {
      toolName,
      toolUseId,
      startedAt: new Date().toISOString(),
    };
    this.pendingToolCalls.set(toolUseId, { metrics, parentAgent: parentAgentTaskId });

    // Also file it immediately into the right bucket so partial snapshots show it
    if (parentAgentTaskId) {
      const agent = this.subAgentMap.get(parentAgentTaskId);
      if (agent) {
        if (isMcpTool(toolName)) {
          agent.mcpToolCalls.push(metrics as McpToolCallMetrics);
        } else {
          agent.toolCalls.push(metrics);
        }
      }
    } else {
      this.orchestratorToolCalls.push(metrics);
    }
  }

  /** Record tool completion. Returns true if this was an MCP tool (useful for selective persistence). */
  recordToolResult(toolUseId: string): boolean {
    const pending = this.pendingToolCalls.get(toolUseId);
    if (!pending) return false;

    const { metrics } = pending;
    metrics.completedAt = new Date().toISOString();
    metrics.durationMs =
      new Date(metrics.completedAt).getTime() - new Date(metrics.startedAt).getTime();
    const wasMcp = isMcpTool(metrics.toolName);
    this.pendingToolCalls.delete(toolUseId);
    return wasMcp;
  }

  recordMcpToolMetadata(toolUseId: string, metadata: Record<string, unknown>): void {
    const pending = this.pendingToolCalls.get(toolUseId);
    if (!pending) return;
    // The metrics object is already placed in a sub-agent's mcpToolCalls array
    // by reference, so mutating it here updates both places.
    (pending.metrics as McpToolCallMetrics).responseMetadata = metadata;
  }

  /** Mark that a non-assistant event just completed (starts the gap timer) */
  recordEventCompleted(): void {
    this.lastNonAssistantEventAt = new Date().toISOString();
  }

  /** Record when an assistant message arrives (ends the gap timer) */
  recordAssistantMessage(agentName?: string, usage?: TokenUsage): void {
    // Accumulate token usage
    if (usage) {
      this.cumulativeTokens.totalInputTokens += usage.inputTokens;
      this.cumulativeTokens.totalOutputTokens += usage.outputTokens;
      this.cumulativeTokens.totalCacheReadTokens += usage.cacheReadInputTokens ?? 0;
      this.cumulativeTokens.totalCacheCreationTokens += usage.cacheCreationInputTokens ?? 0;
      this.cumulativeTokens.apiCalls += 1;
    }

    if (this.lastNonAssistantEventAt) {
      const now = new Date();
      const gapMs = now.getTime() - new Date(this.lastNonAssistantEventAt).getTime();
      // Only record gaps > 2s (below that is just normal latency)
      if (gapMs > 2000) {
        this.apiCallGaps.push({
          afterEvent: this.lastNonAssistantEventAt,
          assistantAt: now.toISOString(),
          durationMs: gapMs,
          agentName,
          usage,
        });
      }
      this.lastNonAssistantEventAt = undefined;
    }
  }

  recordCompacting(preTokens?: number): void {
    this.compactingEvents.push({ timestamp: new Date().toISOString(), preTokens });
  }

  recordToolProgress(toolName: string, toolUseId: string, elapsedSeconds: number): void {
    this.toolProgressEvents.push({
      toolName,
      toolUseId,
      elapsedSeconds,
      timestamp: new Date().toISOString(),
    });
  }

  recordCompletion(cost: number, turns: number, findingsCount: number, grade?: number): void {
    this.completedAt = new Date().toISOString();
    this.totalCostUsd = cost;
    this.numTurns = turns;
    this.findingsCount = findingsCount;
    this.grade = grade;
    this.success = true;
  }

  recordError(reason: string, cost?: number, turns?: number): void {
    this.completedAt = new Date().toISOString();
    this.error = reason;
    this.success = false;
    if (cost !== undefined) this.totalCostUsd = cost;
    if (turns !== undefined) this.numTurns = turns;
  }

  // ----- Snapshot -----

  toJSON(): AgenticTelemetryRecord {
    const now = new Date();
    const startMs = new Date(this.startedAt).getTime();
    const endMs = this.completedAt ? new Date(this.completedAt).getTime() : now.getTime();

    return {
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      totalDurationMs: endMs - startMs,
      model: this.model,
      tools: this.tools,
      agents: this.agents,
      totalCostUsd: this.totalCostUsd,
      numTurns: this.numTurns,
      maxBudgetUsd: this.maxBudgetUsd,
      profileId: this.profileId,
      profileName: this.profileName,
      workspacePath: this.workspacePath,
      success: this.success,
      error: this.error,
      findingsCount: this.findingsCount,
      grade: this.grade,
      subAgents: structuredClone(Array.from(this.subAgentMap.values())),
      orchestratorToolCalls: structuredClone(this.orchestratorToolCalls),
      compactingEvents: [...this.compactingEvents],
      toolProgressEvents: [...this.toolProgressEvents],
      apiCallGaps: structuredClone(this.apiCallGaps),
      tokenUsage: { ...this.cumulativeTokens },
    };
  }
}
