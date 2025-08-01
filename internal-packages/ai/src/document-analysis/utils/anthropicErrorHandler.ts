/**
 * Shared error handler for Anthropic API errors
 * Provides consistent error messages across the document analysis system
 */

export class AnthropicError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'AnthropicError';
  }
}

/**
 * Handle Anthropic API errors consistently
 * @param error - The error object from Anthropic API
 * @throws {AnthropicError} - A standardized error with user-friendly message
 */
export function handleAnthropicError(error: unknown): never {
  // Type guard for error with status
  const errorWithStatus = error as { status?: number; message?: string; toString?: () => string };
  
  // Rate limiting
  if (errorWithStatus?.status === 429) {
    throw new AnthropicError(
      "Anthropic API rate limit exceeded. Please try again in a moment.",
      429,
      error
    );
  }

  // Quota/billing issues
  if (errorWithStatus?.status === 402) {
    throw new AnthropicError(
      "Anthropic API quota exceeded. Please check your billing.",
      402,
      error
    );
  }

  // Authentication issues
  if (errorWithStatus?.status === 401) {
    throw new AnthropicError(
      "Anthropic API authentication failed. Please check your API key.",
      401,
      error
    );
  }

  // Server errors
  if (errorWithStatus?.status && errorWithStatus.status >= 500) {
    throw new AnthropicError(
      `Anthropic API server error (${errorWithStatus.status}). Please try again later.`,
      errorWithStatus.status,
      error
    );
  }

  // Generic error
  const message = errorWithStatus?.message || errorWithStatus?.toString?.() || 'Unknown error';
  throw new AnthropicError(
    `Anthropic API error: ${message}`,
    errorWithStatus?.status,
    error
  );
}

/**
 * Helper to format JSON strings with proper escaping
 * Used to prevent JSON parsing errors in LLM responses
 */
export function formatFixing(jsonSchema: unknown): string {
  return JSON.stringify(jsonSchema, null, 2)
    .replace(/"/g, '\"')
    .replace(/\n/g, '\\n');
}