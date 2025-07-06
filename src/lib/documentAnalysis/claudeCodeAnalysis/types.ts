import type { SDKMessage } from "@anthropic-ai/claude-code";
import type { Comment } from "../../../types/documentSchema";

export interface ClaudeCodeAnalysisResult {
  analysis: string;
  summary: string;
  grade?: number;
  comments: Comment[];
  conversation: SDKMessage[];
  totalCost: number;
  turnCount: number;
  budgetUsed: number;
  abortReason?: "budget" | "max_turns" | "completion";
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface Turn {
  cost: number;
  usage: TokenUsage;
  timestamp: Date;
}

export interface ClaudeCodeOptions {
  budget?: number;
  maxTurns?: number;
  verbose?: boolean;
  temperature?: number;
}