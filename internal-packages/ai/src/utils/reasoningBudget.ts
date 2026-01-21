/**
 * Reasoning Budget Resolver
 *
 * Calculates optimal reasoning token budgets for OpenRouter models based on:
 * - Effort level (xhigh, high, medium, low, minimal)
 * - Provider-specific max_completion_tokens limits
 * - Dynamic output reserve to ensure sufficient tokens for tool call responses
 */

import type { ReasoningEffort } from './openrouter';
import { logger } from '../shared/logger';

// ============================================================================
// Types
// ============================================================================

export interface ModelEndpointData {
  tag: string;
  providerName: string;
  maxCompletionTokens: number | null;
}

export interface ReasoningBudgetResult {
  /** Reasoning configuration to pass to OpenRouter */
  reasoning: {
    effort?: ReasoningEffort;
    max_tokens?: number;
  };
  /** Effective max_tokens to use for the request */
  maxTokens: number;
  /** Display-friendly budget (e.g., "12K") for UI */
  displayBudget: string;
  /** Whether we're using explicit max_tokens (true) or falling back to effort (false) */
  usesExplicitBudget: boolean;
}

export interface ResolverOptions {
  /** Reasoning effort level */
  effort: ReasoningEffort;
  /** OpenRouter model ID */
  modelId: string;
  /** Optional list of selected provider tags (e.g., ["google-vertex", "together"]) */
  selectedProviders?: string[];
  /** Optional pre-fetched endpoints data (if not provided, will fetch) */
  endpointsData?: ModelEndpointData[];
}

// ============================================================================
// Constants
// ============================================================================

/** Effort level to percentage of available budget */
const EFFORT_PERCENTAGES: Record<ReasoningEffort, number> = {
  xhigh: 0.9,
  high: 0.7,
  medium: 0.5,
  low: 0.3,
  minimal: 0.1,
  none: 0,
};

/** Default max completion tokens when we can't determine from provider data */
const DEFAULT_MAX_COMPLETION_TOKENS = 8192;

/** Minimum output reserve (ensures enough tokens for tool call JSON responses) */
const MIN_OUTPUT_RESERVE = 1000;

/** Maximum output reserve (don't reserve too much for small models) */
const MAX_OUTPUT_RESERVE = 4000;

/** Output reserve as percentage of effective max tokens */
const OUTPUT_RESERVE_PERCENTAGE = 0.25;

/** Models that support reasoning.max_tokens (Anthropic-style explicit budget) */
const SUPPORTS_EXPLICIT_BUDGET = [
  'anthropic/',  // All Anthropic models
  'zhipu/',      // GLM models support explicit reasoning budget
  'deepseek/',   // DeepSeek reasoning models
];

/** Models that require reasoning.effort (OpenAI o-series style) */
const REQUIRES_EFFORT_ONLY = [
  'openai/o1',
  'openai/o3',
  'openai/o4',
];

// ============================================================================
// Cache
// ============================================================================

interface CachedEndpoints {
  data: ModelEndpointData[];
  timestamp: number;
}

const endpointsCache = new Map<string, CachedEndpoints>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Invalidate cache for a model (call this when truncation is detected)
 */
export function invalidateEndpointsCache(modelId: string): void {
  endpointsCache.delete(modelId);
  logger.debug(`[ReasoningBudget] Cache invalidated for ${modelId}`);
}

/**
 * Invalidate entire cache
 */
export function invalidateAllEndpointsCache(): void {
  endpointsCache.clear();
  logger.debug(`[ReasoningBudget] All cache invalidated`);
}

// ============================================================================
// Endpoint Fetching
// ============================================================================

/**
 * Fetch model endpoints from OpenRouter API
 */
