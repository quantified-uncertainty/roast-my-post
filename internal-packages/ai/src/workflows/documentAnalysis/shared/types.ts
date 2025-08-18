// Shared types used across documentAnalysis modules  
import type { Comment } from "../../../types/commentSchema";

export interface TaskResult {
  name: string;
  modelName: string;
  priceInDollars: number;
  timeInSeconds: number;
  log: string;
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