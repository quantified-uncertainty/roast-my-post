import { z } from "zod";
import { Tool, ToolContext } from "../base/Tool";
import { claimEvaluatorConfig } from "../configs";
import { createOpenRouterClient, OPENROUTER_MODELS, normalizeTemperature } from "../../utils/openrouter";

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

export interface ModelEvaluation {
  model: string;
  provider: string;
  agreement: number; // 0-100
  confidence: number; // 0-100
  agreementLevel?: string; // Human-readable label (e.g., "Strongly Disagree")
  reasoning: string; // 10-30 characters
  // Debug/raw data
  rawResponse?: string; // Full text response from model
  thinkingText?: string; // Extended thinking/reasoning (for o1, o3, etc)
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface FailedEvaluation {
  model: string;
  provider: string;
  error: string;
  refusalReason: RefusalReason; // Categorized refusal/error reason
  rawResponse?: string; // The response that failed to parse (if any)
  errorDetails?: string; // Additional error context
}

export interface ClaimEvaluatorOutput {
  results: ModelEvaluation[];
  failed?: FailedEvaluation[]; // Models that failed to evaluate
}

// Constants
const DEFAULT_EXPLANATION_LENGTH = 50; // Default max words for explanation text

// Default models for claim evaluation
const DEFAULT_MODELS = [
  OPENROUTER_MODELS.CLAUDE_SONNET_4_5,         // Claude Sonnet 4.5 (Latest)
  OPENROUTER_MODELS.GPT_5_MINI,                // GPT-5 Mini
  OPENROUTER_MODELS.DEEPSEEK_CHAT_V3_1_FREE,   // DeepSeek Chat V3.1
  OPENROUTER_MODELS.GROK_4,                    // Grok 4
];

// Input schema
const inputSchema = z.object({
  claim: z.string().min(1).max(1000).describe("The claim to evaluate"),
  context: z
    .string()
    .max(30000)
    .optional()
    .describe("Additional context about the claim (when/where made, background, domain knowledge, constraints)"),
  models: z
    .array(z.string())
    .optional()
    .describe("List of OpenRouter model IDs to use (defaults to top 6 reasoning models)"),
  runs: z
    .coerce.number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .describe("Number of times to run each model independently (1-5, default 1)"),
  explanationLength: z
    .coerce.number()
    .int()
    .min(3)
    .max(200)
    .optional()
    .describe("Explanation Length (Max Words): Maximum words per explanation (3-200, default 50)"),
  temperature: z
    .coerce.number()
    .min(0.0)
    .max(1.0)
    .optional()
    .describe("Temperature for model responses - lower is more consistent, higher is more varied (0.0-1.0, default 0.7). Automatically scaled per provider."),
});

// Schema for model's parsed JSON response (before we process it)
const parsedResponseSchema = z.union([
  // Normal evaluation response
  z.object({
    agreement: z.number().min(0).max(100),
    confidence: z.number().min(0).max(100),
    reasoning: z.string().min(10),
  }),
  // Refusal response
  z.object({
    refusalReason: z.enum(['Safety', 'Policy', 'MissingData', 'Unclear', 'Error']),
    reasoning: z.string(),
  }),
]);

// Output schema
const outputSchema = z.object({
  results: z.array(
    z.object({
      model: z.string().describe("Model identifier"),
      provider: z.string().describe("Provider name (e.g., 'anthropic', 'openai')"),
      agreement: z.number().min(0).max(100).describe("Agreement score 0-100"),
      confidence: z.number().min(0).max(100).describe("Confidence score 0-100"),
      reasoning: z.string().min(1).max(2000).describe("Brief reasoning (configurable by reasoningLength in words)"),
      rawResponse: z.string().optional().describe("Full raw response from model"),
      thinkingText: z.string().optional().describe("Extended thinking/reasoning (for o1/o3 models)"),
      tokenUsage: z.object({
        promptTokens: z.number(),
        completionTokens: z.number(),
        totalTokens: z.number(),
      }).optional().describe("Token usage statistics"),
    })
  ),
  failed: z.array(
    z.object({
      model: z.string().describe("Model identifier"),
      provider: z.string().describe("Provider name"),
      error: z.string().describe("Error message"),
      refusalReason: z.enum(["Safety", "Policy", "MissingData", "Unclear", "Error"]).describe("Categorized refusal/error reason"),
      rawResponse: z.string().optional().describe("Raw response that failed to parse"),
      errorDetails: z.string().optional().describe("Additional error context"),
    })
  ).optional().describe("Models that failed to evaluate"),
}) satisfies z.ZodType<ClaimEvaluatorOutput>;

/**
 * Extract provider name from OpenRouter model ID
 * e.g., "anthropic/claude-3-haiku" -> "anthropic"
 */
function extractProvider(modelId: string): string {
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
function sanitizeResponse(response: string | undefined): string | undefined {
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
function detectRefusalReason(error: Error, rawResponse?: string): RefusalReason {
  const combined = `${error.message} ${rawResponse || ''}`.toLowerCase();

  // Safety refusals: harmful content, violence, illegal activities
  if (/safety|harmful|dangerous|violat.*guideline|inappropriate|offensive/i.test(combined)) {
    return 'Safety';
  }

  // Policy refusals: model policies, content restrictions
  if (/policy|cannot.*evaluat|against.*rule|not.*allowed|unable to (provide|assist|answer)/i.test(combined)) {
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
function extractAndParseJSON(rawContent: string): unknown {
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
  // Look for { ... } pattern
  if (!jsonContent.startsWith('{')) {
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }
  }

  return JSON.parse(jsonContent);
}

/**
 * Create a standardized evaluation error with sanitized context
 */
function createEvaluationError(
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

/**
 * Evaluate a claim with a single model via OpenRouter with timeout
 */
async function evaluateWithModel(
  client: ReturnType<typeof createOpenRouterClient>,
  input: ClaimEvaluatorInput,
  model: string,
  context: ToolContext
): Promise<ModelEvaluation> {
  context.logger.info(`[ClaimEvaluator] Evaluating with ${model}`);

  // Create timeout promise (120 seconds)
  const TIMEOUT_MS = 120000;
  let timeoutHandle: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(createEvaluationError(`Model evaluation timed out after ${TIMEOUT_MS / 1000}s`, {
        refusalReason: 'Error',
      }));
    }, TIMEOUT_MS);
  });

  try {
    // Race between evaluation and timeout
    return await Promise.race([
      evaluateWithModelImpl(client, input, model, context),
      timeoutPromise,
    ]);
  } finally {
    // Always clear timeout to prevent memory leak
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

/**
 * Implementation of model evaluation (wrapped with timeout)
 */
async function evaluateWithModelImpl(
  client: ReturnType<typeof createOpenRouterClient>,
  input: ClaimEvaluatorInput,
  model: string,
  context: ToolContext
): Promise<ModelEvaluation> {

  // For runs > 1, add slight prompt variation to encourage independent thinking
  const runNote = (input.runs && input.runs > 1)
    ? '\n\nNote: You are one of multiple independent evaluators. Provide your honest assessment without trying to match others.'
    : '';

  const explanationLength = input.explanationLength || DEFAULT_EXPLANATION_LENGTH;

  const prompt = `You are evaluating the following claim:

"${input.claim}"
${input.context ? `\nContext: ${input.context}` : ''}

If the claim is meaningful and evaluable, rate your agreement and confidence:
- Agreement: 0 (completely disagree/certainly false) to 100 (completely agree/certainly true)
- Confidence: 0 (very uncertain/insufficient information) to 100 (very confident in your assessment)

If you cannot or should not evaluate this claim, you may REFUSE by providing a "refusalReason" instead:
- "Unclear": The claim is too vague, ambiguous, or imprecise to evaluate meaningfully
- "MissingData": Insufficient information or data to make an informed assessment
- "Policy": Against your policies or rules to evaluate
- "Safety": Evaluating this claim could be harmful or dangerous

${input.context ? 'Consider the provided context (temporal, domain-specific, or situational) when forming your assessment.' : ''}${runNote}

CRITICAL: You must respond with ONLY a JSON object, nothing else. No explanatory text before or after.

Response format (NORMAL evaluation):
{
  "agreement": 75,
  "confidence": 85,
  "reasoning": "Brief explanation (max ${explanationLength} words)"
}

Response format (REFUSAL):
{
  "refusalReason": "Unclear",
  "reasoning": "Brief explanation of why you're refusing (max ${explanationLength} words)"
}

Your response must be valid JSON only.`;

  let rawContent: string | undefined;
  let rawThinking: string | undefined;
  let rawTokenUsage: TokenUsage | undefined;

  try {
    // Only use response_format for models that support it well
    // Gemini models struggle with this parameter and produce malformed JSON
    const supportsResponseFormat = model.startsWith('openai/');

    // Add unique identifiers to prevent caching and ensure independent runs
    // Use timestamp + random string to guarantee uniqueness across parallel calls
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const uniquePrompt = `${prompt}\n\n<!-- Evaluation ID: ${uniqueId} -->`;

    // Normalize temperature from user-facing 0-1 scale to provider-specific range
    const userTemperature = input.temperature ?? 0.7; // Default 0.7 (balanced)
    const actualTemperature = normalizeTemperature(userTemperature, model);

    const completion = await client.chat.completions.create(
      {
        model,
        messages: [
          {
            role: 'user',
            content: uniquePrompt,
          },
        ],
        max_tokens: 1000, // High limit for GPT-5 Responses API (uses tokens for reasoning FIRST, then content)
        temperature: actualTemperature, // Normalized per provider (Anthropic 0-1, others 0-2)
        // Force JSON output for models like GPT-5 that use Responses API
        ...(supportsResponseFormat ? { response_format: { type: 'json_object' } } : {}),
      },
      {
        // Pass headers to disable caching (via request options)
        // Helicone caching: Use unique seed per request to prevent cache hits
        headers: {
          'X-No-Cache': 'true',
          'Helicone-Cache-Enabled': 'false',
          'Helicone-Cache-Seed': uniqueId, // Unique seed ensures no cache reuse
        } as Record<string, string>,
      }
    );

    const message = completion.choices[0]?.message as MessageWithReasoning | undefined;
    rawContent = message?.content || undefined;
    // Capture reasoning from both GPT-5 (reasoning) and o1/o3 (reasoning_content)
    rawThinking = message?.reasoning || message?.reasoning_content || undefined;
    rawTokenUsage = completion.usage as TokenUsage | undefined;

    if (!rawContent) {
      throw createEvaluationError('No response from model', {
        rawResponse: rawContent,
        tokenUsage: rawTokenUsage,
      });
    }

    // Capture token usage
    const tokenUsage = rawTokenUsage ? {
      promptTokens: rawTokenUsage.prompt_tokens,
      completionTokens: rawTokenUsage.completion_tokens,
      totalTokens: rawTokenUsage.total_tokens,
    } : undefined;

    // Parse JSON response - handle markdown code blocks and extra text
    let parsed: unknown;
    try {
      parsed = extractAndParseJSON(rawContent);
    } catch (parseError: unknown) {
      // Don't expose JSON parsing details to end users
      throw createEvaluationError(
        'Failed to produce valid JSON',
        {
          rawResponse: rawContent,
          attemptedParse: rawContent.trim(),
        }
      );
    }

    // Validate parsed response with Zod
    const validationResult = parsedResponseSchema.safeParse(parsed);
    if (!validationResult.success) {
      throw createEvaluationError(
        'Invalid response format',
        {
          rawResponse: rawContent,
          parsedData: parsed,
        }
      );
    }

    const validatedData = validationResult.data;

    // Check if model refused to evaluate
    if ('refusalReason' in validatedData) {
      throw createEvaluationError(
        `Model refused to evaluate: ${validatedData.reasoning || validatedData.refusalReason}`,
        {
          rawResponse: rawContent,
          refusalReason: validatedData.refusalReason,
        }
      );
    }

    // Extract and truncate reasoning to max word count
    const maxExplanationWords = input.explanationLength || DEFAULT_EXPLANATION_LENGTH;
    const words = validatedData.reasoning.trim().split(/\s+/).filter(w => w.length > 0);
    const reasoning = words.slice(0, maxExplanationWords).join(' ');

    return {
      model,
      provider: extractProvider(model),
      agreement: validatedData.agreement,
      confidence: validatedData.confidence,
      agreementLevel: getAgreementLabel(validatedData.agreement),
      reasoning,
      rawResponse: rawContent, // Full raw response
      thinkingText: rawThinking, // Extended thinking (o1/o3)
      tokenUsage,
    };
  } catch (error: unknown) {
    const err = error as EvaluationError;
    context.logger.error(`[ClaimEvaluator] Error with ${model}:`, err.message);

    // Attach sanitized raw response to error for caller to extract (if not already attached)
    if (!err.rawResponse && rawContent) {
      err.rawResponse = sanitizeResponse(rawContent);
    }
    err.thinkingText = rawThinking;
    err.tokenUsage = rawTokenUsage;

    throw err; // Let caller handle failure
  }
}


export class ClaimEvaluatorTool extends Tool<ClaimEvaluatorInput, ClaimEvaluatorOutput> {
  config = claimEvaluatorConfig;
  inputSchema = inputSchema;
  outputSchema = outputSchema;

  async execute(
    input: ClaimEvaluatorInput,
    context: ToolContext
  ): Promise<ClaimEvaluatorOutput> {
    const models = input.models || DEFAULT_MODELS;
    const runs = input.runs || 1;

    context.logger.info(
      `[ClaimEvaluator] Evaluating claim with ${models.length} models, ${runs} run(s) each`
    );

    try {
      const client = createOpenRouterClient();

      // Create array of all model-run combinations
      // Each model will be run 'runs' times independently
      const modelRuns: Array<{ model: string; runIndex: number }> = [];
      for (let i = 0; i < runs; i++) {
        models.forEach(model => {
          modelRuns.push({ model, runIndex: i });
        });
      }

      // Evaluate with all models in parallel (across all runs)
      const results = await Promise.allSettled(
        modelRuns.map(({ model }) => evaluateWithModel(client, input, model, context))
      );

      // Filter out failures and extract successful results
      const successful = results
        .filter((r): r is PromiseFulfilledResult<ModelEvaluation> => r.status === 'fulfilled')
        .map(r => r.value);

      // Capture failed evaluations with details
      const failed: FailedEvaluation[] = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => {
          const resultIndex = results.indexOf(r);
          const modelId = modelRuns[resultIndex].model;
          const error = r.reason;

          // Try to extract useful error information
          let errorMessage = error?.message || String(error);
          let rawResponse: string | undefined;
          let errorDetails: string | undefined;

          // Extract raw response from error if available (we attached it in evaluateWithModel)
          if (error?.rawResponse) {
            rawResponse = error.rawResponse;
          }

          // Capture thinking text if available (for reasoning models like o1/o3)
          if (error?.thinkingText) {
            errorDetails = `Thinking: ${error.thinkingText}`;
          }

          // Add parsed data if available (for validation errors) - sanitized for end users
          if (error?.parsedData) {
            errorDetails = `Parsed data: ${JSON.stringify(error.parsedData, null, 2)}${errorDetails ? '\n\n' + errorDetails : ''}`;
          }

          // Add attempted parse if available (for JSON parse errors) - already sanitized
          if (error?.attemptedParse && error.attemptedParse !== rawResponse) {
            errorDetails = `Attempted to parse: ${error.attemptedParse}${errorDetails ? '\n\n' + errorDetails : ''}`;
          }

          // Note: Stack traces are intentionally excluded from errorDetails for security
          // They are logged server-side but not exposed to clients

          // Use explicit refusalReason from error if provided, otherwise detect from error message
          const refusalReason = error?.refusalReason || detectRefusalReason(error, rawResponse);

          return {
            model: modelId,
            provider: extractProvider(modelId),
            error: errorMessage,
            refusalReason,
            rawResponse,
            errorDetails,
          };
        });

      context.logger.info(
        `[ClaimEvaluator] ${successful.length}/${modelRuns.length} evaluations succeeded, ${failed.length} failed`
      );

      return {
        results: successful,
        failed: failed,
      };
    } catch (error) {
      context.logger.error('[ClaimEvaluator] Error:', error);
      throw error;
    }
  }

  override async beforeExecute(
    input: ClaimEvaluatorInput,
    context: ToolContext
  ): Promise<void> {
    const modelCount = input.models?.length || DEFAULT_MODELS.length;
    const runs = input.runs || 1;
    context.logger.info(
      `[ClaimEvaluator] Starting evaluation with ${modelCount} models, ${runs} run(s) each (${modelCount * runs} total evaluations)`
    );
  }

  override async afterExecute(
    output: ClaimEvaluatorOutput,
    context: ToolContext
  ): Promise<void> {
    context.logger.info(
      `[ClaimEvaluator] Completed with ${output.results.length} successful evaluations`
    );
  }
}

// Export singleton instance
export const claimEvaluatorTool = new ClaimEvaluatorTool();
export default claimEvaluatorTool;
