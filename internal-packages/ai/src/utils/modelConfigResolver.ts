/**
 * Model Configuration Resolver
 *
 * Unified utility for resolving model configurations from profile definitions.
 * Used by extractors, judges, filters - any LLM workflow that needs to call an API.
 *
 * This ensures consistent handling of:
 * - Temperature (number, "default", or undefined)
 * - Reasoning/thinking (effort levels or explicit budget)
 * - Provider preferences (OpenRouter routing)
 */

import type { ReasoningEffort, ProviderPreferences } from './openrouter';

// ============================================================================
// Types
// ============================================================================

/** Reasoning configuration from profile (simplified version for profiles) */
export type ProfileReasoningConfig =
  | false                           // Off
  | { effort: ReasoningEffort }     // Effort level
  | { budget_tokens: number };      // Custom token budget

/** Input: Model config from profile (extractors, judge, filters all use this shape) */
export interface ProfileModelConfig {
  model: string;
  temperature?: number | 'default';
  /** @deprecated Use reasoning instead */
  thinking?: boolean;
  /** Reasoning/thinking configuration */
  reasoning?: ProfileReasoningConfig;
  /** Provider routing preferences (OpenRouter only) */
  provider?: ProviderPreferences;
}

// Re-export for convenience
export type { ReasoningEffort, ProviderPreferences } from './openrouter';

/** Output: Resolved params ready for API calls */
export interface ResolvedModelConfig {
  /** Model ID */
  model: string;

  /** Whether this is an OpenRouter model (contains '/') */
  isOpenRouter: boolean;

  /** Temperature to pass to API (undefined = let model use default) */
  temperature: number | undefined;

  /** Whether thinking/reasoning is enabled */
  thinkingEnabled: boolean;

  /** For OpenRouter: reasoning effort level */
  reasoningEffort: ReasoningEffort | undefined;

  /** For Claude: thinking config with budget_tokens */
  claudeThinkingConfig: boolean | { type: 'enabled'; budget_tokens: number };

  /** Provider preferences for OpenRouter */
  provider: ProviderPreferences | undefined;
}

// ============================================================================
// Constants
// ============================================================================

/** Anthropic supports up to 128K thinking tokens */
const ANTHROPIC_MAX_THINKING_TOKENS = 128000;

/** Effort level percentages for budget calculation */
const EFFORT_PERCENTAGES: Record<ReasoningEffort, number> = {
  none: 0,
  minimal: 0.1,
  low: 0.3,
  medium: 0.5,
  high: 0.7,
  xhigh: 0.9,
};

/** Thresholds for reverse-mapping budget_tokens to effort level */
const EFFORT_THRESHOLD_MINIMAL = 0.15;
const EFFORT_THRESHOLD_LOW = 0.4;
const EFFORT_THRESHOLD_MEDIUM = 0.6;
const EFFORT_THRESHOLD_HIGH = 0.8;

/** Default temperatures by provider type */
const DEFAULT_TEMPERATURES = {
  claude: 0,
  openrouter: 0.1,
};

// ============================================================================
// Main Resolver
// ============================================================================

/**
 * Resolve a profile model config into API-ready parameters.
 *
 * @param config - Model configuration from profile
 * @param options - Optional overrides
 * @returns Resolved configuration ready for API calls
 *
 * @example
 * ```ts
 * const resolved = resolveModelConfig(profile.models.judge);
 *
 * if (resolved.isOpenRouter) {
 *   await callOpenRouterWithTool({
 *     model: resolved.model,
 *     temperature: resolved.temperature,
 *     thinking: resolved.thinkingEnabled,
 *     reasoningEffort: resolved.reasoningEffort,
 *     provider: resolved.provider,
 *   });
 * } else {
 *   await callClaudeWithTool({
 *     model: resolved.model,
 *     temperature: resolved.temperature,
 *     thinking: resolved.claudeThinkingConfig,
 *   });
 * }
 * ```
 */
