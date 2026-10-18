// Fallback estimates per million tokens (2026-10-18). Prefer provider-reported cost.
export const OPENROUTER_PRICING = {
  "anthropic/claude-sonnet-5.5": { input: 2, output: 10, imageInput: 0, context: 1_000_000 },
  "anthropic/claude-haiku-5.5": { input: 0.10, output: 0.50, imageInput: 0, context: 1_000_000 },
  "anthropic/claude-opus-5.5": { input: 4, output: 20, imageInput: 0, context: 1_000_000 },
  "openai/gpt-6-luna": { input: 0.10, output: 0.50, imageInput: 0, context: 1_050_000 },
  "google/gemini-4-argon": { input: 2, output: 10, imageInput: 0, context: 1_048_576 },
  "google/gemini-3.8-flash": { input: 0.825, output: 4.125, imageInput: 0, context: 1_048_576 },
  "deepseek/deepseek-v4.1-flash": { input: 0.0648, output: 0.144, imageInput: 0, context: 1_048_576 },
  "x-ai/grok-4.7": { input: 2, output: 6, imageInput: 0, context: 500_000 },
  // Gemini 2.0 Flash
  "google/gemini-2.0-flash-001": {
    input: 0.1, // $0.1 per million input tokens
    output: 0.4, // $0.4 per million output tokens
    imageInput: 0.0258, // $0.0258 per thousand input images
    context: 1_000_000, // 1M context window
  },
  // Claude 3.7 Sonnet
  "anthropic/claude-3.7-sonnet": {
    input: 3, // $3 per million input tokens
    output: 15, // $15 per million output tokens
    imageInput: 4.8, // $4.8 per thousand input images
    context: 200_000, // 200K context window
  },
  // Claude Sonnet 4
  "anthropic/claude-sonnet-4": {
    input: 3, // $3 per million input tokens
    output: 15, // $15 per million output tokens
    imageInput: 4.8, // $4.8 per thousand input images
    context: 200_000, // 200K context window
  },
  // GPT-4.1
  "openai/gpt-4.1": {
    input: 2, // $2 per million input tokens
    output: 8, // $8 per million output tokens
    imageInput: 0, // No image input support
    context: 1_050_000, // 1.05M context window
  },
} as const;

export type ModelName = keyof typeof OPENROUTER_PRICING;

/**
 * Map any model ID to OpenRouter model names for cost calculation
 * Handles Anthropic, OpenAI, and Google model naming variations
 */
export function mapModelToCostModel(model: string): ModelName | undefined {
  const mapping: Record<string, ModelName> = {
    "claude-sonnet-5-5": "anthropic/claude-sonnet-5.5",
    "claude-haiku-5-5": "anthropic/claude-haiku-5.5",
    "claude-opus-5-5": "anthropic/claude-opus-5.5",
    // Anthropic models
    "claude-sonnet-4-5-20250929": "anthropic/claude-sonnet-4",
    "claude-sonnet-4-5": "anthropic/claude-sonnet-4",
    "claude-sonnet-4": "anthropic/claude-sonnet-4",
    "anthropic/claude-sonnet-4": "anthropic/claude-sonnet-4",

    // OpenAI models
    "gpt-4.1": "openai/gpt-4.1",
    "openai/gpt-4.1": "openai/gpt-4.1",

    // Google models
    "gemini-2.0-flash-001": "google/gemini-2.0-flash-001",
    "google/gemini-2.0-flash-001": "google/gemini-2.0-flash-001",

    // Legacy Claude models
    "claude-3.7-sonnet-20241029": "anthropic/claude-3.7-sonnet",
    "claude-3.7-sonnet": "anthropic/claude-3.7-sonnet",
    "anthropic/claude-3.7-sonnet": "anthropic/claude-3.7-sonnet",
  };

  return mapping[model] ?? (model in OPENROUTER_PRICING ? model as ModelName : undefined);
}

/**
 * Calculate API cost in dollars based on usage
 */
export function calculateApiCostInDollars(
  inputTokens: number,
  outputTokens: number,
  model: string,
  inputImages: number = 0
): number {
  const costModel = mapModelToCostModel(model);
  const pricing = costModel ? OPENROUTER_PRICING[costModel] : undefined;

  if (!pricing) {
    console.warn(`No pricing found for model: ${model}`);
    return 0;
  }

  // Calculate text token costs (convert from per million to actual tokens)
  const haikuLong = costModel === "anthropic/claude-haiku-5.5" && inputTokens > 100_000;
  const longContext = (costModel === "openai/gpt-6-luna" && inputTokens > 272_000) || (costModel === "x-ai/grok-4.7" && inputTokens > 200_000);
  const inputRate = haikuLong ? 0.50 : pricing.input * (longContext ? 2 : 1);
  const outputRate = haikuLong ? 2.50 : pricing.output * (longContext ? (costModel === "openai/gpt-6-luna" ? 1.5 : 2) : 1);
  const inputCost = (inputTokens / 1_000_000) * inputRate;
  const outputCost = (outputTokens / 1_000_000) * outputRate;

  // Calculate image costs (convert from per thousand to actual images)
  const imageCost = (inputImages / 1_000) * pricing.imageInput;

  return inputCost + outputCost + imageCost;
}

/**
 * Calculate cost for a specific model and usage
 */
export function calculateCost(
  usage: { input_tokens?: number; output_tokens?: number },
  model: string
): number {
  return calculateApiCostInDollars(
    usage.input_tokens || 0,
    usage.output_tokens || 0,
    model
  );
}
