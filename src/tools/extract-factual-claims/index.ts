import { z } from 'zod';
import { Tool, ToolContext } from '../base/Tool';
import { PluginLLMInteraction } from '@/types/llm';
import { llmInteractionSchema } from '@/types/llmSchema';
import { callClaudeWithTool } from '@/lib/claude/wrapper';

// Define types for the tool
export interface ExtractedClaim {
  text: string;
  topic: string;
  importance: 'high' | 'medium' | 'low';
  specificity: 'high' | 'medium' | 'low';
  needsVerification?: boolean;
}

export interface ClaimContradiction {
  claim1: string;
  claim2: string;
  explanation: string;
}

export interface ExtractFactualClaimsInput {
  text: string;
  checkContradictions?: boolean;
  prioritizeVerification?: boolean;
}

export interface ExtractFactualClaimsOutput {
  claims: ExtractedClaim[];
  contradictions: ClaimContradiction[];
  verificationPriority: {
    high: ExtractedClaim[];
    medium: ExtractedClaim[];
    low: ExtractedClaim[];
  };
  totalClaims: number;
  llmInteractions: PluginLLMInteraction[];
}

// Claim schema
const extractedClaimSchema = z.object({
  text: z.string(),
  topic: z.string(),
  importance: z.enum(['high', 'medium', 'low']),
  specificity: z.enum(['high', 'medium', 'low']),
  needsVerification: z.boolean().optional()
});

// Input validation schema
const inputSchema = z.object({
  text: z.string().min(1).max(10000).describe('The text to analyze for factual claims'),
  checkContradictions: z.boolean().default(true)
    .describe('Whether to check for internal contradictions'),
  prioritizeVerification: z.boolean().default(true)
    .describe('Whether to categorize claims by verification priority')
}) satisfies z.ZodType<ExtractFactualClaimsInput>;

// Output validation schema  
const outputSchema = z.object({
  claims: z.array(z.object({
    text: z.string(),
    topic: z.string(),
    importance: z.enum(['high', 'medium', 'low']),
    specificity: z.enum(['high', 'medium', 'low']),
    needsVerification: z.boolean().optional()
  })).describe('Extracted factual claims'),
  contradictions: z.array(z.object({
    claim1: z.string(),
    claim2: z.string(),
    explanation: z.string()
  })).describe('Detected contradictions between claims'),
  verificationPriority: z.object({
    high: z.array(extractedClaimSchema),
    medium: z.array(extractedClaimSchema),
    low: z.array(extractedClaimSchema)
  }).describe('Claims categorized by verification priority'),
  totalClaims: z.number().describe('Total number of claims found'),
  llmInteractions: z.array(llmInteractionSchema).describe('LLM interactions for monitoring')
}) satisfies z.ZodType<ExtractFactualClaimsOutput>;

export class ExtractFactualClaimsTool extends Tool<ExtractFactualClaimsInput, ExtractFactualClaimsOutput> {
  config = {
    id: 'extract-factual-claims',
    name: 'Extract Factual Claims',
    description: 'Extract verifiable factual claims from text and identify contradictions',
    version: '1.0.0',
    category: 'analysis' as const,
    costEstimate: '~$0.01-0.02 per analysis (depends on text length and claim count)'
  };
  
  inputSchema = inputSchema;
  outputSchema = outputSchema;
  
  async execute(input: ExtractFactualClaimsInput, context: ToolContext): Promise<ExtractFactualClaimsOutput> {
    context.logger.info(`[ExtractFactualClaims] Analyzing text for factual claims`);
    
    const llmInteractions: PluginLLMInteraction[] = [];
    
    // Extract factual claims from text
    const extractedClaims = await this.extractClaims(input.text, llmInteractions);
    
    // Mark claims that need verification
    const claimsWithVerification = this.markClaimsForVerification(extractedClaims, input.prioritizeVerification ?? true);
    
    // Check for contradictions if requested
    let contradictions: ClaimContradiction[] = [];
    if (input.checkContradictions && claimsWithVerification.length > 1) {
      contradictions = await this.detectContradictions(claimsWithVerification, llmInteractions);
    }
    
    // Categorize by verification priority
    const verificationPriority = this.categorizeByPriority(claimsWithVerification);
    
    context.logger.info(`[ExtractFactualClaims] Found ${extractedClaims.length} claims, ${contradictions.length} contradictions`);
    
    return {
      claims: claimsWithVerification,
      contradictions,
      verificationPriority,
      totalClaims: extractedClaims.length,
      llmInteractions
    };
  }
  
