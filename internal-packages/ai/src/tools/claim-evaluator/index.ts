import { z } from "zod";
import { Tool, ToolContext } from "../base/Tool";
import { claimEvaluatorConfig } from "../configs";
import { createOpenRouterClient, OPENROUTER_MODELS } from "../../utils/openrouter";

// Refusal reason types (matches OpinionSpectrum2D)
export type RefusalReason =
  | "Safety"
  | "Policy"
  | "MissingData"
  | "Unclear"
  | "Error";

// Input/Output types
export interface ClaimEvaluatorInput {
  claim: string;
  context?: string;
  models?: string[];
  runs?: number; // Number of times to run each model (1-5, default 1)
  reasoningLength?: number; // Max length of reasoning text (10-100 chars, default 15)
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
  consensus: {
    mean: number;
    stdDev: number;
    range: { min: number; max: number };
  };
}

// Constants
const DEFAULT_REASONING_LENGTH = 15; // Default max length for reasoning text in characters

// Top 6 models for claim evaluation (matches UI checkbox defaults)
const DEFAULT_MODELS = [
  OPENROUTER_MODELS.CLAUDE_SONNET_4_5,         // Claude 4.5 Sonnet (Latest)
  OPENROUTER_MODELS.CLAUDE_SONNET_4,           // Claude Sonnet 4
  OPENROUTER_MODELS.GEMINI_2_5_PRO,            // Gemini 2.5 Pro
  OPENROUTER_MODELS.GPT_5,                     // GPT-5
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
  reasoningLength: z
    .coerce.number()
    .int()
    .min(10)
    .max(1000)
    .optional()
    .describe("Maximum length of reasoning text in characters (10-1000, default 15)"),
  temperature: z
    .coerce.number()
    .min(0.0)
    .max(2.0)
    .optional()
    .describe("Temperature for model responses - lower is more deterministic (0.0-2.0, default 1.0)"),
});

