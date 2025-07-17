/**
 * Fact checking plugin - uses FactCheck tool for core functionality
 */

import { BasePlugin } from '../BasePlugin';
import { ChunkResult, SynthesisResult, Finding, RoutingExample } from '../types';
import { TextChunk } from '../TextChunk';
import FactCheckTool from '../../../../tools/fact-check';
import { logger } from '../../../../lib/logger';
import { LocationUtils } from '../../utils/LocationUtils';

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
    lineNumber?: number;
    lineText?: string;
  }>;
  contradictions: Array<{
    claim1: string;
    claim2: string;
    explanation: string;
    lineNumber?: number;
    lineText?: string;
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
    
    // Create location utils for this chunk
    const chunkLocationUtils = new LocationUtils(chunk.text);

    // Convert tool claims to plugin state format
    toolResult.claims.forEach(claim => {
      const claimId = `${chunk.id}-${this.state.claims.length}`;
      
      // Try to find the claim text in the chunk to get line information
      let lineNumber: number | undefined;
      let lineText: string | undefined;
      
      const claimPosition = chunk.text.indexOf(claim.text);
      if (claimPosition !== -1) {
        const locationInfo = chunkLocationUtils.getLocationInfo(
          claimPosition,
          claimPosition + claim.text.length
        );
        
        if (locationInfo) {
          if (chunk.metadata?.lineInfo) {
            lineNumber = chunk.metadata.lineInfo.startLine + locationInfo.start.lineNumber - 1;
          } else {
            lineNumber = locationInfo.start.lineNumber;
          }
          lineText = locationInfo.start.lineText;
        }
      }
      
      this.state.claims.push({
        id: claimId,
        text: claim.text,
        chunkId: chunk.id,
        context: claim.context || chunk.getExpandedContext(100),
        topic: claim.topic,
        needsVerification: claim.importance === 'high' || claim.specificity === 'high',
        verified: claim.verified,
        explanation: claim.explanation,
        lineNumber,
        lineText
      });
    });

    // Add contradictions to state
    toolResult.contradictions.forEach(contradiction => {
      // Try to find line information for the first claim
      let lineNumber: number | undefined;
      let lineText: string | undefined;
      
      const claim1Position = chunk.text.indexOf(contradiction.claim1);
      if (claim1Position !== -1) {
        const locationInfo = chunkLocationUtils.getLocationInfo(
          claim1Position,
          claim1Position + contradiction.claim1.length
        );
        
        if (locationInfo) {
          if (chunk.metadata?.lineInfo) {
            lineNumber = chunk.metadata.lineInfo.startLine + locationInfo.start.lineNumber - 1;
          } else {
            lineNumber = locationInfo.start.lineNumber;
          }
          lineText = locationInfo.start.lineText;
        }
      }
      
      this.state.contradictions.push({
        ...contradiction,
        lineNumber,
        lineText
      });
    });

    // Convert contradictions to findings
    toolResult.contradictions.forEach(contradiction => {
      // Try to find line information for the first claim
      let lineNumber: number | undefined;
      let lineText: string | undefined;
      
      const claim1Position = chunk.text.indexOf(contradiction.claim1);
      if (claim1Position !== -1) {
        const locationInfo = chunkLocationUtils.getLocationInfo(
          claim1Position,
          claim1Position + contradiction.claim1.length
        );
        
        if (locationInfo) {
          if (chunk.metadata?.lineInfo) {
            lineNumber = chunk.metadata.lineInfo.startLine + locationInfo.start.lineNumber - 1;
          } else {
            lineNumber = locationInfo.start.lineNumber;
          }
          lineText = locationInfo.start.lineText;
        }
      }
      
      const finding: Finding = {
        type: 'contradiction',
        severity: 'high' as const,
        message: `Contradicting claims found: "${contradiction.claim1}" vs "${contradiction.claim2}"`
      };
      
      // Add location hint if available
      if (lineNumber && lineText) {
        finding.locationHint = {
          lineNumber,
          lineText,
          matchText: contradiction.claim1,
        };
      }
      
      findings.push(finding);
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

    // Prioritize claims if we have more than 50 (tool limit)
    const prioritizedClaims = claimsToVerify.length > 50 
      ? this.prioritizeClaimsForVerification(claimsToVerify, 50)
      : claimsToVerify;

    // Create a text block with prioritized claims for batch verification
    const claimsText = prioritizedClaims.map(claim => `${claim.text} (Topic: ${claim.topic})`).join('\n');

    // Use the tool to verify claims
    const toolResult = await FactCheckTool.run({
      text: claimsText,
      context: 'Claims extracted from document for verification',
      maxClaims: prioritizedClaims.length,
      verifyHighPriority: true
    }, {
      userId: 'plugin-system',
      logger
    });

    const findings: Finding[] = [];

    // Process verification results
    toolResult.verificationResults.forEach(result => {
      if (!result.verified) {
        // Find the original claim in state to get location info
        const stateClaim = this.state.claims.find(c => c.text === result.claim.text);
        
        const finding: Finding = {
          type: 'false_claim',
          severity: 'high',
          message: `False claim: "${result.claim.text}"`,
          metadata: {
            claim: result.claim.text,
            explanation: result.explanation,
            chunkId: stateClaim?.chunkId,
          }
        };
        
        // Add location hint if available
        if (stateClaim?.lineNumber && stateClaim?.lineText) {
          finding.locationHint = {
            lineNumber: stateClaim.lineNumber,
            lineText: stateClaim.lineText,
            matchText: result.claim.text,
          };
        }
        
        findings.push(finding);
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
      const finding: Finding = {
        type: 'contradiction',
        severity: 'medium',
        message: contradiction.explanation,
        metadata: {
          claim1: contradiction.claim1,
          claim2: contradiction.claim2,
        }
      };
      
      // Add location hint if available
      if (contradiction.lineNumber && contradiction.lineText) {
        finding.locationHint = {
          lineNumber: contradiction.lineNumber,
          lineText: contradiction.lineText,
          matchText: contradiction.claim1,
        };
      }
      
      findings.push(finding);
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


  private prioritizeClaimsForVerification(claims: any[], maxCount: number): any[] {
    // Prioritization strategy:
    // 1. High importance + high specificity (most verifiable and important)
    // 2. High importance + medium specificity 
    // 3. Medium importance + high specificity
    // 4. Others
    
    const sorted = [...claims].sort((a, b) => {
      // Calculate priority score (higher = better)
      const getScore = (claim: any) => {
        let score = 0;
        if (claim.importance === 'high') score += 10;
        else if (claim.importance === 'medium') score += 5;
        
        if (claim.specificity === 'high') score += 10;
        else if (claim.specificity === 'medium') score += 5;
        
        return score;
      };
      
      return getScore(b) - getScore(a);
    });
    
    return sorted.slice(0, maxCount);
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