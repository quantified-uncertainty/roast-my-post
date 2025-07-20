/**
 * Fact checking plugin - uses FactCheck tool for core functionality
 */

import { logger } from "../../../../lib/logger";
import FactCheckTool from "../../../../tools/fact-check";
import { FindingBuilder } from "../builders/FindingBuilder";
import { BasePlugin } from "../core/BasePlugin";
import { TextChunk } from "../TextChunk";
import {
  ChunkResult,
  Finding,
  LocatedFinding,
  RoutingExample,
  SynthesisResult,
} from "../types";

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
    chunkId?: string;
  }>;
}

export class FactCheckPlugin extends BasePlugin<FactCheckState> {
  constructor() {
    super({
      claims: [],
      contradictions: [],
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
        reason: "Contains specific statistical claim that can be verified",
      },
      {
        chunkText: "I believe the economy will improve next year",
        shouldProcess: false,
        reason: "Opinion/prediction, not a verifiable fact",
      },
      {
        chunkText:
          "Apple Inc. was founded in 1976 by Steve Jobs and Steve Wozniak",
        shouldProcess: true,
        reason: "Historical fact that can be verified",
      },
    ];
  }

  async processChunk(chunk: TextChunk): Promise<ChunkResult> {
    // Use the FactCheck tool to analyze this chunk
    const toolResult = await FactCheckTool.run(
      {
        text: chunk.text,
        context: chunk.getExpandedContext(100),
        maxClaims: 10,
        verifyHighPriority: false, // Don't verify in processChunk, save for synthesize
      },
      {
        userId: "plugin-system",
        logger,
      }
    );

    const findings: Finding[] = [];

    // Convert tool claims to plugin state format
    toolResult.claims.forEach((claim) => {
      const claimId = `${chunk.id}-${this.state.claims.length}`;

      // Try to get location info for the claim
      const tempFinding = FindingBuilder.info(claim.text)
        .withText(claim.text)
        .inChunk(chunk)
        .build();

      this.addToStateArray("claims", [
        {
          id: claimId,
          text: claim.text,
          chunkId: chunk.id,
          context: claim.context || chunk.getExpandedContext(100),
          topic: claim.topic,
          needsVerification:
            claim.importance === "high" || claim.specificity === "high",
          verified: claim.verified,
          explanation: claim.explanation,
        },
      ]);
    });

    // Add contradictions to state and create findings
    toolResult.contradictions.forEach((contradiction) => {
      const finding = FindingBuilder.forError(
        "contradiction",
        contradiction.claim1,
        `Contradicting claims found: "${contradiction.claim1}" vs "${contradiction.claim2}"`,
        "high"
      )
        .inChunk(chunk)
        .withMetadata({
          claim1: contradiction.claim1,
          claim2: contradiction.claim2,
          explanation: contradiction.explanation,
        })
        .build();

      // Always add as LocatedFinding for contradictions
      const locationHint = finding.locationHint || {
        lineNumber: 1,
        lineText: chunk.text.split("\n")[0] || chunk.text.substring(0, 100),
        matchText: contradiction.claim1 || "contradiction",
      };

      const locatedFinding: LocatedFinding = {
        ...finding,
        locationHint: {
          lineNumber: locationHint.lineNumber || 1,
          lineText: locationHint.lineText || "",
          matchText: locationHint.matchText || contradiction.claim1,
          startLineNumber: locationHint.startLineNumber,
          endLineNumber: locationHint.endLineNumber,
        },
      };
      this.addChunkFindings([locatedFinding]);

      // Store contradiction for analysis
      this.addToStateArray("contradictions", [
        {
          ...contradiction,
          chunkId: chunk.id,
        },
      ]);

      findings.push(finding);
    });

    // Calculate total metadata from tool interactions
    const totalTokens = toolResult.llmInteractions.reduce(
      (sum, interaction) => sum + (interaction.tokensUsed?.total || 0),
      0
    );
    const totalDuration = toolResult.llmInteractions.reduce(
      (sum, interaction) => sum + (interaction.duration || 0),
      0
    );

    return {
      findings,
      llmCalls: toolResult.llmInteractions,
      metadata: {
        tokensUsed: totalTokens,
        processingTime: totalDuration,
      },
    };
  }

