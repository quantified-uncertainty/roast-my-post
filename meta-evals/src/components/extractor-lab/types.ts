/**
 * Types for Extractor Lab component
 */

import type { DocumentChoice } from "@roast/db";
import type {
  ExtractorConfig,
  MultiExtractorResult,
} from "@roast/ai/fallacy-extraction/lab";
import type {
  FallacyJudgeOutput,
  JudgeDecision,
  JudgeConfig,
} from "@roast/ai/fallacy-judge/types";

export type { DocumentChoice, ExtractorConfig, MultiExtractorResult, FallacyJudgeOutput, JudgeDecision, JudgeConfig };

/** Props for the main ExtractorLab component */
export interface ExtractorLabProps {
  height: number;
  maxItems: number;
  documents: DocumentChoice[];
  onSearchDocuments: (filter: string) => void;
  onBack: () => void;
}

/** Result from a single judge run with its config */
export interface JudgeRunResult {
  config: JudgeConfig;
  label: string;
  result: FallacyJudgeOutput;
  durationMs: number;
  error?: string;
}

/** Issue with extractor source info for pre-judge dedup */
export interface ExtractorIssue {
  extractorId: string;
  exactText: string;
  issueType: string;
  fallacyType?: string;
  severityScore: number;
  confidenceScore: number;
  importanceScore: number;
  reasoning: string;
}

/** Result from pre-judge deduplication */
export interface PreJudgeDedupResult {
  /** Unique issues to send to judge */
  unique: ExtractorIssue[];
  /** Duplicate issues removed */
  duplicates: ExtractorIssue[];
  /** Original total count */
  originalCount: number;
}

/** Dedup strategy identifier */
export type DedupStrategy = "exact" | "jaccard" | "fuse" | "ufuzzy";

/** A duplicate issue with info about what it matched */
export interface DuplicateMatch {
  duplicate: ExtractorIssue;
  matchedTo: ExtractorIssue;
  similarity: number;  // 0-1 similarity score
}

/** Result from a single dedup strategy */
export interface DedupComparison {
  strategy: DedupStrategy;
  unique: ExtractorIssue[];
  duplicates: DuplicateMatch[];
  originalCount: number;
}

/** Results from all dedup strategies for comparison */
export interface MultiStrategyDedupResult {
  exact: DedupComparison;
  jaccard: DedupComparison;
  fuse: DedupComparison;
  ufuzzy: DedupComparison;
}

/** All possible steps/views in the Extractor Lab */
export type LabStep =
  | { type: "select-document" }
  | { type: "configure-extractors" }
  | { type: "add-extractor" }
  | { type: "running" }
  | { type: "results"; result: MultiExtractorResult }
  | { type: "issue-detail"; result: MultiExtractorResult; extractorIdx: number; issueIdx: number }
  | { type: "pre-judge-dedup"; result: MultiExtractorResult; multiDedup: MultiStrategyDedupResult; selectedStrategy: DedupStrategy }
  | { type: "running-judge"; result: MultiExtractorResult; dedupResult: PreJudgeDedupResult; judgeConfigs: JudgeConfig[] }
  | { type: "judge-comparison"; result: MultiExtractorResult; judgeResults: JudgeRunResult[] }
  | { type: "judge-results"; result: MultiExtractorResult; judgeResult: FallacyJudgeOutput; judgeLabel: string; judgeResults?: JudgeRunResult[] }
  | { type: "judge-decision-detail"; result: MultiExtractorResult; judgeResult: FallacyJudgeOutput; decision: JudgeDecision; isRejected: boolean; judgeLabel: string; judgeResults?: JudgeRunResult[] };

/** Logger interface for judge tool */
export interface SimpleLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}
