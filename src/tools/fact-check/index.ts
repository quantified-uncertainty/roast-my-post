import { z } from 'zod';
import { Tool, ToolContext } from '../base/Tool';
import { RichLLMInteraction } from '@/types/llm';
import { llmInteractionSchema } from '@/types/llmSchema';
import { callClaudeWithTool } from '@/lib/claude/wrapper';

export interface Claim {
  id: string;
  text: string;
  topic: string;
  importance: 'high' | 'medium' | 'low';
  specificity: 'high' | 'medium' | 'low';
  context?: string;
  verified?: boolean;
  explanation?: string;
}

export interface Contradiction {
  claim1: string;
  claim2: string;
  explanation: string;
}

export interface FactCheckInput {
  text: string;
  context?: string;
  maxClaims?: number;
  verifyHighPriority?: boolean;
}

export interface FactCheckOutput {
  claims: Claim[];
  contradictions: Contradiction[];
  verificationResults: Array<{
    claim: Claim;
    verified: boolean;
    explanation: string;
  }>;
  summary: {
    totalClaims: number;
    verifiedClaims: number;
    falseClaims: number;
    contradictions: number;
  };
  recommendations: string[];
  llmInteractions: RichLLMInteraction[];
}

const inputSchema = z.object({
  text: z.string().min(1).max(50000).describe('Text to fact-check for claims'),
  context: z.string().max(1000).optional().describe('Additional context for understanding the text'),
  maxClaims: z.number().min(1).max(50).optional().default(20).describe('Maximum number of claims to extract'),
  verifyHighPriority: z.boolean().optional().default(true).describe('Whether to verify high-priority claims')
}) satisfies z.ZodType<FactCheckInput>;

const outputSchema = z.object({
  claims: z.array(z.object({
    id: z.string(),
    text: z.string(),
    topic: z.string(),
    importance: z.enum(['high', 'medium', 'low']),
    specificity: z.enum(['high', 'medium', 'low']),
    context: z.string().optional(),
    verified: z.boolean().optional(),
    explanation: z.string().optional()
  })).describe('Extracted factual claims'),
  contradictions: z.array(z.object({
    claim1: z.string(),
    claim2: z.string(),
    explanation: z.string()
  })).describe('Internal contradictions found'),
  verificationResults: z.array(z.object({
    claim: z.object({
      id: z.string(),
      text: z.string(),
      topic: z.string(),
      importance: z.enum(['high', 'medium', 'low']),
      specificity: z.enum(['high', 'medium', 'low'])
    }),
    verified: z.boolean(),
    explanation: z.string()
  })).describe('Results of claim verification'),
  summary: z.object({
    totalClaims: z.number(),
    verifiedClaims: z.number(),
    falseClaims: z.number(),
    contradictions: z.number()
  }).describe('Summary statistics'),
  recommendations: z.array(z.string()).describe('Recommendations based on fact-checking results'),
  llmInteractions: z.array(llmInteractionSchema).describe('LLM interactions for monitoring')
}) satisfies z.ZodType<FactCheckOutput>;

export class FactCheckTool extends Tool<FactCheckInput, FactCheckOutput> {
  config = {
    id: 'fact-check',
    name: 'Fact Checker',
    description: 'Extract and verify factual claims in text, detect contradictions',
    version: '1.0.0',
    category: 'analysis' as const,
    costEstimate: '~$0.02-0.10 per text (depends on number of claims to verify)'
  };
  
  inputSchema = inputSchema;
  outputSchema = outputSchema;
  
  async execute(input: FactCheckInput, context: ToolContext): Promise<FactCheckOutput> {
    context.logger.info(`[FactCheckTool] Analyzing text for factual claims (${input.text.length} chars)`);
    
    const llmInteractions: RichLLMInteraction[] = [];
    
    try {
      // Extract claims from text
      const { claims, interaction: extractInteraction } = await this.extractClaims(input.text, input.context);
      llmInteractions.push(extractInteraction);
      
      context.logger.info(`[FactCheckTool] Extracted ${claims.length} claims`);
      
      // Limit claims based on maxClaims
      const limitedClaims = claims.slice(0, input.maxClaims);
      
      // Check for contradictions
      const contradictions = this.checkForContradictions(limitedClaims);
      
      // Verify high-priority claims if requested
      let verificationResults: Array<{
        claim: Claim;
        verified: boolean;
        explanation: string;
      }> = [];
      
      if (input.verifyHighPriority) {
        const claimsToVerify = limitedClaims.filter(claim => 
          claim.importance === 'high' || claim.specificity === 'high'
        ).slice(0, 10); // Limit to 10 verifications
        
        for (const claim of claimsToVerify) {
          const { result, interaction } = await this.verifyClaim(claim);
          verificationResults.push(result);
          llmInteractions.push(interaction);
        }
      }
      
      // Generate summary
      const summary = {
        totalClaims: limitedClaims.length,
        verifiedClaims: verificationResults.filter(r => r.verified).length,
        falseClaims: verificationResults.filter(r => !r.verified).length,
        contradictions: contradictions.length
      };
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(summary, contradictions.length);
      
      context.logger.info(`[FactCheckTool] Completed analysis: ${summary.totalClaims} claims, ${summary.falseClaims} false, ${summary.contradictions} contradictions`);
      
      return {
        claims: limitedClaims,
        contradictions,
        verificationResults,
        summary,
        recommendations,
        llmInteractions
      };
      
    } catch (error) {
      context.logger.error('[FactCheckTool] Error during fact-checking:', error);
      throw error;
    }
  }
  
