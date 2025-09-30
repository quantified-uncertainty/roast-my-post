// OpenRouter pricing per million tokens (as of March 2024)
export const OPENROUTER_PRICING = {
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
export function mapModelToCostModel(model: string): ModelName {
  const mapping: Record<string, ModelName> = {
    // Anthropic models
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

  return mapping[model] || "anthropic/claude-sonnet-4"; // Default to Claude Sonnet 4
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
  const pricing = OPENROUTER_PRICING[costModel];

  if (!pricing) {
    console.warn(`No pricing found for model: ${model}`);
    return 0;
  }

  // Calculate text token costs (convert from per million to actual tokens)
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

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