export function resolveModelConfig(
  config: ProfileModelConfig,
  options?: {
    /** Override default temperature for this provider type */
    defaultTemperature?: number;
  }
): ResolvedModelConfig {
  const isOpenRouter = config.model.includes('/');

  // Resolve temperature
  // - "default": undefined (let model use native default)
  // - number: use as-is
  // - undefined: use our default for this provider type
  let temperature: number | undefined;
  if (config.temperature === 'default') {
    temperature = undefined;
  } else if (typeof config.temperature === 'number') {
    temperature = config.temperature;
  } else {
    temperature = options?.defaultTemperature ??
      (isOpenRouter ? DEFAULT_TEMPERATURES.openrouter : DEFAULT_TEMPERATURES.claude);
  }

  // Resolve thinking/reasoning
  const { thinkingEnabled, reasoningEffort, claudeThinkingConfig } =
    resolveReasoning(config, isOpenRouter);

  return {
    model: config.model,
    isOpenRouter,
    temperature,
    thinkingEnabled,
    reasoningEffort,
    claudeThinkingConfig,
    provider: config.provider,
  };
}

/**
 * Resolve reasoning configuration from profile.
 * Handles both new `reasoning` field and legacy `thinking` boolean.
 */
function resolveReasoning(
  config: ProfileModelConfig,
  _isOpenRouter: boolean
): {
  thinkingEnabled: boolean;
  reasoningEffort: ReasoningEffort | undefined;
  claudeThinkingConfig: boolean | { type: 'enabled'; budget_tokens: number };
} {
  // Check new reasoning config first
  if (config.reasoning !== undefined) {
    if (config.reasoning === false) {
      // Explicitly disabled
      return {
        thinkingEnabled: false,
        reasoningEffort: undefined,
        claudeThinkingConfig: false,
      };
    }

    if ('effort' in config.reasoning) {
      // Effort-based reasoning
      const effort = config.reasoning.effort;

      // 'none' effort disables thinking
      if (effort === 'none') {
        return {
          thinkingEnabled: false,
          reasoningEffort: undefined,
          claudeThinkingConfig: false,
        };
      }

      const budgetTokens = Math.floor(ANTHROPIC_MAX_THINKING_TOKENS * EFFORT_PERCENTAGES[effort]);

      return {
        thinkingEnabled: true,
        reasoningEffort: effort,
        claudeThinkingConfig: { type: 'enabled', budget_tokens: budgetTokens },
      };
    }

    if ('budget_tokens' in config.reasoning) {
      // Custom budget
      const budgetTokens = config.reasoning.budget_tokens;
      // For custom budget, estimate effort level for OpenRouter
      const percentage = budgetTokens / ANTHROPIC_MAX_THINKING_TOKENS;
      let estimatedEffort: ReasoningEffort = 'medium';
      if (percentage <= EFFORT_THRESHOLD_MINIMAL) estimatedEffort = 'minimal';
      else if (percentage <= EFFORT_THRESHOLD_LOW) estimatedEffort = 'low';
      else if (percentage <= EFFORT_THRESHOLD_MEDIUM) estimatedEffort = 'medium';
      else if (percentage <= EFFORT_THRESHOLD_HIGH) estimatedEffort = 'high';
      else estimatedEffort = 'xhigh';

      return {
        thinkingEnabled: true,
        reasoningEffort: estimatedEffort,
        claudeThinkingConfig: { type: 'enabled', budget_tokens: budgetTokens },
      };
    }
  }

  // Fall back to legacy thinking boolean
  if (config.thinking === true) {
    // Legacy: thinking enabled but no effort specified
    // Use medium effort as default
    const defaultEffort: ReasoningEffort = 'medium';
    const budgetTokens = Math.floor(ANTHROPIC_MAX_THINKING_TOKENS * EFFORT_PERCENTAGES[defaultEffort]);

    return {
      thinkingEnabled: true,
      reasoningEffort: defaultEffort,
      claudeThinkingConfig: { type: 'enabled', budget_tokens: budgetTokens },
    };
  }

  // Default: disabled
  return {
    thinkingEnabled: false,
    reasoningEffort: undefined,
    claudeThinkingConfig: false,
  };
}

/**
 * Get display string for reasoning config (for logging/telemetry)
 */
export function getReasoningDisplayString(config: ProfileModelConfig): string {
  if (config.reasoning === false) return 'off';
  if (config.reasoning && 'effort' in config.reasoning) return config.reasoning.effort;
  if (config.reasoning && 'budget_tokens' in config.reasoning) return `${config.reasoning.budget_tokens} tokens`;
  if (config.thinking === true) return 'enabled (legacy)';
  return 'off';
}
