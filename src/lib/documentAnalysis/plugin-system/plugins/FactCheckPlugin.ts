/**
 * Fact checking plugin - uses FactCheck tool for core functionality
 */

import { BasePlugin } from '../BasePlugin';
import { ChunkResult, SynthesisResult, Finding, RoutingExample } from '../types';
import { TextChunk } from '../TextChunk';
import FactCheckTool from '../../../../tools/fact-check';
import { logger } from '../../../../lib/logger';

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
    // Use the FactCheck tool to analyze this chunk
    const toolResult = await FactCheckTool.run({
      text: chunk.text,
      context: chunk.getExpandedContext(100),
      maxClaims: 10,
      verifyHighPriority: false // Don't verify in processChunk, save for synthesize
    }, {
      userId: 'plugin-system',
      logger
    });

    const findings: Finding[] = [];

    // Convert tool claims to plugin state format
    toolResult.claims.forEach(claim => {
      const claimId = `${chunk.id}-${this.state.claims.length}`;
      this.state.claims.push({
        id: claimId,
        text: claim.text,
        chunkId: chunk.id,
        context: claim.context || chunk.getExpandedContext(100),
        topic: claim.topic,
        needsVerification: claim.importance === 'high' || claim.specificity === 'high',
        verified: claim.verified,
        explanation: claim.explanation
      });
    });

    // Add contradictions to state
    this.state.contradictions.push(...toolResult.contradictions);

    // Convert contradictions to findings
    toolResult.contradictions.forEach(contradiction => {
      findings.push({
        type: 'contradiction',
        severity: 'high',
        message: `Contradicting claims found: "${contradiction.claim1}" vs "${contradiction.claim2}"`
      });
    });

    // Calculate total metadata from tool interactions
    const totalTokens = toolResult.llmInteractions.reduce((sum, interaction) => sum + (interaction.tokensUsed?.total || 0), 0);
    const totalDuration = toolResult.llmInteractions.reduce((sum, interaction) => sum + (interaction.duration || 0), 0);

    return {
      findings,
      llmCalls: toolResult.llmInteractions,
      metadata: {
        tokensUsed: totalTokens,
        processingTime: totalDuration
      }
    };
  }

  async synthesize(): Promise<SynthesisResult> {
    // If we have claims that need verification, use the tool to verify them
    const claimsToVerify = this.state.claims.filter(claim => claim.needsVerification);
    
    if (claimsToVerify.length === 0) {
      return {
        summary: `Analyzed ${this.state.claims.length} claims. No high-priority claims found for verification. Found ${this.state.contradictions.length} contradictions.`,
        findings: this.state.contradictions.map(contradiction => ({
          type: 'contradiction',
          severity: 'medium',
          message: contradiction.explanation
        })),
        recommendations: this.generateRecommendations(0, this.state.contradictions.length),
        llmCalls: []
      };
    }

    // Create a text block with all claims for batch verification
    const claimsText = claimsToVerify.map(claim => `${claim.text} (Topic: ${claim.topic})`).join('\n');

    // Use the tool to verify claims
    const toolResult = await FactCheckTool.run({
      text: claimsText,
      context: 'Claims extracted from document for verification',
      maxClaims: claimsToVerify.length,
      verifyHighPriority: true
    }, {
      userId: 'plugin-system',
      logger
    });

    const findings: Finding[] = [];

    // Process verification results
    toolResult.verificationResults.forEach(result => {
      if (!result.verified) {
        findings.push({
          type: 'false_claim',
          severity: 'high',
          message: `False claim: "${result.claim.text}" - ${result.explanation}`
        });
      }
      
      // Update state with verification results
      const stateClaim = this.state.claims.find(c => c.text === result.claim.text);
      if (stateClaim) {
        stateClaim.verified = result.verified;
        stateClaim.explanation = result.explanation;
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

    const verifiedCount = toolResult.verificationResults.filter(r => r.verified).length;
    const falseCount = toolResult.verificationResults.filter(r => !r.verified).length;
    const summary = `Analyzed ${this.state.claims.length} claims. Verified ${toolResult.verificationResults.length} high-priority claims: ${verifiedCount} true, ${falseCount} false. Found ${this.state.contradictions.length} contradictions.`;

    const recommendations = this.generateRecommendations(falseCount, this.state.contradictions.length);

    return {
      summary,
      findings,
      recommendations,
      llmCalls: toolResult.llmInteractions
    };
  }

  protected createInitialState(): FactCheckState {
    return {
      claims: [],
      contradictions: []
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