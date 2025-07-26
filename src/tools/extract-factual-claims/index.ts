import { z } from 'zod';
import { Tool, ToolContext } from '../base/Tool';
import { RichLLMInteraction } from '@/types/llm';
import { callClaudeWithTool } from '@/lib/claude/wrapper';
import { sessionContext } from '@/lib/helicone/sessionContext';
import { createHeliconeHeaders } from '@/lib/helicone/sessions';

// Claim schema
const extractedFactualClaimSchema = z.object({
  originalText: z.string().describe('The exact claim as it appears in the text'),
  topic: z.string().describe('Topic/category of the claim'),
  importanceScore: z.number().min(0).max(100).describe('How important/central to the document'),
  checkabilityScore: z.number().min(0).max(100).describe('How easily this can be fact-checked'),
  truthProbability: z.number().min(0).max(100).describe('Estimated probability the fact-checker would verify as true')
});

// Input validation schema
const inputSchema = z.object({
  text: z.string().min(1).max(50000).describe('The text to analyze for factual claims'),
  instructions: z.string().optional().describe('Additional instructions for extraction'),
  minQualityThreshold: z.number().min(0).max(100).default(50)
    .describe('Minimum average score to include a claim'),
  maxClaims: z.number().min(1).max(100).default(30)
    .describe('Maximum number of claims to extract')
}) satisfies z.ZodType<ExtractFactualClaimsInput>;

// Output validation schema  
const outputSchema = z.object({
  claims: z.array(extractedFactualClaimSchema).describe('Extracted factual claims with scores'),
  summary: z.object({
    totalFound: z.number(),
    aboveThreshold: z.number(),
    averageQuality: z.number()
  }).describe('Summary statistics'),
  llmInteraction: z.any().describe('LLM interaction for monitoring')
}) satisfies z.ZodType<ExtractFactualClaimsOutput>;

// Export types
export type ExtractedFactualClaim = z.infer<typeof extractedFactualClaimSchema>;

export interface ExtractFactualClaimsInput {
  text: string;
  instructions?: string;
  minQualityThreshold?: number;
  maxClaims?: number;
}

export interface ExtractFactualClaimsOutput {
  claims: ExtractedFactualClaim[];
  summary: {
    totalFound: number;
    aboveThreshold: number;
    averageQuality: number;
  };
  llmInteraction?: any;
}

export class ExtractFactualClaimsTool extends Tool<ExtractFactualClaimsInput, ExtractFactualClaimsOutput> {
  config = {
    id: 'extract-factual-claims',
    name: 'Extract Factual Claims',
    description: 'Extract and score verifiable factual claims from text',
    version: '2.0.0',
    category: 'analysis' as const,
    costEstimate: '~$0.01-0.03 per analysis (depends on text length)',
    path: '/tools/extract-factual-claims',
    status: 'stable' as const
  };
  
  inputSchema = inputSchema;
  outputSchema = outputSchema;
  
