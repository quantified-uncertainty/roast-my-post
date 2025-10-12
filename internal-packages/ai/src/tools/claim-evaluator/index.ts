import { z } from "zod";
import { Tool, ToolContext } from "../base/Tool";
import { claimEvaluatorConfig } from "../configs";
import { createOpenRouterClient, OPENROUTER_MODELS, normalizeTemperature } from "../../utils/openrouter";
import { HeliconeSessionManager, setGlobalSessionManager } from "../../helicone/simpleSessionManager";

// Import from new modules
import { generateClaimEvaluatorPrompt, DEFAULT_EXPLANATION_LENGTH } from "./prompt";
import {
  RefusalReason,
  TokenUsage,
  MessageWithReasoning,
  EvaluationError,
  ClaimEvaluatorInput,
  ModelEvaluation,
  FailedEvaluation,
  EvaluationResult,
  ClaimEvaluatorOutput,
  extractProvider,
  getAgreementLabel,
  sanitizeResponse,
  detectRefusalReason,
  extractAndParseJSON,
  createEvaluationError,
} from "./utils";

// Re-export everything for backwards compatibility
export * from "./utils";
export { generateClaimEvaluatorPrompt, DEFAULT_EXPLANATION_LENGTH } from "./prompt";
export { analyzeClaimEvaluation, type AnalyzeClaimEvaluationInput, type AnalyzeClaimEvaluationOutput } from "./analysis";

// Default models for claim evaluation
const DEFAULT_MODELS = [
  OPENROUTER_MODELS.CLAUDE_SONNET_4_5,         // Claude Sonnet 4.5 (Latest)
  OPENROUTER_MODELS.GPT_5_MINI,                // GPT-5 Mini
  OPENROUTER_MODELS.DEEPSEEK_CHAT_V3_1,        // DeepSeek Chat V3.1
  OPENROUTER_MODELS.GROK_4,                    // Grok 4
];

// Valid model IDs (all available OpenRouter models)
const VALID_MODEL_IDS = Object.values(OPENROUTER_MODELS);

// Input schema
const inputSchema = z.object({
  claim: z.string().min(1).max(1000).describe("The claim to evaluate"),
  context: z
    .string()
    .max(30000)
    .optional()
    .describe("Additional context about the claim (when/where made, background, domain knowledge, constraints)"),
  models: z
    .array(z.enum(VALID_MODEL_IDS as [string, ...string[]]))
    .optional()
    .describe("List of OpenRouter model IDs to use (defaults to top reasoning models)"),
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

// Successful response details
const successfulResponseSchema = z.object({
  agreement: z.number().min(0).max(100).describe("Agreement score 0-100"),
  confidence: z.number().min(0).max(100).describe("Confidence score 0-100"),
  reasoning: z.string().min(1).max(2000).describe("Brief reasoning (configurable by explanationLength in words)"),
});

// Failed response details
const failedResponseSchema = z.object({
  error: z.string().describe("Error message"),
  refusalReason: z.enum(["Safety", "Policy", "MissingData", "Unclear", "Error"]).describe("Categorized refusal/error reason"),
  errorDetails: z.string().optional().describe("Additional error context"),
});

// Evaluation result schema
const evaluationResultSchema = z.object({
  model: z.string().describe("Model identifier"),
  provider: z.string().describe("Provider name (e.g., 'anthropic', 'openai')"),
  hasError: z.boolean().describe("True if evaluation failed, false if successful"),
  responseTimeMs: z.number().optional().describe("Time taken for LLM to respond in milliseconds"),
  rawResponse: z.string().optional().describe("Full raw response from model (or error response)"),
  thinkingText: z.string().optional().describe("Extended thinking/reasoning (for o1/o3 models)"),
  tokenUsage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number(),
  }).optional().describe("Token usage statistics"),
  successfulResponse: successfulResponseSchema.optional().describe("Present when hasError is false"),
  failedResponse: failedResponseSchema.optional().describe("Present when hasError is true"),
}).refine(
  (data) => data.hasError === !!data.failedResponse && !data.hasError === !!data.successfulResponse,
  { message: "hasError must match presence of response fields: hasError=true requires failedResponse, hasError=false requires successfulResponse" }
);

// Output schema
const outputSchema = z.object({
  evaluations: z.array(evaluationResultSchema).describe("Array of all model evaluations (both successful and failed)"),
  summary: z.object({
    mean: z.number().describe("Mean agreement score across all successful evaluations"),
  }).optional().describe("Summary statistics of evaluations"),
}) satisfies z.ZodType<ClaimEvaluatorOutput>;

