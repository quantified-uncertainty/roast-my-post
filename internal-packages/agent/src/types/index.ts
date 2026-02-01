/**
 * Types for the research agent package
 */

export interface AgentResult {
  sessionId: string;
  synthesis: string;
  findings: Finding[];
  metadata: AgentMetadata;
}

export interface Finding {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'info';
  message: string;
  source: string;
  location?: {
    start: number;
    end: number;
    text: string;
  };
}

export interface AgentMetadata {
  toolCalls: number;
  subagentCalls: number;
  costUSD: number;
  durationMs: number;
  model: string;
}

export interface ResearchAgentConfig {
  /** Model to use for main agent. Defaults to 'opus' */
  model?: 'sonnet' | 'opus' | 'haiku';
  /** Maximum agentic turns before stopping. Defaults to 50 */
  maxTurns?: number;
  /** Session ID to resume a previous session */
  sessionId?: string;
  /** Maximum budget in USD. Defaults to no limit */
  maxBudgetUsd?: number;
  /** Enable web search capability */
  enableWebSearch?: boolean;
}

export interface PluginToolResult {
  summary: string;
  analysis: string;
  comments: PluginComment[];
  cost: number;
}

export interface PluginComment {
  header: string;
  description: string;
  severity: string;
  location?: {
    start: number;
    end: number;
    text: string;
  };
}
