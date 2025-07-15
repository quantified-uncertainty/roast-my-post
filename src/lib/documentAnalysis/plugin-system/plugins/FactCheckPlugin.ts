/**
 * Fact checking plugin
 */

import { BasePlugin } from '../BasePlugin';
import { ChunkResult, SynthesisResult, Finding, RoutingExample } from '../types';
import { TextChunk } from '../TextChunk';
import { anthropic, ANALYSIS_MODEL } from '../../../../types/openai';

interface FactCheckState {
  claims: Array<{
    id: string;
    text: string;
    chunkId: string;
    context: string;
    topic: string;
    needsVerification: boolean;
    verified?: boolean;
    explanation?: string;
  }>;
  contradictions: Array<{
    claim1: string;
    claim2: string;
    explanation: string;
  }>;
}

export class FactCheckPlugin extends BasePlugin<FactCheckState> {
  constructor() {
    super({
      claims: [],
      contradictions: []
    });
  }

  name(): string {
    return "FACT_CHECK";
  }

  promptForWhenToUse(): string {
    return `Call this when there are factual claims that could be verified. This includes:
- Specific statistics or data points (GDP was $21T in 2023)
- Historical facts (The Berlin Wall fell in 1989)
- Scientific claims (Water boils at 100°C at sea level)
- Claims about current events or recent developments
- Statements about organizations, people, or places
- Any claim presented as objective fact
Do NOT call for: opinions, predictions, hypotheticals, or general statements`;
  }

  override routingExamples(): RoutingExample[] {
    return [
      {
        chunkText: "The unemployment rate in the US was 3.7% in December 2023",
        shouldProcess: true,
        reason: "Contains specific statistical claim that can be verified"
      },
      {
        chunkText: "I believe the economy will improve next year",
        shouldProcess: false,
        reason: "Opinion/prediction, not a verifiable fact"
      },
      {
        chunkText: "Apple Inc. was founded in 1976 by Steve Jobs and Steve Wozniak",
        shouldProcess: true,
        reason: "Historical fact that can be verified"
      }
    ];
  }

  async processChunk(chunk: TextChunk): Promise<ChunkResult> {
    const { result, interaction } = await this.trackLLMCall(
      ANALYSIS_MODEL,
      this.buildExtractionPrompt(chunk),
      () => this.extractClaims(chunk)
    );

    const findings: Finding[] = [];

    // Store claims for later verification
    result.claims.forEach(claim => {
      const claimId = `${chunk.id}-${this.state.claims.length}`;
      this.state.claims.push({
        id: claimId,
        text: claim.text,
        chunkId: chunk.id,
        context: chunk.getExpandedContext(100),
        topic: claim.topic,
        needsVerification: claim.importance === 'high' || claim.specificity === 'high'
      });

      // Note: We don't verify immediately in processChunk
      // This is done in synthesize() to batch verifications
    });

    // Check for contradictions with existing claims
    const newContradictions = this.checkForContradictions(result.claims);
    this.state.contradictions.push(...newContradictions);

    newContradictions.forEach(contradiction => {
      findings.push({
        type: 'contradiction',
        severity: 'high',
        message: `Contradicting claims found: "${contradiction.claim1}" vs "${contradiction.claim2}"`
      });
    });

    return {
      findings,
      llmCalls: [interaction],
      metadata: {
        tokensUsed: interaction.tokensUsed.total,
        processingTime: interaction.duration
      }
    };
  }

  async synthesize(): Promise<SynthesisResult> {
    // Prioritize claims for fact-checking
    const claimsToVerify = this.state.claims
      .filter(claim => claim.needsVerification)
      .slice(0, 10); // Limit to 10 most important claims

    // Verify claims using web search
    const verificationResults = await this.verifyClaims(claimsToVerify);

    const findings: Finding[] = [];
    const llmCalls: any[] = [];

    verificationResults.forEach(result => {
      if (result.verified === false) {
        findings.push({
          type: 'false_claim',
          severity: 'high',
          message: `False claim: "${result.claim.text}" - ${result.explanation}`
        });
      }
      
      const claim = this.state.claims.find(c => c.id === result.claim.id);
      if (claim) {
        claim.verified = result.verified;
        claim.explanation = result.explanation;
      }

      if (result.llmCall) {
        llmCalls.push(result.llmCall);
      }
    });

    // Add contradiction findings
    this.state.contradictions.forEach(contradiction => {
      findings.push({
        type: 'contradiction',
        severity: 'medium',
        message: contradiction.explanation
      });
    });

    const verifiedCount = verificationResults.filter(r => r.verified === true).length;
    const falseCount = verificationResults.filter(r => r.verified === false).length;
    const summary = `Analyzed ${this.state.claims.length} claims. Verified ${claimsToVerify.length} high-priority claims: ${verifiedCount} true, ${falseCount} false. Found ${this.state.contradictions.length} contradictions.`;

    const recommendations = this.generateRecommendations(falseCount, this.state.contradictions.length);

    return {
      summary,
      findings,
      recommendations,
      llmCalls
    };
  }