/**
 * Evaluate a claim with a single model via OpenRouter with timeout
 */
async function evaluateWithModel(
  client: ReturnType<typeof createOpenRouterClient>,
  input: ClaimEvaluatorInput,
  model: string,
  context: ToolContext,
  sessionManager?: HeliconeSessionManager
): Promise<EvaluationResult> {
  context.logger.info(`[ClaimEvaluator] Evaluating with ${model}`);

  // Create timeout promise (configurable via env, default 120 seconds)
  const TIMEOUT_MS = Number(process.env.MODEL_EVAL_TIMEOUT_MS) || 120000;
  let timeoutHandle: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      context.logger.warn(`[ClaimEvaluator] Timeout for ${model} after ${TIMEOUT_MS / 1000}s`);
      reject(createEvaluationError(`Model evaluation timed out after ${TIMEOUT_MS / 1000}s`, {
        refusalReason: 'Error',
      }));
    }, TIMEOUT_MS);
  });

  // Extract provider and model name for tracking
  const provider = extractProvider(model);
  const modelName = model.split('/').pop() || model;

  // Wrap evaluation in session tracking if available
  const runEvaluation = async () => {
    if (sessionManager) {
      return sessionManager.withPath(
        `/models/${provider}`,
        { provider, model: modelName },
        async () => {
          return Promise.race([
            evaluateWithModelImpl(client, input, model, context),
            timeoutPromise,
          ]);
        }
      );
    } else {
      return Promise.race([
        evaluateWithModelImpl(client, input, model, context),
        timeoutPromise,
      ]);
    }
  };

  try {
    return await runEvaluation();
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
): Promise<EvaluationResult> {

  // Generate prompt using the improved version from prompt.ts
  const prompt = generateClaimEvaluatorPrompt(input);

  let rawContent: string | undefined;
  let rawThinking: string | undefined;
  let rawTokenUsage: TokenUsage | undefined;
  let responseTimeMs: number | undefined;

  try {
    // Add unique identifiers to prevent caching and ensure independent runs
    // Use timestamp + random string to guarantee uniqueness across parallel calls
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const uniquePrompt = `${prompt}\n\n<!-- Evaluation ID: ${uniqueId} -->`;

    // Normalize temperature from user-facing 0-1 scale to provider-specific range
    const userTemperature = input.temperature ?? 0.7; // Default 0.7 (balanced)
    const actualTemperature = normalizeTemperature(userTemperature, model);

    // Configure max_tokens based on model capabilities
    // Gemini 2.5 models with thinking mode need significantly more tokens
    // (thinking tokens + actual response tokens)
    const isGemini = model.startsWith('google/gemini');
    const maxTokens = isGemini ? 8000 : 1000;

    // Track response time
    const startTime = Date.now();
    const completion = await client.chat.completions.create(
      {
        model,
        messages: [
          {
            role: 'user',
            content: uniquePrompt,
          },
        ],
        max_tokens: maxTokens,
        temperature: actualTemperature, // Normalized per provider (Anthropic 0-1, others 0-2)
        // Use OpenRouter's standard response_format parameter for JSON mode
        // Works across all providers (OpenAI, Gemini, etc.) through OpenRouter
        response_format: { type: 'json_object' },
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
    responseTimeMs = Date.now() - startTime;

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
        'Model returned invalid JSON',
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
      hasError: false,
      model,
      provider: extractProvider(model),
      responseTimeMs, // Time taken for LLM to respond
      rawResponse: rawContent, // Full raw response
      thinkingText: rawThinking, // Extended thinking (o1/o3)
      tokenUsage,
      successfulResponse: {
        agreement: validatedData.agreement,
        confidence: validatedData.confidence,
        agreementLevel: getAgreementLabel(validatedData.agreement),
        reasoning,
      },
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

    // Cost protection: limit total evaluations to prevent excessive API usage
    const MAX_EVALUATIONS = 20;
    const totalEvaluations = models.length * runs;
    if (totalEvaluations > MAX_EVALUATIONS) {
      throw new Error(
        `Too many evaluations requested: ${totalEvaluations} (max ${MAX_EVALUATIONS}). ` +
        `Reduce models (${models.length}) or runs (${runs}).`
      );
    }

    context.logger.info(
      `[ClaimEvaluator] Evaluating claim with ${models.length} models, ${runs} run(s) each`
    );

    // Create a unique session for this claim evaluation run
    const sessionId = `claim-eval-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const sessionProperties: Record<string, string> = {
      tool: 'claim-evaluator',
    };

    // Create session name with claim prefix (first 100 chars)
    const claimPrefix = input.claim.slice(0, 100);
    const sessionName = `Claim Evaluator: ${claimPrefix}${input.claim.length > 100 ? '...' : ''}`;

    const sessionManager = HeliconeSessionManager.forJob(
      sessionId,
      sessionName,
      sessionProperties,
      context.userId // Pass userId for Helicone-User-Id header
    );

    // Set as global session for this execution
    const previousManager = undefined; // Will be restored in finally block
    setGlobalSessionManager(sessionManager);

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
        modelRuns.map(({ model }) => evaluateWithModel(client, input, model, context, sessionManager))
      );

      // Process results, maintaining index correspondence with modelRuns
      const evaluations: EvaluationResult[] = [];

      results.forEach((r, i) => {
        const modelId = modelRuns[i].model;

        if (r.status === 'fulfilled') {
          evaluations.push(r.value);
        } else {
          // r.status === 'rejected'
          const error = r.reason;

          // Try to extract useful error information
          let errorMessage = error?.message || String(error);

          // Enhance OpenRouter privacy policy errors with helpful instructions
          if (/no endpoints found.*data policy/i.test(errorMessage)) {
            errorMessage = `${errorMessage}. To use free models, enable "Model Training" at https://openrouter.ai/settings/privacy. Note: Free models may use your data for training.`;
          }

          let rawResponse: string | undefined;
          let errorDetails: string | undefined;
          let responseTimeMs: number | undefined;
          let thinkingText: string | undefined;
          let tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;

          // Extract raw response from error if available (we attached it in evaluateWithModel)
          if (error?.rawResponse) {
            rawResponse = error.rawResponse;
          }

          // Capture thinking text if available (for reasoning models like o1/o3)
          if (error?.thinkingText) {
            thinkingText = error.thinkingText;
            errorDetails = `Thinking: ${sanitizeResponse(error.thinkingText)}`;
          }

          // Capture token usage if available
          if (error?.tokenUsage) {
            tokenUsage = {
              promptTokens: error.tokenUsage.prompt_tokens,
              completionTokens: error.tokenUsage.completion_tokens,
              totalTokens: error.tokenUsage.total_tokens,
            };
          }

          // Add parsed data if available (for validation errors) - sanitized for end users
          if (error?.parsedData) {
            const parsedStr = JSON.stringify(error.parsedData, null, 2);
            errorDetails = `Parsed data: ${sanitizeResponse(parsedStr)}${errorDetails ? '\n\n' + errorDetails : ''}`;
          }

          // Add attempted parse if available (for JSON parse errors) - already sanitized
          if (error?.attemptedParse && error.attemptedParse !== rawResponse) {
            errorDetails = `Attempted to parse: ${error.attemptedParse}${errorDetails ? '\n\n' + errorDetails : ''}`;
          }

          // Note: Stack traces are intentionally excluded from errorDetails for security
          // They are logged server-side but not exposed to clients

          // Use explicit refusalReason from error if provided, otherwise detect from error message
          const refusalReason = error?.refusalReason || detectRefusalReason(error, rawResponse);

          evaluations.push({
            hasError: true,
            model: modelId,
            provider: extractProvider(modelId),
            responseTimeMs,
            rawResponse,
            thinkingText,
            tokenUsage,
            failedResponse: {
              error: errorMessage,
              refusalReason,
              errorDetails,
            },
          });
        }
      });

      const successCount = evaluations.filter(e => !e.hasError).length;
      const failedCount = evaluations.filter(e => e.hasError).length;

      context.logger.info(
        `[ClaimEvaluator] ${successCount}/${modelRuns.length} evaluations succeeded, ${failedCount} failed`
      );

      // Calculate summary statistics from successful evaluations
      const successfulEvaluations = evaluations.filter(e => !e.hasError && e.successfulResponse);
      let summary: { mean: number } | undefined;

      if (successfulEvaluations.length > 0) {
        const agreements = successfulEvaluations.map(e => e.successfulResponse!.agreement);
        const mean = agreements.reduce((sum, val) => sum + val, 0) / agreements.length;
        summary = { mean };
      }

      return {
        evaluations,
        summary,
      };
    } catch (error) {
      context.logger.error('[ClaimEvaluator] Error:', error);
      throw error;
    } finally {
      // Restore previous session manager
      setGlobalSessionManager(previousManager);
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
    const successCount = output.evaluations.filter(e => !e.hasError).length;
    context.logger.info(
      `[ClaimEvaluator] Completed with ${successCount} successful evaluations`
    );
  }
}

// Export singleton instance
export const claimEvaluatorTool = new ClaimEvaluatorTool();
export default claimEvaluatorTool;
