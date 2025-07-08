// Shared types used across documentAnalysis modules
import type { Comment } from "../../../types/documentSchema";
import type { LLMInteraction } from "../../../types/llm";

export interface TaskResult {
  name: string;
  modelName: string;
  priceInCents: number;
  timeInSeconds: number;
  log: string;
  llmInteractions: LLMInteraction[];
}

export interface ThinkingOutputs {
  thinking: string;
}

export interface AnalysisOutputs {
  analysis: string;
  summary: string;
  grade?: number;
}

export interface ThinkingAnalysisOutputs {
  thinking: string;
  analysis: string;
  summary: string;
  grade?: number;
}

export interface HighlightAnalysisOutputs {
  highlights: Comment[];
}