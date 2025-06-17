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
    "claude-sonnet-4-20250514": "anthropic/claude-sonnet-4",
    "claude-sonnet-4": "anthropic/claude-sonnet-4",
    "anthropic/claude-sonnet-4": "anthropic/claude-sonnet-4",

    // OpenAI models
    "gpt-4.1": "openai/gpt-4.1",
    "openai/gpt-4.1": "openai/gpt-4.1",

    // Google models
    "gemini-2.0-flash-001": "google/gemini-2.0-flash-001",
    "google/gemini-2.0-flash-001": "google/gemini-2.0-flash-001",
  };

  return mapping[model] || "anthropic/claude-sonnet-4";
}

export interface CostCalculation {
  inputCost: number;
  outputCost: number;
  imageInputCost?: number;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  imageInputs?: number;
  model: ModelName;
  contextWindow: number;
}

/**
 * Calculate the cost of using an LLM model based on token counts
 * @param model The model to use for calculation
 * @param inputTokens Number of input tokens
 * @param outputTokens Number of output tokens
 * @param imageInputs Optional number of input images
 * @returns Cost calculation object with detailed breakdown
 */
export function calculateCost(
  model: ModelName,
  inputTokens: number,
  outputTokens: number,
  imageInputs: number = 0
): CostCalculation {
  const pricing = OPENROUTER_PRICING[model];

  // Convert token counts to millions for pricing calculation
  const inputTokensInMillions = inputTokens / 1_000_000;
  const outputTokensInMillions = outputTokens / 1_000_000;
  const imageInputsInThousands = imageInputs / 1_000;

  const inputCost = inputTokensInMillions * pricing.input;
  const outputCost = outputTokensInMillions * pricing.output;
  const imageInputCost = imageInputsInThousands * pricing.imageInput;
  const totalCost = inputCost + outputCost + imageInputCost;

  return {
    inputCost,
    outputCost,
    imageInputCost,
    totalCost,
    inputTokens,
    outputTokens,
    imageInputs,
    model,
    contextWindow: pricing.context,
  };
}

/**
 * Format a cost in dollars to a human-readable string
 * @param cost Cost in dollars
 * @returns Formatted string with dollar sign and 4 decimal places
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

/**
 * Compare costs across different models for the same token counts
 * @param inputTokens Number of input tokens
 * @param outputTokens Number of output tokens
 * @param imageInputs Optional number of input images
 * @returns Array of cost calculations for all available models
 */
export function compareModelCosts(
  inputTokens: number,
  outputTokens: number,
  imageInputs: number = 0
): CostCalculation[] {
  return Object.keys(OPENROUTER_PRICING).map((model) =>
    calculateCost(model as ModelName, inputTokens, outputTokens, imageInputs)
  );
}

/**
 * Calculate API cost in cents based on token usage
 * @param usage Token usage object containing input_tokens and output_tokens
 * @param model The model name to use for pricing calculation
 * @returns Cost in cents
 */
export function calculateApiCost(
  usage: { input_tokens: number; output_tokens: number } | undefined,
  model?: ModelName
): number {
  if (!usage) return 0;

  // Default to claude-sonnet-4 if no model specified
  const defaultModel: ModelName = "anthropic/claude-sonnet-4";
  const modelToUse = model || defaultModel;
  const pricing = OPENROUTER_PRICING[modelToUse];
  const inputCostPerToken = pricing.input / 1_000_000; // Convert to cost per token
  const outputCostPerToken = pricing.output / 1_000_000; // Convert to cost per token

  const inputCost = usage.input_tokens * inputCostPerToken;
  const outputCost = usage.output_tokens * outputCostPerToken;

  // Convert to cents (multiply by 100)
  return Math.round((inputCost + outputCost) * 100);
}

/**
 * Calculate API cost in dollars based on token usage
 * @param usage Token usage object containing input_tokens and output_tokens
 * @param model The model name to use for pricing calculation
 * @returns Cost in dollars
 */
export function calculateApiCostInDollars(
  usage: { input_tokens: number; output_tokens: number } | undefined,
  model?: ModelName
): number {
  return calculateApiCost(usage, model) / 100;
}
