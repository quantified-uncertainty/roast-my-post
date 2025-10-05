import { z } from "zod";
import { Tool, ToolContext } from "../base/Tool";
import { claimEvaluatorConfig } from "../configs";
import { createOpenRouterClient, OPENROUTER_MODELS } from "../../utils/openrouter";

// Input/Output types
export interface ClaimEvaluatorInput {
  claim: string;
  models?: string[];
}

export interface ModelEvaluation {
  model: string;
  provider: string;
  agreement: number; // 0-100
  agreementLevel?: string; // Human-readable label (e.g., "Strongly Disagree")
  reasoning: string; // 10-30 characters
}

export interface ClaimEvaluatorOutput {
  results: ModelEvaluation[];
  consensus: {
    mean: number;
    stdDev: number;
    range: { min: number; max: number };
  };
}

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
  models: z
    .array(z.string())
    .optional()
    .describe("List of OpenRouter model IDs to use (defaults to Haiku, Sonnet, GPT-4, Grok)"),
}) satisfies z.ZodType<ClaimEvaluatorInput>;

// Output schema
const outputSchema = z.object({
  results: z.array(
    z.object({
      model: z.string().describe("Model identifier"),
      provider: z.string().describe("Provider name (e.g., 'anthropic', 'openai')"),
      agreement: z.number().min(0).max(100).describe("Agreement score 0-100"),
      reasoning: z.string().min(10).max(30).describe("Brief reasoning (10-30 chars)"),
    })
  ),
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
 * Evaluate a claim with a single model via OpenRouter
 */
async function evaluateWithModel(
  client: ReturnType<typeof createOpenRouterClient>,
  claim: string,
  model: string,
  context: ToolContext
): Promise<ModelEvaluation> {
  context.logger.info(`[ClaimEvaluator] Evaluating with ${model}`);

  const prompt = `You are evaluating the following claim:

"${claim}"

Rate your agreement with this claim on a scale from 0 to 100, where:
- 0 = Completely disagree / certainly false
- 50 = Uncertain / insufficient information
- 100 = Completely agree / certainly true

Respond with a JSON object containing:
1. "agreement": A number from 0 to 100
2. "reasoning": A brief explanation (10-30 characters, like a tag or short phrase)

Example response format:
{
  "agreement": 75,
  "reasoning": "Strong GDP indicators"
}`;

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from model');
    }

    // Parse JSON response - handle markdown code blocks
    let jsonContent = content.trim();

    // Remove markdown code blocks if present
    if (jsonContent.startsWith('```')) {
      // Extract content between ``` markers
      const match = jsonContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (match) {
        jsonContent = match[1].trim();
      }
    }

    const parsed = JSON.parse(jsonContent);
    const agreement = Number(parsed.agreement);
    const reasoning = String(parsed.reasoning || '').substring(0, 30);

    if (isNaN(agreement) || agreement < 0 || agreement > 100) {
      throw new Error(`Invalid agreement score: ${agreement}`);
    }

    if (reasoning.length < 10) {
      throw new Error('Reasoning too short (must be 10-30 chars)');
    }

    return {
      model,
      provider: extractProvider(model),
      agreement,
      agreementLevel: getAgreementLabel(agreement),
      reasoning,
    };
  } catch (error: any) {
    context.logger.error(`[ClaimEvaluator] Error with ${model}:`, error.message);
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

    context.logger.info(
      `[ClaimEvaluator] Evaluating claim with ${models.length} models`
    );

    try {
      const client = createOpenRouterClient();

      // Evaluate with all models in parallel
      const results = await Promise.allSettled(
        models.map(model => evaluateWithModel(client, input.claim, model, context))
      );

      // Filter out failures and extract successful results
      const successful = results
        .filter((r): r is PromiseFulfilledResult<ModelEvaluation> => r.status === 'fulfilled')
        .map(r => r.value);

      if (successful.length === 0) {
        throw new Error('All model evaluations failed');
      }

      context.logger.info(
        `[ClaimEvaluator] ${successful.length}/${models.length} models succeeded`
      );

      const consensus = calculateConsensus(successful);

      return {
        results: successful,
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
    context.logger.info(
      `[ClaimEvaluator] Starting evaluation with ${modelCount} models`
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
