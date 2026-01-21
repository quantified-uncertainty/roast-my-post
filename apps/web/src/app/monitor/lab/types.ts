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

export interface EvaluationVersionSummary {
  id: string;
  createdAt: string;
  grade: number | null;
  summary: string | null;
  version: number;
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
  stage: string; // Filter stage name (e.g., "principle-of-charity-filter", "supported-elsewhere-filter", "review")
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

/** Actual API parameters sent to the provider */
export interface ActualApiParams {
  model: string;
  temperature: number;
  maxTokens: number;
  thinking?: {
    type: "enabled";
    budget_tokens: number;
  };
  reasoning?: {
    effort?: "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
    max_tokens?: number;
  };
}

/** Response metrics from API call */
export interface ApiResponseMetrics {
  success: boolean;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  stopReason?: string;
  errorType?: string;
  errorMessage?: string;
}

export interface ExtractorInfo {
  extractorId: string;
  model: string;
  issuesFound: number;
  durationMs?: number;
  costUsd?: number;
  /** Temperature that was configured (number or "default") */
  temperatureConfig?: number | "default";
  /** Whether thinking/reasoning was enabled */
  thinkingEnabled?: boolean;
  /** Error message if extraction failed */
  error?: string;
  /** Actual parameters sent to the API */
  actualApiParams?: ActualApiParams;
  /** Response metrics from the API */
  responseMetrics?: ApiResponseMetrics;
  /** Issues breakdown by type */
  issuesByType?: Record<string, number>;
}

export interface ExtractionPhase {
  totalIssuesBeforeJudge: number;
  totalIssuesAfterDedup?: number;
  totalIssuesAfterJudge: number;
  extractors?: ExtractorInfo[];
  judgeDurationMs?: number;
  judgeCostUsd?: number;
  judgeModel?: string;
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

// Profile types
export type FilterType = "dedup" | "principle-of-charity" | "supported-elsewhere" | "severity" | "confidence" | "review";

/** Reasoning effort levels (maps to OpenRouter's effort parameter) */
export type ReasoningEffort = "minimal" | "low" | "medium" | "high" | "xhigh";

/** Reasoning configuration - either off, effort level, or custom token budget */
export type ReasoningConfig =
  | false                           // Off
  | { effort: ReasoningEffort }     // Effort level (minimal, low, medium, high, xhigh)
  | { budget_tokens: number };      // Custom token budget (min 1024)

/** Maps effort levels to Anthropic budget_tokens values */
export const EFFORT_TO_BUDGET_TOKENS: Record<ReasoningEffort, number> = {
  minimal: 1024,    // Minimum allowed
  low: 2048,
  medium: 8192,
  high: 16384,
  xhigh: 32768,
};

/** Provider routing preferences for OpenRouter */
export interface ProviderPreferences {
  /** Ordered list of preferred providers (e.g., ["anthropic", "google"]) */
  order?: string[];
  /** Allow fallback to other providers if preferred ones fail */
  allow_fallbacks?: boolean;
}

export interface ExtractorConfig {
  model: string;
  temperature?: number | "default";
  label?: string;
  /** @deprecated Use reasoning instead */
  thinking?: boolean;
  /** Reasoning/thinking configuration */
  reasoning?: ReasoningConfig;
  /** Provider routing preferences (OpenRouter only) */
  provider?: ProviderPreferences;
}

export interface JudgeConfig {
  model: string;
  temperature?: number | "default";
  /** @deprecated Use reasoning instead */
  thinking?: boolean;
  /** Reasoning/thinking configuration */
  reasoning?: ReasoningConfig;
  enabled: boolean;
}

/** Base filter configuration - all filters have these */
interface BaseFilterConfig {
  id: string;  // Unique ID for this filter instance
  enabled: boolean;
}

/** Supported-elsewhere filter: LLM checks if issues are explained elsewhere in document */
export interface SupportedElsewhereFilterConfig extends BaseFilterConfig {
  type: "supported-elsewhere";
  model: string;
  temperature?: number | "default";
  /** Reasoning/thinking configuration */
  reasoning?: ReasoningConfig;
  customPrompt?: string;
}

/** Principle of Charity filter: LLM interprets arguments charitably before critiquing */
export interface PrincipleOfCharityFilterConfig extends BaseFilterConfig {
  type: "principle-of-charity";
  model: string;
  temperature?: number | "default";
  /** Reasoning/thinking configuration */
  reasoning?: ReasoningConfig;
  customPrompt?: string;
}

/** Severity threshold filter: removes issues below a severity score */
export interface SeverityFilterConfig extends BaseFilterConfig {
  type: "severity";
  minSeverity: number;  // 0-100
}

/** Confidence threshold filter: removes issues below a confidence score */
export interface ConfidenceFilterConfig extends BaseFilterConfig {
  type: "confidence";
  minConfidence: number;  // 0-100
}

/** Union of all filter configs */
export type FilterChainItem =
  | SupportedElsewhereFilterConfig
  | PrincipleOfCharityFilterConfig
  | SeverityFilterConfig
  | ConfidenceFilterConfig;

/** Available filter types for the "Add Filter" dropdown */
export const AVAILABLE_FILTER_TYPES = [
  {
    type: "principle-of-charity" as const,
    label: "Principle of Charity",
    description: "Interprets arguments charitably before critiquing - filters issues that dissolve under generous interpretation"
  },
  {
    type: "supported-elsewhere" as const,
    label: "Supported Elsewhere",
    description: "LLM checks if issues are explained/supported elsewhere in the document"
  },
  // Note: Severity filtering happens during extraction (minSeverityThreshold)
  // Note: Confidence filtering is not yet implemented
] as const;

export interface PromptConfig {
  extractorSystemPrompt?: string;
  extractorUserPrompt?: string;
  judgeSystemPrompt?: string;
  filterSystemPrompt?: string;
  reviewSystemPrompt?: string;
}

export interface ThresholdConfig {
  minSeverityThreshold: number;
  maxIssues: number;
  dedupThreshold: number;
  maxIssuesToProcess: number;
}

export interface ProfileConfig {
  version: 1;
  models: {
    extractors: ExtractorConfig[];
    judge: JudgeConfig;
  };
  thresholds: ThresholdConfig;
  prompts?: PromptConfig;
  /** Ordered list of filters to apply. Filters run in sequence. */
  filterChain: FilterChainItem[];
}

export interface Profile {
  id: string;
  name: string;
  description: string | null;
  agentId: string;
  config: ProfileConfig;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
