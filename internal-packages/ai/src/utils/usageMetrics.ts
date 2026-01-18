/**
 * Unified Usage Metrics
 *
 * Provides a consistent format for capturing usage data from both
 * OpenRouter and Anthropic APIs, including cost calculation.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Unified usage metrics that work across all providers
 */
export interface UnifiedUsageMetrics {
  // Core token counts
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;

  // Cost
  costUsd: number;
  isCostFromApi: boolean;  // true = from API (OpenRouter), false = calculated (Anthropic)

  // Cache metrics
  cacheReadTokens?: number;
  cacheWriteTokens?: number;

  // Reasoning/thinking tokens (subset of outputTokens)
  reasoningTokens?: number;

  // Provider info
  provider: string;
  model: string;

  // Latency
  latencyMs: number;
}

/**
 * Raw usage data from OpenRouter API response
 */
export interface OpenRouterRawUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost?: number;
  is_byok?: boolean;
  prompt_tokens_details?: {
    cached_tokens?: number;
    audio_tokens?: number;
    video_tokens?: number;
  };
  cost_details?: {
    upstream_inference_cost?: number | null;
    upstream_inference_prompt_cost?: number;
    upstream_inference_completions_cost?: number;
  };
  completion_tokens_details?: {
    reasoning_tokens?: number;
    image_tokens?: number;
  };
}

/**
 * Raw usage data from Anthropic API response
 */
export interface AnthropicRawUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation?: {
    ephemeral_5m_input_tokens?: number;
    ephemeral_1h_input_tokens?: number;
  };
  service_tier?: string;
}

// =============================================================================
// Anthropic Pricing (per million tokens, in USD)
// =============================================================================

interface ModelPricing {
  input: number;      // $ per million input tokens
  output: number;     // $ per million output tokens
  cacheRead: number;  // $ per million cache read tokens
  cacheWrite5m?: number;  // $ per million 5-minute cache write tokens
  cacheWrite1h?: number;  // $ per million 1-hour cache write tokens
}

/**
 * Anthropic model pricing table
 * Source: https://platform.claude.com/docs/en/about-claude/pricing
 * Last updated: 2025-01-18
 */
export const ANTHROPIC_PRICING: Record<string, ModelPricing> = {
  // Opus models
  'claude-opus-4-5-20251101': { input: 5, output: 25, cacheRead: 0.50, cacheWrite5m: 6.25, cacheWrite1h: 10 },
  'claude-opus-4-1-20250805': { input: 15, output: 75, cacheRead: 1.50, cacheWrite5m: 18.75, cacheWrite1h: 30 },
  'claude-opus-4-20250514': { input: 15, output: 75, cacheRead: 1.50, cacheWrite5m: 18.75, cacheWrite1h: 30 },

  // Sonnet models
  'claude-sonnet-4-5-20250929': { input: 3, output: 15, cacheRead: 0.30, cacheWrite5m: 3.75, cacheWrite1h: 6 },
  'claude-sonnet-4-20250514': { input: 3, output: 15, cacheRead: 0.30, cacheWrite5m: 3.75, cacheWrite1h: 6 },
  'claude-3-7-sonnet-20250219': { input: 3, output: 15, cacheRead: 0.30, cacheWrite5m: 3.75, cacheWrite1h: 6 },

  // Haiku models
  'claude-haiku-4-5-20251001': { input: 1, output: 5, cacheRead: 0.10, cacheWrite5m: 1.25, cacheWrite1h: 2 },
  'claude-3-5-haiku-20241022': { input: 0.80, output: 4, cacheRead: 0.08, cacheWrite5m: 1, cacheWrite1h: 1.6 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25, cacheRead: 0.03, cacheWrite5m: 0.30, cacheWrite1h: 0.50 },
};

// Aliases for common model name patterns
const MODEL_ALIASES: Record<string, string> = {
  // Short names to full model IDs
  'claude-opus-4-5': 'claude-opus-4-5-20251101',
  'claude-opus-4-1': 'claude-opus-4-1-20250805',
  'claude-opus-4': 'claude-opus-4-20250514',
  'claude-sonnet-4-5': 'claude-sonnet-4-5-20250929',
  'claude-sonnet-4': 'claude-sonnet-4-20250514',
  'claude-sonnet-3-7': 'claude-3-7-sonnet-20250219',
  'claude-haiku-4-5': 'claude-haiku-4-5-20251001',
  'claude-3-5-haiku': 'claude-3-5-haiku-20241022',
  'claude-3-haiku': 'claude-3-haiku-20240307',
};

/**
 * Get pricing for an Anthropic model
 */
