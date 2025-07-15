import { z } from 'zod';
import { Tool, ToolContext } from '../base/Tool';
import { PerplexityClient } from './client';
import { PluginLLMInteraction } from '@/types/llm';
import { llmInteractionSchema } from '@/types/llmSchema';

// Define types for the tool
export interface PerplexityResearchInput {
  query: string;
  focusArea?: 'general' | 'academic' | 'news' | 'technical' | 'market';
  maxSources?: number;
  includeForecastingContext?: boolean;
}

export interface PerplexityResearchOutput {
  summary: string;
  sources: Array<{ title: string; url: string; snippet: string }>;
  keyFindings: string[];
  forecastingContext?: string;
  llmInteraction: PluginLLMInteraction;
}

// Input validation schema
const inputSchema = z.object({
  query: z.string().min(1).max(1000).describe('The research query or question'),
  focusArea: z.enum(['general', 'academic', 'news', 'technical', 'market'])
    .optional()
    .default('general')
    .describe('The focus area for research'),
  maxSources: z.number().min(1).max(10).optional().default(5)
    .describe('Maximum number of sources to include'),
  includeForecastingContext: z.boolean().optional().default(false)
    .describe('Whether to include specific forecasting context')
}) satisfies z.ZodType<PerplexityResearchInput>;

// Output validation schema
const outputSchema = z.object({
  summary: z.string().describe('Comprehensive summary of the research'),
  sources: z.array(z.object({
    title: z.string(),
    url: z.string(),
    snippet: z.string()
  })).describe('Sources found during research'),
  keyFindings: z.array(z.string()).describe('Key findings as bullet points'),
  forecastingContext: z.string().optional().describe('Context specifically for forecasting'),
  llmInteraction: llmInteractionSchema.describe('LLM interaction for monitoring')
}) satisfies z.ZodType<PerplexityResearchOutput>;

export class PerplexityResearchTool extends Tool<PerplexityResearchInput, PerplexityResearchOutput> {
  config = {
    id: 'perplexity-research',
    name: 'Perplexity Research',
    description: 'Web-enhanced research using Perplexity Sonar models via OpenRouter',
    version: '1.0.0',
    category: 'research' as const,
    costEstimate: '~$0.001-0.005 per query (via OpenRouter)'
  };
  
  inputSchema = inputSchema;
  outputSchema = outputSchema;
  
  async execute(input: PerplexityResearchInput, context: ToolContext): Promise<PerplexityResearchOutput> {
    context.logger.info(`[PerplexityResearch] Researching: ${input.query}`);
    
    const startTime = Date.now();
    
    try {
      const client = new PerplexityClient();
      
      let researchResult;
      let usage;
      
      try {
        // First, try structured research
        researchResult = await this.structuredResearch(client, input.query, {
          focusArea: input.focusArea,
          maxSources: input.maxSources
        });
        usage = researchResult.usage;
      } catch (structuredError) {
        // Fallback to basic query if structured research fails
        context.logger.warn('[PerplexityResearch] Structured research failed, using fallback mode');
        
        const basicResponse = await client.query(input.query);
        usage = basicResponse.usage;
        
        // Parse basic response into structured format
        researchResult = {
          summary: basicResponse.content,
          sources: [],
          keyFindings: basicResponse.content
            .split('\n')
            .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
            .map(line => line.replace(/^[-•]\s*/, ''))
        };
      }
      
      // Optionally get forecasting-specific context
      let forecastingContext: string | undefined;
      let forecastingUsage;
      if (input.includeForecastingContext) {
        try {
          const contextResult = await this.getForecastingContext(client, input.query);
          forecastingContext = contextResult.content;
          forecastingUsage = contextResult.usage;
        } catch (contextError) {
          context.logger.warn('[PerplexityResearch] Failed to get forecasting context', { 
            error: contextError instanceof Error ? contextError.message : String(contextError) 
          });
          // Continue without forecasting context
        }
      }
      
      const endTime = Date.now();
      
      // Create LLM interaction record
      // Use actual token counts if available, otherwise estimate
      const totalInputTokens = (usage?.prompt_tokens || 0) + (forecastingUsage?.prompt_tokens || 0);
      const totalOutputTokens = (usage?.completion_tokens || 0) + (forecastingUsage?.completion_tokens || 0);
      
      const llmInteraction: PluginLLMInteraction = {
        model: 'perplexity/sonar',
        prompt: input.query,
        response: JSON.stringify({
          summary: researchResult.summary,
          keyFindings: researchResult.keyFindings,
          sources: researchResult.sources,
          ...(forecastingContext && { forecastingContext })
        }),
        tokensUsed: {
          prompt: totalInputTokens || Math.ceil((input.query.length + 200) / 4),
          completion: totalOutputTokens || Math.ceil((researchResult.summary.length + 
            researchResult.keyFindings.join('').length + 
            (forecastingContext?.length || 0)) / 4),
          total: (totalInputTokens || Math.ceil((input.query.length + 200) / 4)) + 
                 (totalOutputTokens || Math.ceil((researchResult.summary.length + 
                   researchResult.keyFindings.join('').length + 
                   (forecastingContext?.length || 0)) / 4))
        },
        timestamp: new Date(),
        duration: endTime - startTime
      };
      
      const timeInSeconds = Math.round((endTime - startTime) / 1000);
      context.logger.info(`[PerplexityResearch] Completed in ${timeInSeconds}s`);
      
      return {
        ...researchResult,
        forecastingContext,
        llmInteraction
      };
    } catch (error) {
      context.logger.error('[PerplexityResearch] Error:', error);
      throw error;
    }
  }
  
