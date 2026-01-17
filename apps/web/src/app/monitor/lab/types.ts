// Types for the Lab (Validation) feature

export interface Baseline {
  id: string;
  name: string;
  description: string | null;
  commitHash: string | null;
  createdAt: string;
  snapshotCount: number;
}

export interface CorpusDocument {
  documentId: string;
  title: string;
  contentLength: number;
  lastEvaluatedAt: string | null;
  evaluationCount: number;
}

export interface ValidationRun {
  id: string;
  name: string | null;
  commitHash: string | null;
  status: "running" | "completed" | "failed";
  summary: string | null;
  createdAt: string;
  completedAt: string | null;
  snapshotCount: number;
  unchangedCount: number;
  changedCount: number;
}

export interface RunSnapshot {
  id: string;
  status: "unchanged" | "changed";
  keptCount: number;
  newCount: number;
  lostCount: number;
  documentId: string;
  documentTitle: string;
  comparisonData: ComparisonData | null;
}

export interface ComparisonData {
  matchedComments: CommentMatch[];
  newComments: Comment[];
  lostComments: Comment[];
  filteredItems?: FilteredItem[];
  pipelineCounts?: PipelineCounts;
  extractionPhase?: ExtractionPhase;
  stages?: StageMetrics[];
  totalDurationMs?: number;
}

export interface CommentMatch {
  baselineComment: Comment;
  currentComment: Comment;
  matchConfidence: number;
  status: string;
}

export interface Comment {
  id: string;
  quotedText: string;
  header: string | null;
  description: string;
  importance: number | null;
}

export interface FilteredItem {
  stage: "supported-elsewhere-filter" | "review";
  filterReason: string;
  quotedText: string;
  header?: string;
  originalIndex?: number;
  supportLocation?: string;
}

export interface PipelineCounts {
  issuesAfterDedup: number;
  issuesAfterFiltering: number;
  commentsGenerated: number;
  commentsKept: number;
}

export interface ExtractorInfo {
  extractorId: string;
  model: string;
  issuesFound: number;
  durationMs?: number;
  costUsd?: number;
}

export interface ExtractionPhase {
  totalIssuesBeforeJudge: number;
  totalIssuesAfterJudge: number;
  extractors?: ExtractorInfo[];
  judgeDurationMs?: number;
}

export interface StageMetrics {
  stageName: string;
  durationMs: number;
  inputCount: number;
  outputCount: number;
  model?: string;
  costUsd?: number;
}

export interface ValidationRunDetail {
  id: string;
  name: string | null;
  commitHash: string | null;
  status: string;
  summary: string | null;
  createdAt: string;
  completedAt: string | null;
  baseline: { id: string; name: string };
  snapshots: RunSnapshot[];
}

export type TabId = "baselines" | "run" | "history";
