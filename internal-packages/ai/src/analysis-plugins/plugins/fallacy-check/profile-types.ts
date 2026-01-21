/**
 * Fallacy Checker Profile Configuration Types
 *
 * These types define the configuration structure stored in the database
 * for fallacy checker profiles. Profiles allow customizing the pipeline
 * parameters: models, thresholds, and prompts.
 */

import type { ExtractorConfig, JudgeConfig, ProviderPreferences } from './extraction/types';

// ============================================================================
// Model Configuration Types
// ============================================================================

/**
 * Model configuration for all pipeline stages
 */
export interface ModelConfig {
  /**
   * Extractors configuration.
   * Supports multiple extractors with different models for ensemble extraction.
   */
  extractors: ExtractorConfig[];

  /**
   * Judge configuration for aggregating multi-extractor results.
   * Only used when multiple extractors are configured.
   */
  judge: JudgeConfig;
}

// ============================================================================
// Threshold Configuration Types
// ============================================================================

/**
 * Threshold and limit configuration for the pipeline
 */
export interface ThresholdConfig {
  /**
   * Minimum severity score (0-100) for issues to be kept by extractor.
   * Default: 60 (from MIN_SEVERITY_THRESHOLD in fallacy-extractor)
   */
  minSeverityThreshold: number;

  /**
   * Maximum number of issues returned by extractor.
   * Default: 15 (from MAX_ISSUES in fallacy-extractor)
   */
  maxIssues: number;

  /**
   * Jaccard similarity threshold for deduplication (0-1).
   * Higher = stricter matching (fewer duplicates detected).
   * Default: 0.7 (from JACCARD_THRESHOLD in dedup.ts)
   */
  dedupThreshold: number;

  /**
   * Maximum issues to process through the full pipeline.
   * Default: 25 (from LIMITS.MAX_ISSUES_TO_PROCESS in constants.ts)
   */
  maxIssuesToProcess: number;
}

// ============================================================================
// Prompt Configuration Types
// ============================================================================

/**
 * Prompts used in the pipeline.
 * All prompts are optional - if not provided, defaults from the tools are used.
 */
export interface PromptConfig {
  /**
   * System prompt for the fallacy extractor.
   * This is the main instruction prompt that defines how issues are detected.
   */
  extractorSystemPrompt?: string;

  /**
   * User prompt template for the fallacy extractor.
   * Use {{text}} as placeholder for the document text.
   */
  extractorUserPrompt?: string;

  /**
   * System prompt for the LLM judge (multi-extractor aggregation).
   */
  judgeSystemPrompt?: string;

  /**
   * System prompt for the review/filter stage.
   */
  reviewSystemPrompt?: string;
}

// ============================================================================
// Filter Chain Configuration Types
// ============================================================================

/**
 * Available filter types
 */
export type FilterType =
  | 'dedup'                   // Remove near-duplicate issues
  | 'principle-of-charity'    // Apply charitable interpretation before critiquing
  | 'supported-elsewhere'     // Filter issues addressed elsewhere in document
  | 'severity'                // Filter by severity threshold
  | 'confidence'              // Filter by confidence threshold
  | 'review';                 // Human review / AI review filter

/**
 * Reasoning effort levels (maps to thinking budget_tokens)
 */
export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

/**
 * Reasoning configuration for filters that support extended thinking
 */
export type ReasoningConfig =
  | false                           // Off
  | { effort: ReasoningEffort }     // Effort level
  | { budget_tokens: number };      // Custom token budget

/**
 * Base filter configuration
 */
interface BaseFilterConfig {
  id: string;
  type: FilterType;
  enabled: boolean;
}

/**
 * Principle of Charity filter configuration
 */
export interface PrincipleOfCharityFilterConfig extends BaseFilterConfig {
  type: 'principle-of-charity';
  model?: string;
  temperature?: number | 'default';
  reasoning?: ReasoningConfig;
  /** Provider routing preferences (OpenRouter only) */
  provider?: ProviderPreferences;
  customPrompt?: string;
}

/**
 * Supported-elsewhere filter configuration
 */
export interface SupportedElsewhereFilterConfig extends BaseFilterConfig {
  type: 'supported-elsewhere';
  model?: string;
  temperature?: number | 'default';
  reasoning?: ReasoningConfig;
  /** Provider routing preferences (OpenRouter only) */
  provider?: ProviderPreferences;
  customPrompt?: string;
}

/**
 * Severity filter configuration
 */