  async execute(input: ExtractFactualClaimsInput, context: ToolContext): Promise<ExtractFactualClaimsOutput> {
    context.logger.info(`[ExtractFactualClaims] Analyzing text for factual claims`);
    
    const systemPrompt = `You are an expert fact extraction system. Extract verifiable factual claims from text and score them.

Look for:
- Specific statistics or data points (e.g., "GDP was $21T in 2023")
- Historical facts (e.g., "The Berlin Wall fell in 1989")
- Scientific claims (e.g., "Water boils at 100°C at sea level")
- Claims about current events or recent developments
- Statements about organizations, people, or places
- Quantitative comparisons or rankings
- Any claim presented as objective fact that can be verified

Do NOT extract:
- Opinions or subjective assessments
- Predictions or forecasts (those go to the forecast extractor)
- Hypotheticals or thought experiments
- Vague generalizations without specifics

For each claim, provide:

1. **Importance Score** (0-100): How central is this claim to the document's main argument?
   - 80-100: Core claim that the entire argument depends on
   - 60-79: Major supporting claim
   - 40-59: Relevant but not critical
   - Below 40: Minor or tangential claim

2. **Checkability Score** (0-100): How easily can this be fact-checked?
   - 80-100: Can be quickly verified with public sources (Wikipedia, official stats, etc.)
   - 60-79: Verifiable but may require some research
   - 40-59: Checkable in principle but challenging
   - Below 40: Very difficult to verify or requires specialized access

3. **Truth Probability** (0-100): Your best estimate of the probability that a fact-checker would verify this claim as TRUE
   - 90-100: Almost certainly true (well-established facts, basic science, verified statistics)
   - 70-89: Likely true (mainstream consensus, reputable sources)
   - 50-69: Uncertain (conflicting sources, context-dependent, needs investigation)
   - 30-49: Likely false (contradicts mainstream sources, suspicious claims)
   - Below 30: Almost certainly false (known myths, clear misinformation)`;

    const userPrompt = `<task>
  <instruction>Extract factual claims from this text</instruction>
  
  <content>
${input.text}
  </content>
  
  ${input.instructions ? `<additional_instructions>\n${input.instructions}\n  </additional_instructions>\n  ` : ''}
  <parameters>
    <min_quality_threshold>${input.minQualityThreshold ?? 50}</min_quality_threshold>
    <max_claims>${input.maxClaims ?? 30}</max_claims>
  </parameters>
  
  <requirements>
    Extract verifiable factual claims and score them based on importance, checkability, and truth probability.
  </requirements>
</task>`;
    
    // Get session context if available
    const currentSession = sessionContext.getSession();
    const sessionConfig = currentSession ? 
      sessionContext.withPath('/plugins/fact-check/extract-factual-claims') : 
      undefined;
    const heliconeHeaders = sessionConfig ? 
      createHeliconeHeaders(sessionConfig) : 
      undefined;
    
    const result = await callClaudeWithTool<{ claims: ExtractedFactualClaim[] }>({
      system: systemPrompt,
      messages: [{
        role: "user",
        content: userPrompt
      }],
      max_tokens: 2000,
      temperature: 0,
      toolName: "extract_factual_claims",
      toolDescription: "Extract and score factual claims from text",
      toolSchema: {
        type: "object",
        properties: {
          claims: {
            type: "array",
            items: {
              type: "object",
              properties: {
                originalText: { 
                  type: "string", 
                  description: "The exact claim as it appears in the text" 
                },
                topic: { 
                  type: "string", 
                  description: "Topic/category (e.g., 'economics', 'history', 'science')" 
                },
                importanceScore: { 
                  type: "number", 
                  description: "0-100: How central to the document's argument" 
                },
                checkabilityScore: { 
                  type: "number", 
                  description: "0-100: How easily this can be fact-checked" 
                },
                truthProbability: {
                  type: "number",
                  description: "0-100: Estimated probability the fact-checker would verify as true"
                }
              },
              required: ["originalText", "topic", "importanceScore", "checkabilityScore", "truthProbability"]
            }
          }
        },
        required: ["claims"]
      },
      enablePromptCaching: true,
      heliconeHeaders
    });

    const allClaims = result.toolResult.claims || [];
    
    // Filter claims based on quality threshold
    const qualityClaims = allClaims.filter(claim => {
      const avgScore = (claim.importanceScore + claim.checkabilityScore) / 2;
      return avgScore >= (input.minQualityThreshold ?? 50);
    });
    
    // Sort by priority score (prioritize important claims with low truth probability)
    const sortedClaims = qualityClaims.sort((a, b) => {
      // Priority = importance + checkability + (100 - truthProbability)
      // This prioritizes claims that are important, checkable, and potentially false
      const priorityA = a.importanceScore + a.checkabilityScore + (100 - a.truthProbability);
      const priorityB = b.importanceScore + b.checkabilityScore + (100 - b.truthProbability);
      return priorityB - priorityA;
    }).slice(0, input.maxClaims);
    
    // Calculate summary statistics
    const avgQuality = sortedClaims.length > 0
      ? sortedClaims.reduce((sum, claim) => 
          sum + (claim.importanceScore + claim.checkabilityScore) / 2, 0
        ) / sortedClaims.length
      : 0;
    
    context.logger.info(`[ExtractFactualClaims] Found ${allClaims.length} claims, ${sortedClaims.length} above threshold`);
    
    return {
      claims: sortedClaims,
      summary: {
        totalFound: allClaims.length,
        aboveThreshold: sortedClaims.length,
        averageQuality: Math.round(avgQuality)
      },
      llmInteraction: result.interaction
    };
  }
}

// Export singleton instance
export const extractFactualClaimsTool = new ExtractFactualClaimsTool();
export default extractFactualClaimsTool;