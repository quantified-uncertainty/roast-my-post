import { z } from 'zod';
import { Tool, ToolContext } from '../base/Tool';
import { PluginLLMInteraction } from '@/types/llm';
import { llmInteractionSchema } from '@/types/llmSchema';
import { callClaudeWithTool } from '@/lib/claude/wrapper';

// Define types for the tool
export interface ExtractedForecast {
  text: string;
  probability?: number;
  timeframe?: string;
  topic: string;
}

export interface ForecastSelection {
  index: number;
  reasoning: string;
}

export interface ExtractForecastingClaimsInput {
  text: string;
  agentInstructions?: string;
  maxDetailedAnalysis?: number;
}

export interface ExtractForecastingClaimsOutput {
  forecasts: Array<ExtractedForecast & {
    worthDetailedAnalysis: boolean;
    reasoning?: string;
  }>;
  totalFound: number;
  selectedForAnalysis: number;
  llmInteractions: PluginLLMInteraction[];
}

// Input validation schema
const inputSchema = z.object({
  text: z.string().min(1).max(10000).describe('The text to analyze for forecasting claims'),
  agentInstructions: z.string().max(1000).optional()
    .describe('Instructions for prioritizing which forecasts to analyze'),
  maxDetailedAnalysis: z.number().min(1).max(10).default(3)
    .describe('Maximum number of forecasts to select for detailed analysis')
}) satisfies z.ZodType<ExtractForecastingClaimsInput>;

// Output validation schema  
const outputSchema = z.object({
  forecasts: z.array(z.object({
    text: z.string(),
    probability: z.number().optional(),
    timeframe: z.string().optional(),
    topic: z.string(),
    worthDetailedAnalysis: z.boolean(),
    reasoning: z.string().optional()
  })).describe('Extracted forecasts with selection analysis'),
  totalFound: z.number().describe('Total number of forecasts found'),
  selectedForAnalysis: z.number().describe('Number of forecasts selected for detailed analysis'),
  llmInteractions: z.array(llmInteractionSchema).describe('LLM interactions for monitoring')
}) satisfies z.ZodType<ExtractForecastingClaimsOutput>;

export class ExtractForecastingClaimsTool extends Tool<ExtractForecastingClaimsInput, ExtractForecastingClaimsOutput> {
  config = {
    id: 'extract-forecasting-claims',
    name: 'Extract Forecasting Claims',
    description: 'Extract forecast-like statements from text and prioritize them for analysis',
    version: '1.0.0',
    category: 'analysis' as const,
    costEstimate: '~$0.01-0.05 per analysis (depends on text length and forecast count)'
  };
  
  inputSchema = inputSchema;
  outputSchema = outputSchema;
  
  async execute(input: ExtractForecastingClaimsInput, context: ToolContext): Promise<ExtractForecastingClaimsOutput> {
    context.logger.info(`[ExtractForecastingClaims] Analyzing text for forecasting claims`);
    
    const llmInteractions: PluginLLMInteraction[] = [];
    
    // Step 1: Extract forecasts from text
    const extractedForecasts = await this.extractForecasts(input.text, llmInteractions);
    
    // Step 2: Select which forecasts deserve detailed analysis
    const analyzedForecasts = await this.selectForecastsForAnalysis(
      extractedForecasts,
      input.agentInstructions || 'Select the most important and impactful predictions',
      input.maxDetailedAnalysis ?? 3,
      llmInteractions
    );
    
    const selectedCount = analyzedForecasts.filter(f => f.worthDetailedAnalysis).length;
    
    context.logger.info(`[ExtractForecastingClaims] Found ${extractedForecasts.length} forecasts, selected ${selectedCount} for analysis`);
    
    return {
      forecasts: analyzedForecasts,
      totalFound: extractedForecasts.length,
      selectedForAnalysis: selectedCount,
      llmInteractions
    };
  }
  
  private async extractForecasts(text: string, llmInteractions: PluginLLMInteraction[]): Promise<ExtractedForecast[]> {
    const systemPrompt = `Extract any forecast-like statements from the text. Look for:
- Predictions about future events
- Probability estimates
- Statements about what "will", "might", "could", or "should" happen
- Time-bounded predictions
- Trend extrapolations`;

    const userPrompt = `Extract forecasts from this text:\n\n${text}`;
    
    const result = await callClaudeWithTool<{ forecasts: ExtractedForecast[] }>({
      system: systemPrompt,
      messages: [{
        role: "user",
        content: userPrompt
      }],
      max_tokens: 1000,
      temperature: 0,
      toolName: "extract_forecasts",
      toolDescription: "Extract forecast statements from text",
      toolSchema: {
        type: "object",
        properties: {
          forecasts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string", description: "The forecast statement" },
                probability: { type: "number", description: "Probability if stated (0-100)" },
                timeframe: { type: "string", description: "Time period if mentioned" },
                topic: { type: "string", description: "What the forecast is about" }
              },
              required: ["text", "topic"]
            }
          }
        },
        required: ["forecasts"]
      }
    }, llmInteractions);

    return result.toolResult.forecasts || [];
  }
  
  private async selectForecastsForAnalysis(
    forecasts: ExtractedForecast[],
    agentInstructions: string,
    maxCount: number,
    llmInteractions: PluginLLMInteraction[]
  ): Promise<Array<ExtractedForecast & { worthDetailedAnalysis: boolean; reasoning?: string }>> {
    if (forecasts.length === 0) return [];
    
    const systemPrompt = `You are a forecast analyst. Given a list of extracted forecasts and agent instructions, 
select which forecasts are worth detailed probability analysis (which costs 6 LLM calls each).

Agent instructions: ${agentInstructions}

Consider:
- Importance and impact of the prediction
- Specificity and verifiability
- Relevance to the agent's focus areas
- Whether a probability estimate would be valuable

Select up to ${maxCount} forecasts.`;

    const userPrompt = `Select which of these forecasts deserve detailed analysis:\n\n${JSON.stringify(forecasts, null, 2)}`;
    
    const result = await callClaudeWithTool<{ selections: Array<{ index: number; reasoning: string }> }>({
      system: systemPrompt,
      messages: [{
        role: "user",
        content: userPrompt
      }],
      max_tokens: 1500,
      temperature: 0,
      toolName: "select_forecasts",
      toolDescription: "Select forecasts for detailed analysis",
      toolSchema: {
        type: "object",
        properties: {
          selections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                index: { type: "number", description: "Index of the forecast in the input array" },
                reasoning: { type: "string", description: "Why this forecast was selected" }
              },
              required: ["index", "reasoning"]
            }
          }
        },
        required: ["selections"]
      }
    }, llmInteractions);

    const selections = result.toolResult.selections || [];
    
    // Mark selected forecasts
    return forecasts.map((forecast, index) => {
      const selection = selections.find((s: any) => s.index === index);
      return {
        ...forecast,
        worthDetailedAnalysis: !!selection,
        reasoning: selection?.reasoning
      };
    });
  }
}

// Export singleton instance
export default new ExtractForecastingClaimsTool();