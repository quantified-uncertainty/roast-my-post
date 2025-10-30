/**
 * Model ID to abbreviation mapping for display in UI components.
 * Used across claim evaluator and opinion spectrum visualizations.
 */
export const MODEL_ABBREVIATIONS: Record<string, string> = {
  // Anthropic Claude models
  "anthropic/claude-sonnet-4.5": "C4.5",
  "anthropic/claude-sonnet-4": "C4",
  "anthropic/claude-3.7-sonnet-20250219": "C3.7",
  "anthropic/claude-3.5-sonnet": "C3.5",
  "anthropic/claude-haiku-4.5": "Haiku4.5",
  "anthropic/claude-3-haiku": "Haiku",

  // Google Gemini models
  "google/gemini-2.5-pro": "G2.5P",
  "google/gemini-2.5-flash": "G2.5F",
  "google/gemini-pro": "Gem",

  // OpenAI models
  "openai/gpt-5": "GPT5",
  "openai/gpt-5-mini": "5m",
  "openai/gpt-4.1": "4.1",
  "openai/gpt-4.1-mini-2025-04-14": "4.1m",
  "openai/gpt-4-turbo": "GP4T",
  "openai/gpt-4": "GP4",

  // xAI models
  "x-ai/grok-4": "Grok4",
  "x-ai/grok-beta": "Grok",

  // DeepSeek models
  "deepseek/deepseek-chat-v3.1": "DS",
  "deepseek/deepseek-chat": "DeepS",
};

/**
 * Get abbreviated model name for display.
 * Falls back to first 4 characters of model name after provider prefix.
 */
export function getModelAbbreviation(modelId: string): string {
  return (
    MODEL_ABBREVIATIONS[modelId] ||
    modelId.split("/")[1]?.substring(0, 4) ||
    "??"
  );
}

/**
 * Estimate token count from text length.
 * Uses ~3.5 characters per token as a reasonable approximation for English text.
 * Note: This is an estimate. For precise counts, use a proper tokenizer.
 */
export function estimateTokenCount(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  return Math.ceil(text.length / 3.5);
}
