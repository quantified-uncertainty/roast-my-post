import { z } from 'zod';
import { Tool } from '../base/Tool';
import { ToolContext } from '../base/Tool';
import { generateForecastWithAggregation } from './generator';
import { RichLLMInteraction } from '@/types/llm';
import { llmInteractionSchema } from '@/types/llmSchema';

// Define types explicitly to avoid inference issues with defaults
export interface ForecasterInput {
  question: string;
  context?: string;
  numForecasts?: number;
  usePerplexity?: boolean;
}

export interface ForecasterOutput {
  probability: number;
  description: string;
  consensus: 'low' | 'medium' | 'high';
  individualForecasts: Array<{
    probability: number;
    reasoning: string;
  }>;
  statistics: {
    mean: number;
    stdDev: number;
  };
  llmInteractions: RichLLMInteraction[];
  cost?: {
    totalUSD: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    model: string;
  };
}

// Simplified input schema
const inputSchema = z.object({
  question: z.string().min(1).max(500).describe('The question to forecast'),
  context: z.string().max(1000).optional().describe('Additional context for the forecast'),
  numForecasts: z.number().min(1).max(20).optional().default(6).describe('Number of independent forecasts to generate'),
  usePerplexity: z.boolean().optional().default(false).describe('Whether to use Perplexity for research')
}) satisfies z.ZodType<ForecasterInput>;

// Simplified output schema
const outputSchema = z.object({
  probability: z.number().min(0).max(100).describe('The aggregated probability forecast (0-100)'),
  description: z.string().describe('A description of the forecast and reasoning'),
  consensus: z.enum(['low', 'medium', 'high']).describe('Consensus level based on forecast agreement'),
  individualForecasts: z.array(z.object({
    probability: z.number(),
    reasoning: z.string()
  })).describe('Individual forecasts that were aggregated'),
  statistics: z.object({
    mean: z.number(),
    stdDev: z.number()
  }).describe('Statistical summary of the forecasts'),
  llmInteractions: z.array(llmInteractionSchema).describe('LLM interactions for monitoring and debugging')
}) satisfies z.ZodType<ForecasterOutput>;

export class ForecasterTool extends Tool<ForecasterInput, ForecasterOutput> {
  config = {
    id: 'forecaster',
    name: 'Simple Forecaster',
    description: 'Generate probability forecasts using multiple independent Claude analyses',
    version: '1.0.0',
    category: 'analysis' as const,
    costEstimate: '~$0.05 per forecast (6 Claude calls)',
    path: '/tools/forecaster-simple',
    status: 'experimental' as const
  };
  
  inputSchema = inputSchema;
  outputSchema = outputSchema;
  
  async execute(input: ForecasterInput, context: ToolContext): Promise<ForecasterOutput> {
    context.logger.info(`[ForecasterTool] Generating forecast for: ${input.question}`);
    
    try {
      const result = await generateForecastWithAggregation({
        question: input.question,
        context: input.context,
        numForecasts: input.numForecasts ?? 6,
        usePerplexity: input.usePerplexity ?? false
      });
      
      return {
        probability: result.forecast.probability,
        description: result.forecast.description,
        consensus: result.forecast.consensus,
        individualForecasts: result.individual_forecasts.map(f => ({
          probability: f.probability,
          reasoning: f.reasoning
        })),
        statistics: {
          mean: result.statistics.mean,
          stdDev: result.statistics.std_dev
        },
        llmInteractions: result.llmInteractions,
        cost: result.cost
      };
    } catch (error) {
      context.logger.error('[ForecasterTool] Error generating forecast:', error);
      throw error;
    }
  }
  
  override async beforeExecute(input: ForecasterInput, context: ToolContext): Promise<void> {
    context.logger.info(`[ForecasterTool] Starting forecast with ${input.numForecasts ?? 6} samples`);
  }
  
  override async afterExecute(output: ForecasterOutput, context: ToolContext): Promise<void> {
    context.logger.info(`[ForecasterTool] Completed forecast: ${output.probability}% (${output.consensus} consensus)`);
  }
}

// Export singleton instance
export const forecasterTool = new ForecasterTool();
export default forecasterTool;