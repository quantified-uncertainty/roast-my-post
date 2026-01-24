// Shared types used across documentAnalysis modules
import type { Comment } from "../../../shared/types";

export interface TaskResult {
  name: string;
  modelName: string;
  priceInDollars: number;
  timeInSeconds: number;
  log: string;
}

/**
 * Complete result from document analysis workflow.
 * Returned by analyzeDocument() function.
 */
export interface DocumentAnalysisResult {
  thinking: string;
  analysis: string;
  summary: string;
  grade?: number;
  selfCritique?: string;
  highlights: Comment[];
  tasks: TaskResult[];
  jobLogString?: string;
  pipelineTelemetry?: Record<string, unknown>;
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