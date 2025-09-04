import type { Comment, ToolChainResult } from '../../../shared/types';
import { CommentBuilder } from '../../utils/CommentBuilder';
import { VerifiedFact } from './VerifiedFact';

/**
 * Extension of VerifiedFact that adds comment generation capabilities
 */
export class VerifiedFactWithComment extends VerifiedFact {
  async toComment(documentText: string): Promise<Comment | null> {
    const location = await this.findLocation(documentText);
    if (!location) return null;

    // Build tool chain results
    const toolChain: ToolChainResult[] = [
      {
        toolName: "extractCheckableClaims",
        stage: "extraction",
        timestamp: new Date(this.getProcessingStartTime() + 30).toISOString(),
        result: this.claim,
      },
    ];

    // Add fact checking tool results if verification was done
    if (this.factCheckerOutput) {
      toolChain.push({
        toolName: "factCheckWithPerplexity",
        stage: "verification",
        timestamp: new Date(this.getProcessingStartTime() + 500).toISOString(),
        result: { ...this.factCheckerOutput },
      });
    }

    if (this.verification) {
      toolChain.push({
        toolName: "verifyClaimWithLLM",
        stage: "enhancement",
        timestamp: new Date().toISOString(),
        result: this.verification,
      });
    }

    return CommentBuilder.build({
      plugin: "fact-check",
      location,
      chunkId: this.getChunk().id,
      processingStartTime: this.getProcessingStartTime(),
      toolChain,

      // Clean semantic description - include sources if available
      description: this.buildDescription(),

      // Structured content
      header: this.buildTitle(),
      level: this.getLevel(),
      observation: this.buildObservation(),
      significance: this.buildSignificance(),
      grade: this.buildGrade(),
    });
  }

  private buildDescription(): string {
    // If verified, use the verification explanation
    if (this.verification?.explanation) {
      let description = this.verification.explanation;

      // Add sources if available from Perplexity research
      if (this.verification.sources && this.verification.sources.length > 0) {
        description += "\n\nSources:";
        this.verification.sources.forEach((source, index) => {
          description += `\n${index + 1}. ${source.title || "Source"} - ${source.url}`;
        });
      }

      return description;
    }

    // For unverified facts, provide detailed skip description
    return this.buildSkipDescription();
  }

  private buildSkipDescription(): string {
    const shouldVerify = this.shouldVerify();

    // Determine skip reason
    let skipReason: string;
    let detailedReason: string;

    if (shouldVerify) {
      // Should have been verified but wasn't (likely hit limit)
      skipReason = "Processing limit reached (max 25 claims per analysis)";
      detailedReason =
        "This claim qualified for verification but was skipped due to resource limits. Consider manual fact-checking for high-priority claims like this.";
    } else {
      // Low priority - determine why
      skipReason = "Low priority for fact-checking resources";

      const reasons = [];
      if (
        this.claim.importanceScore < 60 &&
        this.claim.checkabilityScore < 60
      ) {
        reasons.push("Both importance and checkability scores were too low.");
      } else if (this.claim.importanceScore < 60) {
        reasons.push("Importance score was too low for prioritization.");
      } else if (this.claim.checkabilityScore < 60) {
        reasons.push(
          "Checkability score was too low for efficient verification."
        );
      } else if (this.claim.truthProbability > 70) {
        reasons.push(
          "Truth probability was too high (likely accurate) to prioritize."
        );
      } else {
        reasons.push("Did not meet combined scoring thresholds.");
      }

      detailedReason = reasons.join(" ");
    }

    return `**Claim Found:**
> "${this.claim.exactText}"

**Skip Reason:** ${skipReason}

**Scoring Breakdown:**
- Importance: ${this.claim.importanceScore}/100${this.claim.importanceScore >= 60 ? " ✓" : ""} (threshold: ≥60)
- Checkability: ${this.claim.checkabilityScore}/100${this.claim.checkabilityScore >= 60 ? " ✓" : ""} (threshold: ≥60)
- Truth Probability: ${this.claim.truthProbability}%${this.claim.truthProbability <= 70 ? " ⚠️" : ""} (threshold: ≤70%)

${detailedReason}`;
  }

  private buildTitle(): string {
    const verdict = this.verification?.verdict;
    const confidence = this.verification?.confidence;

    // Use concise verdict with emoji
    let header = "";
    if (verdict === "false") {
      header = "False";
    } else if (verdict === "partially-true") {
      header = "Partially true";
    } else if (verdict === "true") {
      header = "Verified";
    } else if (verdict === "unverifiable") {
      header = "Unverifiable";
    } else {
      header = "Claim Detected, Skipped";
    }

    // Add confidence if available
    if (confidence && verdict !== "unverifiable") {
      header += ` (${confidence} confidence)`;
    }

    // Add concise correction if false
    if (verdict === "false" && this.verification?.conciseCorrection) {
      header += `: ${this.verification.conciseCorrection}`;
    }

    return header;
  }

  private getLevel(): "error" | "warning" | "info" | "success" | "debug" {
    const verdict = this.verification?.verdict;
    if (verdict === "false") return "error";
    if (verdict === "partially-true") return "warning";
    if (verdict === "true") return "success";

    // For unverified facts:
    // - Important facts that should have been verified: 'info' (visible by default)
    // - Low priority facts: 'debug' (hidden by default)
    if (!this.verification) {
      return this.shouldVerify() ? "info" : "debug";
    }

    return "info";
  }

  private buildObservation(): string | undefined {
    if (this.verification) {
      return this.verification.explanation;
    }
    if (this.claim.truthProbability <= 50) {
      return `This claim appears questionable (${this.claim.truthProbability}% truth probability)`;
    }
    return undefined;
  }

  private buildSignificance(): string | undefined {
    if (
      this.verification?.verdict === "false" &&
      this.claim.importanceScore >= 8
    ) {
      return "High-importance false claim";
    }
    if (this.verification?.verdict === "false") {
      return "False claim identified";
    }
    if (this.verification?.verdict === "partially-true") {
      return "Claim with missing context or nuances";
    }
    if (this.claim.importanceScore >= 8 && !this.verification) {
      return "This is a key claim that should be verified with credible sources";
    }
    return undefined;
  }

  private buildGrade(): number | undefined {
    if (this.verification?.verdict === "false") {
      return 0.2; // Low grade for false claims
    }
    if (
      this.verification?.verdict === "true" &&
      this.verification.confidence === "high"
    ) {
      return 0.9; // High grade for verified true claims
    }
    return undefined;
  }
}