/**
 * Core types for the jobs package
 */

import type { Agent } from '@roast/ai';

export interface Document {
  id: string;
  slug: string;
  title: string;
  content: string;
  author: string;
  publishedDate: string;
  url: string;
  platforms: string[];
  reviews: any[];
  intendedAgents: string[];
}

export interface TaskResult {
  name: string;
  modelName: string;
  priceInDollars: number;
  timeInSeconds: number;
  log: string;
}

export interface AnalysisResult {
  thinking: string;
  analysis: string;
  summary: string;
  grade?: number;
  selfCritique?: string;
  highlights: any[];
  tasks: TaskResult[];
  jobLogString?: string;
}

export interface WorkflowContext {
  document: Document;
  agent: Agent;
  targetWordCount?: number;
  targetHighlights?: number;
  jobId?: string;
}

/**
 * Workflow function signature
 */
export type WorkflowFunction = (context: WorkflowContext) => Promise<AnalysisResult>;

/**
 * Registry for different analysis workflows
 */
export interface WorkflowRegistry {
  analyzeDocument: WorkflowFunction;
  // Future workflows can be added here
  analyzeLinkDocument?: WorkflowFunction;
  analyzeSpellingGrammar?: WorkflowFunction;
  analyzeMultiEpistemic?: WorkflowFunction;
}

/**
 * Logger interface for dependency injection
 */
export interface Logger {
  info(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

/**
 * Job processing result
 */
export interface JobProcessingResult {
  success: boolean;
  job: any; // JobEntity from @roast/db
  logFilename?: string;
  logContent?: string;
  error?: Error;
}

/**
 * Completion data for successful jobs
 */
export interface CompletionData {
  llmThinking: string | null;
  durationInSeconds: number;
  logs: string;
}