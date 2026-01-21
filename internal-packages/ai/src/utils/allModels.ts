/**
 * Fetch models from both Anthropic and OpenRouter APIs
 */

import Anthropic from "@anthropic-ai/sdk";

export interface ModelInfo {
  id: string;
  name: string;
  provider: "anthropic" | "openrouter";
  contextLength?: number;
  description?: string;
  /** Whether the model supports temperature parameter */
  supportsTemperature?: boolean;
  /** Default temperature for this model (if known) */
  defaultTemperature?: number;
  /** Maximum temperature value (default 1, some models support up to 2) */
  maxTemperature?: number;
  /** Whether the model supports extended thinking/reasoning */
  supportsReasoning?: boolean;
  /** Maximum completion tokens from provider (top_provider.max_completion_tokens) */
  maxCompletionTokens?: number;
}

// Cache for models
let cachedModels: ModelInfo[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch models from Anthropic API
 */
async function fetchAnthropicModels(): Promise<ModelInfo[]> {
  try {
    const client = new Anthropic();
    const response = await client.models.list();

    return response.data.map((m) => ({
      id: m.id,
      name: m.display_name,
      provider: "anthropic" as const,
      supportsTemperature: true, // All Anthropic models support temperature
      defaultTemperature: 1, // Anthropic default is 1
      maxTemperature: 2, // Anthropic supports 0-2
      // Claude 3.5 Sonnet and newer support extended thinking
      supportsReasoning: m.id.includes("claude-3") || m.id.includes("claude-sonnet-4") || m.id.includes("claude-opus-4"),
    }));
  } catch (e) {
    console.error("Failed to fetch Anthropic models:", e);
    return [];
  }
}

/**
 * Fetch models from OpenRouter API
 */
async function fetchOpenRouterModels(): Promise<ModelInfo[]> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models");
    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      data: Array<{
        id: string;
        name: string;
        context_length?: number;
        description?: string;
        supported_parameters?: string[];
        default_parameters?: {
          temperature?: number | null;
        };
        top_provider?: {
          max_completion_tokens?: number | null;
        };
      }>;
    };

    return data.data
      .filter((m) => {
        // Filter out free/test models and keep quality models
        if (m.id.includes(":free")) return false;
        if (m.id.includes("auto")) return false;
        return true;
      })
      .map((m) => {
        // Determine max temperature based on provider
        // Match the ranges in openrouter.ts PROVIDER_TEMPERATURE_RANGES
        const getMaxTemp = (modelId: string): number => {
          if (modelId.startsWith("google/") || modelId.includes("gemini")) return 2;
          if (modelId.startsWith("anthropic/") || modelId.includes("claude")) return 2;
          if (modelId.startsWith("openai/") || modelId.includes("gpt")) return 2;
          if (modelId.startsWith("x-ai/") || modelId.includes("grok")) return 2;
          if (modelId.startsWith("deepseek/")) return 2;
          if (modelId.startsWith("z-ai/")) return 1.5;
          // Default to 1.5 for unknown providers (conservative)
          return 1.5;
        };
        const maxTemp = getMaxTemp(m.id);

        return {
          id: m.id,
          name: m.name,
          provider: "openrouter" as const,
          contextLength: m.context_length,
          description: m.description,
          supportsTemperature: m.supported_parameters?.includes("temperature") ?? true,
          defaultTemperature: m.default_parameters?.temperature ?? undefined,
          maxTemperature: maxTemp,
          supportsReasoning: m.supported_parameters?.includes("reasoning") ||
            m.supported_parameters?.includes("include_reasoning"),
          maxCompletionTokens: m.top_provider?.max_completion_tokens ?? undefined,
        };
      });
  } catch (e) {
    console.error("Failed to fetch OpenRouter models:", e);
    return [];
  }
}

/**
 * Get all available models from both APIs (cached)
 */
export async function getAllModels(): Promise<ModelInfo[]> {
  const now = Date.now();

  if (cachedModels && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedModels;
  }

  const [anthropicModels, openRouterModels] = await Promise.all([
    fetchAnthropicModels(),
    fetchOpenRouterModels(),
  ]);

  // Combine and sort: Anthropic first, then OpenRouter alphabetically
  cachedModels = [
    ...anthropicModels.sort((a, b) => a.name.localeCompare(b.name)),
    ...openRouterModels.sort((a, b) => a.name.localeCompare(b.name)),
  ];

  cacheTimestamp = now;
  return cachedModels;
}

/**
 * Filter models by search query
 * Matches against id and name
 */
export function filterModels(models: ModelInfo[], query: string): ModelInfo[] {
  if (!query.trim()) {
    return models;
  }

  const lowerQuery = query.toLowerCase();
  return models.filter(
    (m) =>
      m.id.toLowerCase().includes(lowerQuery) ||
      m.name.toLowerCase().includes(lowerQuery) ||
      m.provider.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Group models by provider
 */
export function groupModelsByProvider(
  models: ModelInfo[]
): Map<string, ModelInfo[]> {
  const grouped = new Map<string, ModelInfo[]>();

  for (const model of models) {
    const existing = grouped.get(model.provider) || [];
    existing.push(model);
    grouped.set(model.provider, existing);
  }

  return grouped;
}

/** Temperature presets for model configuration */
export const TEMP_PRESETS: Array<"default" | number> = ["default", 0, 0.3, 0.5, 0.7, 1.0];