  private async structuredResearch(
    client: PerplexityClient,
    query: string,
    options: {
      focusArea?: 'general' | 'academic' | 'news' | 'technical' | 'market';
      maxSources?: number;
    } = {}
  ): Promise<{
    summary: string;
    sources: Array<{ title: string; url: string; snippet: string }>;
    keyFindings: string[];
    usage?: any;
  }> {
    const { focusArea = 'general', maxSources = 5 } = options;

    const systemPrompt = `You are a research assistant using Perplexity's web search capabilities. 
When researching topics, provide:
1. A comprehensive summary
2. Key findings as bullet points
3. Sources with titles, URLs, and relevant snippets

Focus area: ${focusArea}
Maximum sources to include: ${maxSources}

Format your response as JSON with this structure:
{
  "summary": "...",
  "keyFindings": ["finding1", "finding2", ...],
  "sources": [
    {"title": "...", "url": "...", "snippet": "..."},
    ...
  ]
}`;

    const response = await client.query(query, {
      model: 'perplexity/sonar',
      systemPrompt,
      maxTokens: 2000,
      temperature: 0.3 // Lower temperature for more factual responses
    });

    try {
      // Try to parse as JSON
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return {
          ...JSON.parse(jsonMatch[0]),
          usage: response.usage
        };
      }
    } catch (e) {
      // Fallback to text parsing if JSON parsing fails
      console.warn('Failed to parse JSON response, using fallback parsing');
    }

    // Fallback parsing
    return {
      summary: response.content.split('\n')[0] || response.content.substring(0, 500),
      keyFindings: response.content.match(/[-•]\s*(.+)/g)?.map(f => f.replace(/^[-•]\s*/, '')) || [],
      sources: [],
      usage: response.usage
    };
  }
  
  private async getForecastingContext(
    client: PerplexityClient,
    question: string,
    existingContext?: string
  ): Promise<{ content: string; usage?: any }> {
    const prompt = `Research current information relevant to this forecasting question: "${question}"
    
${existingContext ? `Existing context: ${existingContext}\n` : ''}

Provide relevant facts, recent developments, base rates, and any information that would help make an accurate probability forecast. Focus on:
1. Current state and recent trends
2. Historical precedents and base rates
3. Key factors that could influence the outcome
4. Expert opinions or predictions if available

Keep the response concise and focused on information directly relevant to forecasting.`;

    const response = await client.query(prompt, {
      model: 'perplexity/sonar',
      maxTokens: 1500,
      temperature: 0.5
    });

    return response;
  }
  
  override async validateAccess(context: ToolContext): Promise<boolean> {
    // Check if OpenRouter API key is available
    if (!process.env.OPENROUTER_API_KEY) {
      context.logger.error('[PerplexityResearch] Missing OPENROUTER_API_KEY');
      return false;
    }
    
    // Check if Helicone API key is available
    if (!process.env.HELICONE_API_KEY) {
      context.logger.error('[PerplexityResearch] Missing HELICONE_API_KEY');
      return false;
    }
    
    return true;
  }
}

// Export singleton instance
export default new PerplexityResearchTool();