export interface SeverityFilterConfig extends BaseFilterConfig {
  type: 'severity';
  minSeverity: number;  // 0-100
}

/**
 * Confidence filter configuration
 */
export interface ConfidenceFilterConfig extends BaseFilterConfig {
  type: 'confidence';
  minConfidence: number;  // 0-100
}

/**
 * Simple filter configuration (for dedup, review which don't need extra settings)
 */
export interface SimpleFilterConfig extends BaseFilterConfig {
  type: 'dedup' | 'review';
}

/**
 * Union of all filter configurations
 */
export type FilterChainItem =
  | PrincipleOfCharityFilterConfig
  | SupportedElsewhereFilterConfig
  | SeverityFilterConfig
  | ConfidenceFilterConfig
  | SimpleFilterConfig;

/**
 * Filter chain configuration - array of filter items
 */
export type FilterChainConfig = FilterChainItem[];

// Helper to migrate old format to new
export function migrateFilterChainConfig(
  config: unknown
): FilterChainConfig {
  // Already an array - return as-is
  if (Array.isArray(config)) {
    return config as FilterChainConfig;
  }

  // Old format: { filters: Array<{ type, enabled }> }
  const oldFormat = config as { filters?: Array<{ type: FilterType; enabled: boolean }> } | undefined;
  if (oldFormat?.filters && Array.isArray(oldFormat.filters)) {
    return oldFormat.filters.map((f, i) => ({
      id: `filter-${i}`,
      type: f.type,
      enabled: f.enabled,
    } as FilterChainItem));
  }

  // Fallback to default
  return DEFAULT_FILTER_CHAIN;
}

// ============================================================================
// Main Profile Configuration Type
// ============================================================================

/**
 * Complete profile configuration for the fallacy checker pipeline.
 * This is the structure stored in the database's config JSON field.
 */
export interface FallacyCheckerProfileConfig {
  /**
   * Schema version for forward compatibility.
   */
  version: 1;

  /**
   * Model configurations for each pipeline stage.
   */
  models: ModelConfig;

  /**
   * Threshold and limit configurations.
   */
  thresholds: ThresholdConfig;

  /**
   * Custom prompts (optional - defaults used if not provided).
   */
  prompts?: PromptConfig;

  /**
   * Filter chain configuration.
   */
  filterChain: FilterChainConfig;
}

// ============================================================================
// Profile Database Type
// ============================================================================

/**
 * Profile as stored in the database (matches Prisma schema).
 */
export interface FallacyCheckerProfile {
  id: string;
  name: string;
  description: string | null;
  agentId: string;
  config: FallacyCheckerProfileConfig;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default extractor model
 */
export const DEFAULT_EXTRACTOR_MODEL = 'claude-sonnet-4-5-20250929';

/**
 * Default judge model
 */
export const DEFAULT_JUDGE_MODEL = 'claude-sonnet-4-5-20250929';

/**
 * Default threshold configuration (matches existing hardcoded values)
 */
export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  minSeverityThreshold: 60,  // From fallacy-extractor MIN_SEVERITY_THRESHOLD
  maxIssues: 15,             // From fallacy-extractor MAX_ISSUES
  dedupThreshold: 0.7,       // From dedup.ts JACCARD_THRESHOLD
  maxIssuesToProcess: 25,    // From constants.ts LIMITS.MAX_ISSUES_TO_PROCESS
};

/**
 * Default filter chain (current behavior)
 * Order: dedup → principle-of-charity → supported-elsewhere → review
 */
export const DEFAULT_FILTER_CHAIN: FilterChainConfig = [
  { id: 'default-dedup', type: 'dedup', enabled: true },
  { id: 'default-principle-of-charity', type: 'principle-of-charity', enabled: true },
  { id: 'default-supported-elsewhere', type: 'supported-elsewhere', enabled: true },
  { id: 'default-review', type: 'review', enabled: true },
];

/**
 * Create a default profile configuration
 */
export function createDefaultProfileConfig(): FallacyCheckerProfileConfig {
  return {
    version: 1,
    models: {
      extractors: [{ model: DEFAULT_EXTRACTOR_MODEL }],
      judge: {
        model: DEFAULT_JUDGE_MODEL,
        enabled: false,
      },
    },
    thresholds: DEFAULT_THRESHOLDS,
    prompts: undefined,  // Use tool defaults
    filterChain: DEFAULT_FILTER_CHAIN,
  };
}
