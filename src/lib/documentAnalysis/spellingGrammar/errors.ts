/**
 * Custom error classes for spelling/grammar analysis
 */

export class SpellingGrammarError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SpellingGrammarError';
  }
}

export class ChunkAnalysisError extends SpellingGrammarError {
  constructor(
    message: string,
    public readonly chunkIndex: number,
    public readonly attempt: number,
    public readonly maxRetries: number,
    context?: Record<string, unknown>
  ) {
    super(
      `Chunk ${chunkIndex} analysis failed: ${message} (attempt ${attempt}/${maxRetries})`,
      'CHUNK_ANALYSIS_ERROR',
      { ...context, chunkIndex, attempt, maxRetries }
    );
    this.name = 'ChunkAnalysisError';
  }
}

export class ConventionDetectionError extends SpellingGrammarError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(
      `Convention detection failed: ${message}`,
      'CONVENTION_DETECTION_ERROR',
      context
    );
    this.name = 'ConventionDetectionError';
  }
}

export class ValidationError extends SpellingGrammarError {
  constructor(message: string, invalidData: unknown, context?: Record<string, unknown>) {
    super(
      message,
      'VALIDATION_ERROR',
      { ...context, invalidData }
    );
    this.name = 'ValidationError';
  }
}

/**
 * Wraps an error with additional context
 */
export function wrapError(
  error: unknown,
  message: string,
  context?: Record<string, unknown>
): SpellingGrammarError {
  if (error instanceof SpellingGrammarError) {
    // Return new error with combined context
    return new SpellingGrammarError(
      error.message,
      error.code,
      { ...error.context, ...context }
    );
  }
  
  const originalError = error instanceof Error ? error.message : String(error);
  return new SpellingGrammarError(
    `${message}: ${originalError}`,
    'WRAPPED_ERROR',
    { ...context, originalError }
  );
}