// Output schema
const outputSchema = z.object({
  results: z.array(
    z.object({
      model: z.string().describe("Model identifier"),
      provider: z.string().describe("Provider name (e.g., 'anthropic', 'openai')"),
      agreement: z.number().min(0).max(100).describe("Agreement score 0-100"),
      confidence: z.number().min(0).max(100).describe("Confidence score 0-100"),
      reasoning: z.string().min(10).max(1000).describe("Brief reasoning (10-1000 chars, configurable)"),
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
  consensus: z.object({
    mean: z.number().describe("Mean agreement across all models"),
    stdDev: z.number().describe("Standard deviation of agreement scores"),
    range: z.object({
      min: z.number(),
      max: z.number(),
    }),
  }),
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
 * Create a standardized evaluation error with sanitized context
 */
function createEvaluationError(
  message: string,
  context: {
    rawResponse?: string;
    parsedData?: unknown;
    attemptedParse?: string;
    tokenUsage?: any;
    refusalReason?: RefusalReason;
  }
): Error {
  const err = new Error(message);

  // Attach sanitized context
  if (context.rawResponse) {
    (err as any).rawResponse = sanitizeResponse(context.rawResponse);
  }
  if (context.parsedData) {
    (err as any).parsedData = context.parsedData;
  }
  if (context.attemptedParse) {
    (err as any).attemptedParse = sanitizeResponse(context.attemptedParse);
  }
  if (context.tokenUsage) {
    (err as any).tokenUsage = context.tokenUsage;
  }
  if (context.refusalReason) {
    (err as any).refusalReason = context.refusalReason;
  }

  return err;
}

/**
 * Evaluate a claim with a single model via OpenRouter
 */
async function evaluateWithModel(
  client: ReturnType<typeof createOpenRouterClient>,
  input: ClaimEvaluatorInput,
  model: string,
  context: ToolContext
): Promise<ModelEvaluation> {
  context.logger.info(`[ClaimEvaluator] Evaluating with ${model}`);

  // For runs > 1, add slight prompt variation to encourage independent thinking
  const runNote = (input.runs && input.runs > 1)
    ? '\n\nNote: You are one of multiple independent evaluators. Provide your honest assessment without trying to match others.'
    : '';

  const reasoningLength = input.reasoningLength || DEFAULT_REASONING_LENGTH;

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
  "reasoning": "Brief explanation (max ${reasoningLength} chars)"
}

Response format (REFUSAL):
{
  "refusalReason": "Unclear",
  "reasoning": "Brief explanation of why you're refusing (max ${reasoningLength} chars)"
}

Your response must be valid JSON only.`;

  let rawContent: string | undefined;
  let rawThinking: string | undefined;
  let rawTokenUsage: any;

  try {
    // Only use response_format for models that support it well
    // Gemini models struggle with this parameter and produce malformed JSON
    const supportsResponseFormat = model.startsWith('openai/');

    // Add unique identifiers to prevent caching and ensure independent runs
    // Use timestamp + random string to guarantee uniqueness across parallel calls
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const uniquePrompt = `${prompt}\n\n<!-- Evaluation ID: ${uniqueId} -->`;

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
        temperature: input.temperature ?? 1.0, // Configurable temperature (default 1.0 for variation between runs)
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
        } as any,
      }
    );

    const message = completion.choices[0]?.message;
    rawContent = message?.content || undefined;
    // Capture reasoning from both GPT-5 (reasoning) and o1/o3 (reasoning_content)
    rawThinking = (message as any)?.reasoning || (message as any)?.reasoning_content || undefined;
    rawTokenUsage = completion.usage;

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

    let parsed;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (parseError: any) {
      throw createEvaluationError(
        `JSON parse error: ${parseError.message}`,
        {
          rawResponse: rawContent,
          attemptedParse: jsonContent,
        }
      );
    }

    // Check if model refused to evaluate
    if (parsed.refusalReason) {
      const validRefusalReasons: RefusalReason[] = ['Safety', 'Policy', 'MissingData', 'Unclear', 'Error'];
      const refusalReason: RefusalReason = validRefusalReasons.includes(parsed.refusalReason)
        ? parsed.refusalReason
        : 'Unclear';

      throw createEvaluationError(
        `Model refused to evaluate: ${parsed.reasoning || refusalReason}`,
        {
          rawResponse: rawContent,
          refusalReason,
        }
      );
    }

    const agreement = Number(parsed.agreement);
    const confidence = Number(parsed.confidence);
    const maxReasoningLength = input.reasoningLength || DEFAULT_REASONING_LENGTH;
    const reasoning = String(parsed.reasoning || '').substring(0, maxReasoningLength);

    if (isNaN(agreement) || agreement < 0 || agreement > 100) {
      throw createEvaluationError(`Invalid agreement score: ${agreement}`, {
        rawResponse: rawContent,
        parsedData: parsed,
      });
    }

    if (isNaN(confidence) || confidence < 0 || confidence > 100) {
      throw createEvaluationError(`Invalid confidence score: ${confidence}`, {
        rawResponse: rawContent,
        parsedData: parsed,
      });
    }

    if (reasoning.length < 10) {
      throw createEvaluationError('Reasoning too short (must be at least 10 chars)', {
        rawResponse: rawContent,
        parsedData: parsed,
      });
    }

    return {
      model,
      provider: extractProvider(model),
      agreement,
      confidence,
      agreementLevel: getAgreementLabel(agreement),
      reasoning,
      rawResponse: rawContent, // Full raw response
      thinkingText: rawThinking, // Extended thinking (o1/o3)
      tokenUsage,
    };
  } catch (error: any) {
    context.logger.error(`[ClaimEvaluator] Error with ${model}:`, error.message);

    // Attach sanitized raw response to error for caller to extract (if not already attached)
    if (!error.rawResponse && rawContent) {
      error.rawResponse = sanitizeResponse(rawContent);
    }
    error.thinkingText = rawThinking;
    error.tokenUsage = rawTokenUsage;

    throw error; // Let caller handle failure
  }
}

/**
 * Calculate consensus statistics
 */
function calculateConsensus(results: ModelEvaluation[]) {
  if (results.length === 0) {
    return {
      mean: 0,
      stdDev: 0,
      range: { min: 0, max: 0 },
    };
  }

  const scores = results.map(r => r.agreement);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;

  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  return {
    mean: Math.round(mean * 10) / 10, // Round to 1 decimal
    stdDev: Math.round(stdDev * 10) / 10,
    range: {
      min: Math.min(...scores),
      max: Math.max(...scores),
    },
  };
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

          // Also capture thinking text if it was a thinking model
          if (error?.thinkingText) {
            errorDetails = `Thinking: ${error.thinkingText}\n\n${error?.stack || ''}`;
          } else if (error?.stack) {
            errorDetails = error.stack;
          }

          // Add parsed data if available (for validation errors)
          if (error?.parsedData) {
            errorDetails = `Parsed data: ${JSON.stringify(error.parsedData, null, 2)}\n\n${errorDetails || ''}`;
          }

          // Add attempted parse if available (for JSON parse errors)
          if (error?.attemptedParse && error.attemptedParse !== rawResponse) {
            errorDetails = `Attempted to parse: ${error.attemptedParse}\n\n${errorDetails || ''}`;
          }

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

      const consensus = calculateConsensus(successful);

      return {
        results: successful,
        failed: failed,
        consensus,
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
      `[ClaimEvaluator] Completed. Mean: ${output.consensus.mean}%, StdDev: ${output.consensus.stdDev}`
    );
  }
}

// Export singleton instance
export const claimEvaluatorTool = new ClaimEvaluatorTool();
export default claimEvaluatorTool;