  private async extractClaims(text: string, context?: string): Promise<{
    claims: Claim[];
    interaction: RichLLMInteraction;
  }> {
    const prompt = this.buildExtractionPrompt(text, context);
    
    const result = await callClaudeWithTool<{ claims: any[] }>({
      system: "You are a fact extraction system. Extract verifiable factual claims from text.",
      messages: [{
        role: "user",
        content: prompt
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
    });

    const extractedClaims = result.toolResult.claims || [];
    
    // Convert to our Claim format with IDs
    const claims: Claim[] = extractedClaims.map((claim: any, index: number) => ({
      id: `claim-${index}`,
      text: claim.text,
      topic: claim.topic,
      importance: claim.importance,
      specificity: claim.specificity,
      context: context
    }));
    
    return { claims, interaction: result.interaction };
  }
  
  private async verifyClaim(claim: Claim): Promise<{
    result: {
      claim: Claim;
      verified: boolean;
      explanation: string;
    };
    interaction: RichLLMInteraction;
  }> {
    const result = await callClaudeWithTool<{
      verified: boolean;
      confidence: string;
      explanation: string;
      requiresCurrentData: boolean;
    }>({
      system: "You are a fact-checking assistant. Assess claims based on your training data.",
      messages: [{
        role: "user",
        content: `Fact-check this claim: "${claim.text}"\n\nNote: Use your training data to assess if this claim is likely true or false. If you're uncertain or the claim involves recent events after your training cutoff, indicate that verification requires current data.`
      }],
      max_tokens: 500,
      temperature: 0,
      toolName: "verify_claim",
      toolDescription: "Verify a factual claim",
      toolSchema: {
        type: "object",
        properties: {
          verified: { type: "boolean", description: "Whether the claim appears to be true" },
          confidence: { 
            type: "string", 
            enum: ["high", "medium", "low"],
            description: "Confidence in the verification"
          },
          explanation: { type: "string", description: "Explanation of the verification" },
          requiresCurrentData: { type: "boolean", description: "Whether current data is needed" }
        },
        required: ["verified", "confidence", "explanation", "requiresCurrentData"]
      }
    });
    
    return {
      result: {
        claim,
        verified: result.toolResult.verified,
        explanation: result.toolResult.explanation
      },
      interaction: result.interaction
    };
  }
  
  private checkForContradictions(claims: Claim[]): Contradiction[] {
    const contradictions: Contradiction[] = [];
    
    for (let i = 0; i < claims.length; i++) {
      for (let j = i + 1; j < claims.length; j++) {
        if (this.areContradictory(claims[i], claims[j])) {
          contradictions.push({
            claim1: claims[i].text,
            claim2: claims[j].text,
            explanation: `These claims appear to contradict each other about ${claims[i].topic}`
          });
        }
      }
    }
    
    return contradictions;
  }
  
  private areContradictory(claim1: Claim, claim2: Claim): boolean {
    // Simplified logic - check same topic with different numbers
    if (claim1.topic !== claim2.topic) return false;
    
    const numbers1 = claim1.text.match(/\d+/g) || [];
    const numbers2 = claim2.text.match(/\d+/g) || [];
    
    if (numbers1.length > 0 && numbers2.length > 0 && 
        numbers1.some(n1 => numbers2.some(n2 => n1 !== n2))) {
      return true;
    }

    return false;
  }
  
  private buildExtractionPrompt(text: string, context?: string): string {
    let prompt = `Extract all factual claims from this text that could potentially be verified. Focus on specific, objective statements.

Text to analyze:
${text}`;

    if (context) {
      prompt += `\n\nAdditional context:
${context}`;
    }

    prompt += `\n\nFor each claim, identify:
1. The exact claim text
2. The topic/category
3. Importance (high/medium/low)
4. Specificity (high/medium/low)`;

    return prompt;
  }
  
  private generateRecommendations(summary: FactCheckOutput['summary'], contradictionCount: number): string[] {
    const recommendations: string[] = [];

    if (summary.totalClaims === 0) {
      recommendations.push('No factual claims were found in the text.');
    }
    if (summary.falseClaims > 0) {
      recommendations.push('Verify and correct false claims before publication');
    }
    if (summary.falseClaims > 3) {
      recommendations.push('Consider comprehensive fact-checking review');
    }
    if (contradictionCount > 0) {
      recommendations.push('Resolve contradictory statements for consistency');
    }
    if (summary.totalClaims > 20) {
      recommendations.push('Document contains many claims requiring verification - consider citing sources');
    }

    return recommendations;
  }
  
  
  override async beforeExecute(input: FactCheckInput, context: ToolContext): Promise<void> {
    context.logger.info(`[FactCheckTool] Starting fact-check of ${input.text.length} characters`);
  }
  
  override async afterExecute(output: FactCheckOutput, context: ToolContext): Promise<void> {
    context.logger.info(`[FactCheckTool] Completed: ${output.summary.totalClaims} claims, ${output.summary.falseClaims} false`);
  }
}

// Export singleton instance
const factCheckTool = new FactCheckTool();
export default factCheckTool;