async function fetchModelEndpoints(modelId: string): Promise<ModelEndpointData[]> {
  // Check cache
  const cached = endpointsCache.get(modelId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    // Note: Do NOT URL-encode the modelId - OpenRouter expects the literal path
    // e.g., /models/google/gemini-3-flash-preview/endpoints (not google%2Fgemini...)
    const response = await fetch(
      `https://openrouter.ai/api/v1/models/${modelId}/endpoints`
    );

    if (!response.ok) {
      logger.warn(`[ReasoningBudget] Failed to fetch endpoints for ${modelId}: ${response.status}`);
      return [];
    }

    const json = await response.json() as {
      data?: {
        endpoints?: Array<{
          tag?: string;
          provider_name?: string;
          max_completion_tokens?: number | null;
        }>;
      };
    };

    const endpoints = json.data?.endpoints || [];

    // Parse and deduplicate by base tag
    const seenTags = new Set<string>();
    const parsed: ModelEndpointData[] = [];

    for (const ep of endpoints) {
      // Extract base tag (remove region suffixes like "/global")
      const baseTag = ep.tag?.split('/')[0];
      if (!baseTag || seenTags.has(baseTag)) continue;
      seenTags.add(baseTag);

      parsed.push({
        tag: baseTag,
        providerName: ep.provider_name || baseTag,
        maxCompletionTokens: ep.max_completion_tokens ?? null,
      });
    }

    // Cache the result
    endpointsCache.set(modelId, { data: parsed, timestamp: Date.now() });

    return parsed;
  } catch (e) {
    logger.warn(`[ReasoningBudget] Error fetching endpoints for ${modelId}:`, e);
    return [];
  }
}

// ============================================================================
// Budget Calculation
// ============================================================================

/**
 * Calculate the effective max completion tokens based on selected providers
 */
function calculateEffectiveMax(
  endpoints: ModelEndpointData[],
  selectedProviders?: string[]
): number {
  let relevantEndpoints = endpoints;

  // Filter to selected providers if specified
  if (selectedProviders && selectedProviders.length > 0) {
    relevantEndpoints = endpoints.filter(ep =>
      selectedProviders.includes(ep.tag)
    );
  }

  // Get all non-null maxCompletionTokens values
  const maxValues = relevantEndpoints
    .map(ep => ep.maxCompletionTokens)
    .filter((v): v is number => v !== null && v > 0);

  // Return minimum of available values (conservative approach)
  // If all null, fall back to default
  if (maxValues.length === 0) {
    return DEFAULT_MAX_COMPLETION_TOKENS;
  }

  return Math.min(...maxValues);
}

/**
 * Calculate dynamic output reserve based on effective max
 * Reserve enough for tool call JSON responses, but scale with model capacity
 */
function calculateOutputReserve(effectiveMax: number): number {
  const percentageReserve = effectiveMax * OUTPUT_RESERVE_PERCENTAGE;
  return Math.max(MIN_OUTPUT_RESERVE, Math.min(MAX_OUTPUT_RESERVE, percentageReserve));
}

/**
 * Check if model supports explicit reasoning.max_tokens
 */
function supportsExplicitBudget(modelId: string): boolean {
  // Check if any prefix matches
  if (SUPPORTS_EXPLICIT_BUDGET.some(prefix => modelId.startsWith(prefix))) {
    return true;
  }

  // OpenAI o-series requires effort only
  if (REQUIRES_EFFORT_ONLY.some(prefix => modelId.startsWith(prefix))) {
    return false;
  }

  // Default: assume supports explicit budget for better control
  // Most modern reasoning models support it
  return true;
}

/**
 * Format budget for display (e.g., 12500 -> "12.5K")
 */
function formatDisplayBudget(tokens: number): string {
  if (tokens >= 1000) {
    const k = tokens / 1000;
    // Show one decimal if not a round number
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
  }
  return String(tokens);
}

// ============================================================================
// Main Resolver
// ============================================================================

/**
 * Resolve reasoning budget for an OpenRouter model
 *
 * @example
 * const budget = await resolveReasoningBudget({
 *   effort: 'xhigh',
 *   modelId: 'zhipu/glm-4.7',
 *   selectedProviders: ['zhipu']
 * });
 * // Returns: { reasoning: { max_tokens: 15000 }, maxTokens: 18000, displayBudget: "15K" }
 */