  async synthesize(): Promise<SynthesisResult> {
    // If we have claims that need verification, use the tool to verify them
    const claimsToVerify = this.state.claims.filter(
      (claim) => claim.needsVerification
    );

    if (claimsToVerify.length === 0) {
      const summary = `Analyzed ${this.state.claims.length} claims. No high-priority claims found for verification. Found ${this.state.contradictions.length} contradictions.`;

      let analysisSummary = `## Fact Check Analysis\n\n`;
      analysisSummary += `### Claims Summary\n`;
      analysisSummary += `- Total claims identified: ${this.state.claims.length}\n`;
      analysisSummary += `- No high-priority claims requiring verification\n`;
      analysisSummary += `- Contradictions found: ${this.state.contradictions.length}\n\n`;

      if (this.state.contradictions.length > 0) {
        analysisSummary += `### Contradictions\n`;
        this.state.contradictions.slice(0, 5).forEach((contradiction) => {
          analysisSummary += `- "${contradiction.claim1}" vs "${contradiction.claim2}"\n`;
          analysisSummary += `  - ${contradiction.explanation}\n`;
        });
      }

      return {
        summary,
        analysisSummary,
        recommendations: [],
        llmCalls: [],
      };
    }

    // Prioritize claims if we have more than 50 (tool limit)
    const prioritizedClaims =
      claimsToVerify.length > 50
        ? this.prioritizeClaimsForVerification(claimsToVerify, 50)
        : claimsToVerify;

    // Create a text block with prioritized claims for batch verification
    const claimsText = prioritizedClaims
      .map((claim) => `${claim.text} (Topic: ${claim.topic})`)
      .join("\n");

    // Use the tool to verify claims
    const toolResult = await FactCheckTool.run(
      {
        text: claimsText,
        context: "Claims extracted from document for verification",
        maxClaims: prioritizedClaims.length,
        verifyHighPriority: true,
      },
      {
        userId: "plugin-system",
        logger,
      }
    );

    const findings: Finding[] = [];

    // Process verification results
    toolResult.verificationResults.forEach((result) => {
      if (!result.verified) {
        // Find the original claim in state
        const stateClaim = this.state.claims.find(
          (c) => c.text === result.claim.text
        );

        const finding = FindingBuilder.forError(
          "false_claim",
          result.claim.text,
          `False claim: "${result.claim.text}"`,
          "high"
        )
          .withMetadata({
            claim: result.claim.text,
            explanation: result.explanation,
            chunkId: stateClaim?.chunkId,
          })
          .build();

        // Add as LocatedFinding for comment generation
        const locatedFinding: LocatedFinding = {
          ...finding,
          locationHint: {
            lineNumber: 1,
            lineText: result.claim.text,
            matchText: result.claim.text,
          },
        };
        this.addChunkFindings([locatedFinding]);

        findings.push(finding);
      }

      // Update state with verification results
      const stateClaim = this.state.claims.find(
        (c) => c.text === result.claim.text
      );
      if (stateClaim) {
        stateClaim.verified = result.verified;
        stateClaim.explanation = result.explanation;
      }
    });

    // Contradiction findings are already added as LocatedFindings during processChunk
    // No need to add them again here

    const verifiedCount = toolResult.verificationResults.filter(
      (r) => r.verified
    ).length;
    const falseCount = toolResult.verificationResults.filter(
      (r) => !r.verified
    ).length;
    const summary = `Analyzed ${this.state.claims.length} claims. Verified ${toolResult.verificationResults.length} high-priority claims: ${verifiedCount} true, ${falseCount} false. Found ${this.state.contradictions.length} contradictions.`;

    // Build analysis summary markdown
    let analysisSummary = `## Fact Check Analysis\n\n`;

    analysisSummary += `### Claims Summary\n`;
    analysisSummary += `- Total claims identified: ${this.state.claims.length}\n`;
    analysisSummary += `- High-priority claims verified: ${toolResult.verificationResults.length}\n`;
    analysisSummary += `- Verified as true: ${verifiedCount}\n`;
    analysisSummary += `- Verified as false: ${falseCount}\n`;
    analysisSummary += `- Contradictions found: ${this.state.contradictions.length}\n\n`;

    if (falseCount > 0) {
      analysisSummary += `### False Claims\n`;
      toolResult.verificationResults
        .filter((r) => !r.verified)
        .forEach((result) => {
          analysisSummary += `- **"${result.claim.text}"**\n`;
          analysisSummary += `  - ${result.explanation}\n`;
        });
      analysisSummary += `\n`;
    }

    if (this.state.contradictions.length > 0) {
      analysisSummary += `### Contradictions\n`;
      this.state.contradictions.slice(0, 5).forEach((contradiction) => {
        analysisSummary += `- "${contradiction.claim1}" vs "${contradiction.claim2}"\n`;
        analysisSummary += `  - ${contradiction.explanation}\n`;
      });
      if (this.state.contradictions.length > 5) {
        analysisSummary += `- ...and ${this.state.contradictions.length - 5} more contradictions\n`;
      }
    }

    return {
      summary,
      analysisSummary,
      recommendations: [],
      llmCalls: toolResult.llmInteractions,
    };
  }

  protected createInitialState(): FactCheckState {
    return {
      claims: [],
      contradictions: [],
    };
  }

  private prioritizeClaimsForVerification(
    claims: any[],
    maxCount: number
  ): any[] {
    // Prioritization strategy:
    // 1. High importance + high specificity (most verifiable and important)
    // 2. High importance + medium specificity
    // 3. Medium importance + high specificity
    // 4. Others

    const sorted = [...claims].sort((a, b) => {
      // Calculate priority score (higher = better)
      const getScore = (claim: any) => {
        let score = 0;
        if (claim.importance === "high") score += 10;
        else if (claim.importance === "medium") score += 5;

        if (claim.specificity === "high") score += 10;
        else if (claim.specificity === "medium") score += 5;

        return score;
      };

      return getScore(b) - getScore(a);
    });

    return sorted.slice(0, maxCount);
  }
}