export function getAnthropicPricing(modelId: string): ModelPricing | null {
  // Try direct lookup first
  if (ANTHROPIC_PRICING[modelId]) {
    return ANTHROPIC_PRICING[modelId];
  }

  // Try alias lookup
  const aliasedId = MODEL_ALIASES[modelId];
  if (aliasedId && ANTHROPIC_PRICING[aliasedId]) {
    return ANTHROPIC_PRICING[aliasedId];
  }

  // Try to match by prefix (e.g., "claude-sonnet-4-5" matches "claude-sonnet-4-5-20250929")
  for (const [key, pricing] of Object.entries(ANTHROPIC_PRICING)) {
    if (modelId.startsWith(key.split('-202')[0]) || key.startsWith(modelId)) {
      return pricing;
    }
  }

  return null;
}

/**
 * Calculate cost for Anthropic API usage
 */
export function calculateAnthropicCost(
  modelId: string,
  usage: AnthropicRawUsage
): number {
  const pricing = getAnthropicPricing(modelId);
  if (!pricing) {
    console.warn(`[UsageMetrics] No pricing found for Anthropic model: ${modelId}`);
    return 0;
  }

  const inputCost = (usage.input_tokens / 1_000_000) * pricing.input;
  const outputCost = (usage.output_tokens / 1_000_000) * pricing.output;
  const cacheReadCost = ((usage.cache_read_input_tokens || 0) / 1_000_000) * pricing.cacheRead;

  // Cache write cost (assume 5-minute cache by default)
  const cacheWriteCost = pricing.cacheWrite5m
    ? ((usage.cache_creation_input_tokens || 0) / 1_000_000) * pricing.cacheWrite5m
    : 0;

  return inputCost + outputCost + cacheReadCost + cacheWriteCost;
}

// =============================================================================
// Conversion Functions
// =============================================================================

/**
 * Convert OpenRouter raw usage to unified metrics
 */
export function fromOpenRouterUsage(
  usage: OpenRouterRawUsage,
  provider: string,
  model: string,
  latencyMs: number
): UnifiedUsageMetrics {
  return {
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    costUsd: usage.cost ?? 0,
    isCostFromApi: usage.cost !== undefined,
    cacheReadTokens: usage.prompt_tokens_details?.cached_tokens,
    reasoningTokens: usage.completion_tokens_details?.reasoning_tokens,
    provider,
    model,
    latencyMs,
  };
}

/**
 * Convert Anthropic raw usage to unified metrics
 */
export function fromAnthropicUsage(
  usage: AnthropicRawUsage,
  model: string,
  latencyMs: number
): UnifiedUsageMetrics {
  const totalTokens = usage.input_tokens + usage.output_tokens;
  const costUsd = calculateAnthropicCost(model, usage);

  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    totalTokens,
    costUsd,
    isCostFromApi: false, // Anthropic doesn't return cost in API
    cacheReadTokens: usage.cache_read_input_tokens,
    cacheWriteTokens: usage.cache_creation_input_tokens,
    provider: 'anthropic',
    model,
    latencyMs,
  };
}

/**
 * Format cost for display (e.g., "$0.0023" or "$1.50")
 */
export function formatCost(costUsd: number): string {
  if (costUsd === 0) return '$0.00';
  if (costUsd < 0.01) {
    return `$${costUsd.toFixed(6)}`;
  }
  return `$${costUsd.toFixed(4)}`;
}

/**
 * Aggregate multiple usage metrics into a single summary
 */
export function aggregateUsageMetrics(metrics: UnifiedUsageMetrics[]): Omit<UnifiedUsageMetrics, 'provider' | 'model'> & { providers: string[], models: string[] } {
  const providers = [...new Set(metrics.map(m => m.provider))];
  const models = [...new Set(metrics.map(m => m.model))];

  return {
    inputTokens: metrics.reduce((sum, m) => sum + m.inputTokens, 0),
    outputTokens: metrics.reduce((sum, m) => sum + m.outputTokens, 0),
    totalTokens: metrics.reduce((sum, m) => sum + m.totalTokens, 0),
    costUsd: metrics.reduce((sum, m) => sum + m.costUsd, 0),
    isCostFromApi: metrics.every(m => m.isCostFromApi),
    cacheReadTokens: metrics.reduce((sum, m) => sum + (m.cacheReadTokens || 0), 0) || undefined,
    cacheWriteTokens: metrics.reduce((sum, m) => sum + (m.cacheWriteTokens || 0), 0) || undefined,
    reasoningTokens: metrics.reduce((sum, m) => sum + (m.reasoningTokens || 0), 0) || undefined,
    latencyMs: metrics.reduce((sum, m) => sum + m.latencyMs, 0),
    providers,
    models,
  };
}