export async function resolveReasoningBudget(
  options: ResolverOptions
): Promise<ReasoningBudgetResult> {
  const { effort, modelId, selectedProviders, endpointsData } = options;

  // Handle 'none' effort - no reasoning needed
  if (effort === 'none') {
    return {
      reasoning: { effort: 'none' },
      maxTokens: DEFAULT_MAX_COMPLETION_TOKENS,
      displayBudget: '',
      usesExplicitBudget: false,
    };
  }

  // Get endpoints data (from cache, pre-fetched, or fetch now)
  const endpoints = endpointsData || await fetchModelEndpoints(modelId);

  // Calculate effective max tokens
  const effectiveMax = calculateEffectiveMax(endpoints, selectedProviders);

  // Calculate output reserve
  const outputReserve = calculateOutputReserve(effectiveMax);

  // Calculate available budget for reasoning
  const available = effectiveMax - outputReserve;

  // Calculate reasoning budget based on effort level
  const effortPercentage = EFFORT_PERCENTAGES[effort];
  const reasoningBudget = Math.floor(available * effortPercentage);

  // Check API compatibility
  const usesExplicit = supportsExplicitBudget(modelId);

  logger.debug(`[ReasoningBudget] ${modelId}: effectiveMax=${effectiveMax}, outputReserve=${outputReserve}, available=${available}, effort=${effort} (${effortPercentage * 100}%), reasoningBudget=${reasoningBudget}, usesExplicit=${usesExplicit}`);

  if (usesExplicit) {
    // Use explicit max_tokens for reasoning
    return {
      reasoning: { max_tokens: reasoningBudget },
      maxTokens: effectiveMax,
      displayBudget: formatDisplayBudget(reasoningBudget),
      usesExplicitBudget: true,
    };
  } else {
    // Fall back to effort-based (OpenAI o-series)
    return {
      reasoning: { effort },
      maxTokens: effectiveMax,
      displayBudget: `~${formatDisplayBudget(reasoningBudget)}`,
      usesExplicitBudget: false,
    };
  }
}

/**
 * Synchronous version for cases where endpoints are already available
 * (e.g., UI display where useModelEndpoints hook provides data)
 */
export function resolveReasoningBudgetSync(
  options: ResolverOptions & { endpointsData: ModelEndpointData[] }
): ReasoningBudgetResult {
  const { effort, modelId, selectedProviders, endpointsData } = options;

  // Handle 'none' effort
  if (effort === 'none') {
    return {
      reasoning: { effort: 'none' },
      maxTokens: DEFAULT_MAX_COMPLETION_TOKENS,
      displayBudget: '',
      usesExplicitBudget: false,
    };
  }

  // Calculate effective max tokens
  const effectiveMax = calculateEffectiveMax(endpointsData, selectedProviders);

  // Calculate output reserve
  const outputReserve = calculateOutputReserve(effectiveMax);

  // Calculate available budget for reasoning
  const available = effectiveMax - outputReserve;

  // Calculate reasoning budget based on effort level
  const effortPercentage = EFFORT_PERCENTAGES[effort];
  const reasoningBudget = Math.floor(available * effortPercentage);

  // Check API compatibility
  const usesExplicit = supportsExplicitBudget(modelId);

  if (usesExplicit) {
    return {
      reasoning: { max_tokens: reasoningBudget },
      maxTokens: effectiveMax,
      displayBudget: formatDisplayBudget(reasoningBudget),
      usesExplicitBudget: true,
    };
  } else {
    return {
      reasoning: { effort },
      maxTokens: effectiveMax,
      displayBudget: `~${formatDisplayBudget(reasoningBudget)}`,
      usesExplicitBudget: false,
    };
  }
}

/**
 * Get display-friendly description of reasoning budget
 * For use in UI to show users what they're getting
 */
export function getReasoningBudgetDescription(
  effort: ReasoningEffort,
  displayBudget: string
): string {
  if (effort === 'none' || !displayBudget) {
    return 'Reasoning disabled';
  }

  const effortLabels: Record<ReasoningEffort, string> = {
    xhigh: 'Very High',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    minimal: 'Minimal',
    none: 'None',
  };

  return `${effortLabels[effort]} → ${displayBudget} reasoning tokens`;
}
