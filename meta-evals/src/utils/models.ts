/**
 * Anthropic Models Utilities
 */

import Anthropic from "@anthropic-ai/sdk";

export interface ModelInfo {
  id: string;
  displayName: string;
  createdAt: string;
}

// Default to Sonnet 5.5
export const DEFAULT_JUDGE_MODEL = "claude-sonnet-5-5";

let cachedModels: ModelInfo[] | null = null;

/**
 * Fetch available models from the Anthropic API.
 * Results are cached for the lifetime of the process.
 */
export async function getAvailableModels(): Promise<ModelInfo[]> {
  if (cachedModels) {
    return cachedModels;
  }

  const client = new Anthropic();
  const response = await client.models.list();

  cachedModels = response.data.map((m) => ({
    id: m.id,
    displayName: m.display_name,
    createdAt: m.created_at,
  }));

  return cachedModels;
}

/**
 * Get a subset of recommended models for judging (exclude older/smaller models)
 */
export function getRecommendedJudgeModels(models: ModelInfo[]): ModelInfo[] {
  // Prefer newer, more capable models for judging
  const recommendedIds = [
    "claude-sonnet-5-5",
    "claude-opus-5-5",
    "claude-haiku-5-5",
  ];

  return models.filter((m) => recommendedIds.includes(m.id));
}