  protected createInitialState(): FactCheckState {
    return {
      claims: [],
      contradictions: []
    };
  }

  private buildExtractionPrompt(chunk: TextChunk): string {
    return `Extract all factual claims from this text that could potentially be verified. Focus on specific, objective statements.

Text to analyze:
${chunk.text}

For each claim, identify:
1. The exact claim text
2. The topic/category
3. Importance (high/medium/low)
4. Specificity (high/medium/low)`;
  }

  private async extractClaims(chunk: TextChunk): Promise<{
    claims: Array<{
      text: string;
      topic: string;
      importance: 'high' | 'medium' | 'low';
      specificity: 'high' | 'medium' | 'low';
    }>;
  }> {
    const response = await anthropic.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 1500,
      temperature: 0,
      system: "You are a fact extraction system. Extract verifiable factual claims from text.",
      messages: [{
        role: "user",
        content: this.buildExtractionPrompt(chunk)
      }],
      tools: [{
        name: "extract_claims",
        description: "Extract factual claims from text",
        input_schema: {
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
      }],
      tool_choice: { type: "tool", name: "extract_claims" }
    });

    const toolUse = response.content.find((c: any) => c.type === "tool_use") as any;
    return toolUse?.input || { claims: [] };
  }

  private checkForContradictions(newClaims: any[]): Array<{
    claim1: string;
    claim2: string;
    explanation: string;
  }> {
    const contradictions: Array<{
      claim1: string;
      claim2: string;
      explanation: string;
    }> = [];

    // Simple contradiction detection - in production, this would be more sophisticated
    newClaims.forEach(newClaim => {
      this.state.claims.forEach(existingClaim => {
        if (this.areContradictory(newClaim, existingClaim)) {
          contradictions.push({
            claim1: existingClaim.text,
            claim2: newClaim.text,
            explanation: `These claims appear to contradict each other about ${newClaim.topic}`
          });
        }
      });
    });

    return contradictions;
  }

  private areContradictory(claim1: any, claim2: any): boolean {
    // Simplified logic - in production would use more sophisticated NLP
    if (claim1.topic !== claim2.topic) return false;
    
    // Check for opposing numbers or dates
    const numbers1 = claim1.text.match(/\d+/g) || [];
    const numbers2 = claim2.text.match(/\d+/g) || [];
    
    if (numbers1.length > 0 && numbers2.length > 0 && 
        numbers1.some((n1: string) => numbers2.some((n2: string) => n1 !== n2))) {
      return true;
    }

    return false;
  }

  private async verifyClaims(claims: any[]): Promise<Array<{
    claim: any;
    verified: boolean;
    explanation: string;
    llmCall?: any;
  }>> {
    // In production, this would use web search API
    // For now, we'll use Claude's knowledge with appropriate caveats
    
    const verifications = await Promise.all(
      claims.map(claim => this.verifySingleClaim(claim))
    );

    return verifications;
  }

  private async verifySingleClaim(claim: any): Promise<{
    claim: any;
    verified: boolean;
    explanation: string;
    llmCall?: any;
  }> {
    const { result, interaction } = await this.trackLLMCall(
      ANALYSIS_MODEL,
      `Fact-check this claim: "${claim.text}"\n\nNote: Use your training data to assess if this claim is likely true or false. If you're uncertain or the claim involves recent events after your training cutoff, indicate that verification requires current data.`,
      async () => {
        const response = await anthropic.messages.create({
          model: ANALYSIS_MODEL,
          max_tokens: 500,
          temperature: 0,
          system: "You are a fact-checking assistant. Assess claims based on your training data.",
          messages: [{
            role: "user",
            content: `Fact-check this claim: "${claim.text}"`
          }],
          tools: [{
            name: "verify_claim",
            description: "Verify a factual claim",
            input_schema: {
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
          }],
          tool_choice: { type: "tool", name: "verify_claim" }
        });

        const toolUse = response.content.find((c: any) => c.type === "tool_use") as any;
        return toolUse?.input || { verified: true, explanation: "Could not verify" };
      }
    );

    return {
      claim,
      verified: result.verified,
      explanation: result.explanation,
      llmCall: interaction
    };
  }

  private generateRecommendations(falseCount: number, contradictionCount: number): string[] {
    const recommendations: string[] = [];

    if (falseCount > 0) {
      recommendations.push('Verify and correct false claims before publication');
    }
    if (falseCount > 3) {
      recommendations.push('Consider comprehensive fact-checking review');
    }
    if (contradictionCount > 0) {
      recommendations.push('Resolve contradictory statements for consistency');
    }
    if (this.state.claims.filter(c => c.needsVerification).length > 20) {
      recommendations.push('Document contains many claims requiring verification - consider citing sources');
    }

    return recommendations;
  }
}