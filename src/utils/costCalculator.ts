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
} as const;

export type ModelName = keyof typeof OPENROUTER_PRICING;

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