  private async extractClaims(text: string, llmInteractions: PluginLLMInteraction[]): Promise<ExtractedClaim[]> {
    const systemPrompt = `You are a fact extraction system. Extract verifiable factual claims from text.

Look for:
- Specific statistics or data points (GDP was $21T in 2023)
- Historical facts (The Berlin Wall fell in 1989)
- Scientific claims (Water boils at 100°C at sea level)
- Claims about current events or recent developments
- Statements about organizations, people, or places
- Any claim presented as objective fact

Do NOT extract:
- Opinions, predictions, or hypotheticals
- General statements without specific facts
- Questions or statements of uncertainty
- Subjective assessments or evaluations

For each claim, assess:
- Importance: How critical is it to verify this claim?
- Specificity: How specific and verifiable is the claim?`;

    const userPrompt = `Extract factual claims from this text:\n\n${text}`;
    
    const result = await callClaudeWithTool<{ claims: ExtractedClaim[] }>({
      system: systemPrompt,
      messages: [{
        role: "user",
        content: userPrompt
      }],
      max_tokens: 1500,
      temperature: 0,
      toolName: "extract_claims",
      toolDescription: "Extract factual claims from text",
      toolSchema: {
        type: "object",
        properties: {
          claims: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string", description: "The exact claim" },
                topic: { type: "string", description: "Topic/category of the claim" },
                importance: {
                  type: "string",
                  enum: ["high", "medium", "low"],
                  description: "Importance of verifying this claim"
                },
                specificity: {
                  type: "string",
                  enum: ["high", "medium", "low"],
                  description: "How specific/verifiable the claim is"
                }
              },
              required: ["text", "topic", "importance", "specificity"]
            }
          }
        },
        required: ["claims"]
      }
    }, llmInteractions);

    return result.toolResult.claims || [];
  }
  
  private markClaimsForVerification(claims: ExtractedClaim[], prioritize: boolean): ExtractedClaim[] {
    if (!prioritize) {
      return claims.map(claim => ({ ...claim, needsVerification: false }));
    }
    
    return claims.map(claim => ({
      ...claim,
      needsVerification: claim.importance === 'high' || claim.specificity === 'high'
    }));
  }
  
  private async detectContradictions(
    claims: ExtractedClaim[], 
    llmInteractions: PluginLLMInteraction[]
  ): Promise<ClaimContradiction[]> {
    if (claims.length < 2) return [];
    
    const systemPrompt = `You are a contradiction detection system. Analyze a list of factual claims and identify any that contradict each other.

Two claims contradict if:
- They make opposing statements about the same fact
- They provide conflicting data or statistics
- They assert different timeframes for the same event
- They attribute the same achievement to different entities

Provide specific explanations for why claims contradict.`;

    const userPrompt = `Identify contradictions in these claims:\n\n${claims.map((claim, i) => `${i + 1}. ${claim.text} (Topic: ${claim.topic})`).join('\n')}`;
    
    const result = await callClaudeWithTool<{ contradictions: Array<{ claim1Index: number; claim2Index: number; explanation: string }> }>({
      system: systemPrompt,
      messages: [{
        role: "user",
        content: userPrompt
      }],
      max_tokens: 1000,
      temperature: 0,
      toolName: "detect_contradictions",
      toolDescription: "Detect contradictions between factual claims",
      toolSchema: {
        type: "object",
        properties: {
          contradictions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                claim1Index: { type: "number", description: "Index of first contradicting claim (1-based)" },
                claim2Index: { type: "number", description: "Index of second contradicting claim (1-based)" },
                explanation: { type: "string", description: "Why these claims contradict" }
              },
              required: ["claim1Index", "claim2Index", "explanation"]
            }
          }
        },
        required: ["contradictions"]
      }
    }, llmInteractions);
    
    if (!result.toolResult.contradictions) return [];
    
    return result.toolResult.contradictions.map(contradiction => ({
      claim1: claims[contradiction.claim1Index - 1]?.text || '',
      claim2: claims[contradiction.claim2Index - 1]?.text || '',
      explanation: contradiction.explanation
    })).filter(c => c.claim1 && c.claim2);
  }
  
  private categorizeByPriority(claims: ExtractedClaim[]): {
    high: ExtractedClaim[];
    medium: ExtractedClaim[];
    low: ExtractedClaim[];
  } {
    const high: ExtractedClaim[] = [];
    const medium: ExtractedClaim[] = [];
    const low: ExtractedClaim[] = [];
    
    claims.forEach(claim => {
      if (claim.importance === 'high' || claim.specificity === 'high') {
        high.push(claim);
      } else if (claim.importance === 'medium' || claim.specificity === 'medium') {
        medium.push(claim);
      } else {
        low.push(claim);
      }
    });
    
    return { high, medium, low };
  }
}

// Export singleton instance
export default new ExtractFactualClaimsTool();