// ============================================================================
// Types and Interfaces
// ============================================================================

// Refusal reason types (matches OpinionSpectrum2D)
export type RefusalReason =
  | "Safety"
  | "Policy"
  | "MissingData"
  | "Unclear"
  | "Error";

// Token usage type (from OpenAI SDK)
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// Extended message type with optional reasoning fields
export interface MessageWithReasoning {
  content?: string | null;
  reasoning?: string;
  reasoning_content?: string;
}

// Custom error type for evaluations with attached context
export interface EvaluationError extends Error {
  rawResponse?: string;
  parsedData?: unknown;
  attemptedParse?: string;
  tokenUsage?: TokenUsage;
  refusalReason?: RefusalReason;
  thinkingText?: string;
}

// Input/Output types
export interface ClaimEvaluatorInput {
  claim: string;
  context?: string;
  models?: string[];
  runs?: number; // Number of times to run each model (1-5, default 1)
  explanationLength?: number; // Max words for explanation text (3-200 words, default 5)
  temperature?: number; // Temperature for model responses (0.0-2.0, default 1.0)
}

// Successful response details
export interface SuccessfulResponse {
  agreement: number; // 0-100
  confidence: number; // 0-100
  agreementLevel?: string; // Human-readable label (e.g., "Strongly Disagree")
  reasoning: string; // Brief reasoning (configurable by explanationLength)
}

// Failed response details
export interface FailedResponse {
  error: string;
  refusalReason: RefusalReason; // Categorized refusal/error reason
  errorDetails?: string; // Additional error context
}

// Evaluation result with either success or failure response
export interface EvaluationResult {
  model: string;
  provider: string;
  hasError: boolean; // True if evaluation failed, false if successful
  responseTimeMs?: number; // Time taken for LLM to respond in milliseconds
  rawResponse?: string; // Full text response from model (or error response)
  thinkingText?: string; // Extended thinking/reasoning (for o1, o3, etc)
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  successfulResponse?: SuccessfulResponse; // Present when hasError is false
  failedResponse?: FailedResponse; // Present when hasError is true
}

// Legacy types for backwards compatibility during migration
export type ModelEvaluation = EvaluationResult;
export type SuccessfulEvaluation = EvaluationResult & { hasError: false; successfulResponse: SuccessfulResponse };
export type FailedEvaluation = EvaluationResult & { hasError: true; failedResponse: FailedResponse };

export interface ClaimEvaluatorOutput {
  evaluations: EvaluationResult[];
  summary?: {
    mean: number;
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract provider name from OpenRouter model ID
 * e.g., "anthropic/claude-3-haiku" -> "anthropic"
 */
export function extractProvider(modelId: string): string {
  const parts = modelId.split('/');
  return parts[0] || 'unknown';
}

/**
 * Convert agreement score (0-100) to human-readable label
 */
export function getAgreementLabel(agreement: number): string {
  if (agreement >= 80) return 'Strongly Agree';
  if (agreement >= 60) return 'Agree';
  if (agreement >= 40) return 'Neutral';
  if (agreement >= 20) return 'Disagree';
  return 'Strongly Disagree';
}

/**
 * Sanitize response content to prevent exposure of sensitive data
 * Truncates long responses and removes potential API keys or tokens
 */
export function sanitizeResponse(response: string | undefined): string | undefined {
  if (!response) return response;

  // Truncate very long responses to prevent log bloat
  const MAX_LENGTH = 500;
  const truncated = response.length > MAX_LENGTH
    ? response.substring(0, MAX_LENGTH) + '...[truncated]'
    : response;

  // Remove potential API keys (basic pattern matching)
  // Matches common patterns like sk-xxx, key_xxx, etc.
  return truncated.replace(/\b(sk-|key_|api[_-]?key[_-]?)[a-zA-Z0-9_-]{20,}\b/gi, '[REDACTED]');
}

/**
 * Detect the reason for a refusal or error based on error message and response content
 */
export function detectRefusalReason(error: Error, rawResponse?: string): RefusalReason {
  const combined = `${error.message} ${rawResponse || ''}`.toLowerCase();

  // Safety refusals: harmful content, violence, illegal activities
  if (/safety|harmful|dangerous|violat.*guideline|inappropriate|offensive/i.test(combined)) {
    return 'Safety';
  }

  // Policy refusals: model policies, content restrictions, OpenRouter data policies
  if (/policy|cannot.*evaluat|against.*rule|not.*allowed|unable to (provide|assist|answer)|no endpoints found/i.test(combined)) {
    return 'Policy';
  }

  // Missing data: insufficient information, lack of access
  if (/insufficient.*data|don't have access|missing.*information|lack.*context|no.*data|cannot access|don't possess/i.test(combined)) {
    return 'MissingData';
  }

  // Unclear: ambiguous claims, vague questions
  if (/unclear|ambiguous|vague|not.*specific|too.*broad|imprecise/i.test(combined)) {
    return 'Unclear';
  }

  // Default to Error for technical failures (JSON parse, network, timeout, etc.)
  return 'Error';
}

/**
 * Extract and parse JSON from raw content, handling markdown code blocks and extra text
 */
export function extractAndParseJSON(rawContent: string): unknown {
  let jsonContent = rawContent.trim();

  // Remove markdown code blocks if present
  if (jsonContent.startsWith('```')) {
    // Extract content between ``` markers
    const match = jsonContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (match) {
      jsonContent = match[1].trim();
    }
  }

  // Try to extract JSON object if there's text before/after it
  // Look for { ... } pattern (greedy to capture the full object)
  if (!jsonContent.startsWith('{')) {
    const jsonMatch = jsonContent.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }
  }

  // Some models may return JSON with literal newlines in string values
  // This is invalid JSON - we need to escape them as a fallback
  try {
    return JSON.parse(jsonContent);
  } catch (firstError) {
    // If parsing fails, try to fix common issues with literal newlines in strings
    // Replace literal newlines within quoted strings with \n escape sequences
    const fixed = jsonContent.replace(
      /"([^"]*)"(\s*[:,\]\}])/g,
      (match, content, after) => {
        // Escape literal newlines in the string content
        const escaped = content.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
        return `"${escaped}"${after}`;
      }
    );

    try {
      return JSON.parse(fixed);
    } catch (secondError) {
      // If still failing, throw the original error for better debugging
      throw firstError;
    }
  }
}

/**
 * Create a standardized evaluation error with sanitized context
 */
export function createEvaluationError(
  message: string,
  context: {
    rawResponse?: string;
    parsedData?: unknown;
    attemptedParse?: string;
    tokenUsage?: TokenUsage;
    refusalReason?: RefusalReason;
  }
): EvaluationError {
  const err = new Error(message) as EvaluationError;

  // Attach sanitized context
  if (context.rawResponse) {
    err.rawResponse = sanitizeResponse(context.rawResponse);
  }
  if (context.parsedData) {
    err.parsedData = context.parsedData;
  }
  if (context.attemptedParse) {
    err.attemptedParse = sanitizeResponse(context.attemptedParse);
  }
  if (context.tokenUsage) {
    err.tokenUsage = context.tokenUsage;
  }
  if (context.refusalReason) {
    err.refusalReason = context.refusalReason;
  }

  return err;
}
