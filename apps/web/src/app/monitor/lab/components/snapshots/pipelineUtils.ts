/**
 * Utility functions for Pipeline visualization
 */

import type { ExtractorInfo } from "../../types";

export function formatDuration(ms: number | undefined): string {
  if (ms === undefined) return "-";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function formatCost(usd: number | undefined): string {
  if (usd === undefined) return "";
  return `$${usd.toFixed(4)}`;
}

export function formatTokens(tokens: number | undefined): string {
  if (tokens === undefined) return "";
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return String(tokens);
}

/** Extract a friendly model name from the full model ID */
export function getModelDisplayName(model: string): string {
  // Remove provider prefix (e.g., "google/gemini-2.5-flash" -> "gemini-2.5-flash")
  const withoutProvider = model.includes("/") ? model.split("/")[1] : model;

  // Shorten common model names
  const shortcuts: Record<string, string> = {
    "claude-sonnet-4-5-20250929": "Claude Sonnet 4.5",
    "claude-3-5-sonnet-20241022": "Claude 3.5 Sonnet",
    "claude-3-haiku-20240307": "Claude 3 Haiku",
    "gemini-3-flash-preview": "Gemini 3 Flash",
    "gemini-2.5-flash": "Gemini 2.5 Flash",
    "gemini-2.5-pro": "Gemini 2.5 Pro",
    "gpt-4-turbo": "GPT-4 Turbo",
    "gpt-4o": "GPT-4o",
  };

  return shortcuts[withoutProvider] || withoutProvider;
}

/** Format temperature for display */
export function formatTemperature(ext: ExtractorInfo): string {
  // Check actualApiParams first (source of truth)
  if (ext.actualApiParams?.temperature !== undefined) {
    return `temp ${ext.actualApiParams.temperature}`;
  }
  // Fall back to temperatureConfig
  if (ext.temperatureConfig === "default") {
    return "temp default";
  }
  if (typeof ext.temperatureConfig === "number") {
    return `temp ${ext.temperatureConfig}`;
  }
  return "";
}

/** Format reasoning/thinking for display */
export function formatReasoning(ext: ExtractorInfo): string {
  // Check actualApiParams for Claude-style thinking
  if (ext.actualApiParams?.thinking?.type === "enabled") {
    const budget = ext.actualApiParams.thinking.budget_tokens;
    return `thinking ${formatTokens(budget)} tokens`;
  }
  // Check for OpenRouter-style reasoning with explicit max_tokens (preferred)
  if (ext.actualApiParams?.reasoning?.max_tokens) {
    const budget = ext.actualApiParams.reasoning.max_tokens;
    return `reasoning ${formatTokens(budget)} tokens`;
  }
  // Check for OpenRouter-style reasoning effort (fallback)
  if (ext.actualApiParams?.reasoning?.effort) {
    return `reasoning: ${ext.actualApiParams.reasoning.effort}`;
  }
  if (ext.thinkingEnabled === true) {
    return "thinking enabled";
  }
  if (ext.thinkingEnabled === false) {
    return "no thinking";
  }
  return "";
}

/** Get a human-readable title for a filter stage */
export function getFilterStageTitle(stageName: string, index: number): string {
  const titles: Record<string, string> = {
    "principle-of-charity-filter": "Principle of Charity",
    "supported-elsewhere-filter": "Supported-Elsewhere",
    "severity-filter": "Severity",
    "confidence-filter": "Confidence",
    "dedup-filter": "Deduplication",
  };
  const base = titles[stageName] || stageName.replace(/-filter$/, "").replace(/-/g, " ");
  return `${index + 2}. ${base.charAt(0).toUpperCase() + base.slice(1)} Filter`;
}

/** Get filter stage badge text */
export function getFilterStageBadgeText(stage: string): string {
  const labels: Record<string, string> = {
    "principle-of-charity-filter": "Charity",
    "supported-elsewhere-filter": "Elsewhere",
    "severity-filter": "Severity",
    "confidence-filter": "Confidence",
    "review": "Review",
  };
  return labels[stage] || stage.replace(/-filter$/, "");
}
