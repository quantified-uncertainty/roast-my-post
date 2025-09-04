import type { Comment, ToolChainResult } from '../../../shared/types';
import { CommentBuilder } from '../../utils/CommentBuilder';
import type { VerifiedFact } from './VerifiedFact';

/**
 * Builds a comment from a verified fact for UI presentation
 */
export async function buildFactComment(
  fact: VerifiedFact,
  documentText: string
): Promise<Comment | null> {
  const location = await fact.findLocation(documentText);
  if (!location) return null;

  // Build tool chain results
  const toolChain: ToolChainResult[] = [
    {
      toolName: "extractCheckableClaims",
      stage: "extraction",
      timestamp: new Date(fact.getProcessingStartTime() + 30).toISOString(),
      result: fact.claim,
    },
  ];

  // Add fact checking tool results if verification was done
  if (fact.factCheckerOutput) {
    toolChain.push({
      toolName: "factCheckWithPerplexity",
      stage: "verification",
      timestamp: new Date(fact.getProcessingStartTime() + 500).toISOString(),
      result: { ...fact.factCheckerOutput },
    });
  }

  if (fact.verification) {
    toolChain.push({
      toolName: "verifyClaimWithLLM",
      stage: "enhancement",
      timestamp: new Date().toISOString(),
      result: { ...fact.verification } as any,
    });
  }

  return CommentBuilder.build({
    plugin: "fact-check",
    location,
    chunkId: fact.getChunk().id,
    processingStartTime: fact.getProcessingStartTime(),
    toolChain,

    // Clean semantic description - include sources if available
    description: buildDescription(fact),

    // Structured content
    header: buildTitle(fact),
    level: getLevel(fact),
    observation: buildObservation(fact),
    significance: buildSignificance(fact),
    grade: buildGrade(fact),
  });
}

function buildDescription(fact: VerifiedFact): string {
  // If verified, use the verification explanation
  if (fact.verification?.explanation) {
    let description = fact.verification.explanation;

    // Add sources if available from Perplexity research
    if (fact.verification.sources && fact.verification.sources.length > 0) {
      description += "\n\nSources:";
      fact.verification.sources.forEach((source, index) => {
        description += `\n${index + 1}. ${source.title || "Source"} - ${source.url}`;
      });
    }

    return description;
  }

  // For unverified facts, provide detailed skip description
  return buildSkipDescription(fact);
}

function buildSkipDescription(fact: VerifiedFact): string {
  const shouldVerify = fact.shouldVerify();

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
      fact.claim.importanceScore < 60 &&
      fact.claim.checkabilityScore < 60
    ) {
      reasons.push("Both importance and checkability scores were too low.");
    } else if (fact.claim.importanceScore < 60) {
      reasons.push("Importance score was too low for prioritization.");
    } else if (fact.claim.checkabilityScore < 60) {
      reasons.push(
        "Checkability score was too low for efficient verification."
      );
    } else if (fact.claim.truthProbability > 70) {
      reasons.push(
        "Truth probability was too high (likely accurate) to prioritize."
      );
    } else {
      reasons.push("Did not meet combined scoring thresholds.");
    }

    detailedReason = reasons.join(" ");
  }

  return `**Claim Found:**
> "${fact.claim.exactText}"

**Skip Reason:** ${skipReason}

**Scoring Breakdown:**
- Importance: ${fact.claim.importanceScore}/100${fact.claim.importanceScore >= 60 ? " ✓" : ""} (threshold: ≥60)
- Checkability: ${fact.claim.checkabilityScore}/100${fact.claim.checkabilityScore >= 60 ? " ✓" : ""} (threshold: ≥60)
- Truth Probability: ${fact.claim.truthProbability}%${fact.claim.truthProbability <= 70 ? " ⚠️" : ""} (threshold: ≤70%)

${detailedReason}`;
}

function buildTitle(fact: VerifiedFact): string {
  const verdict = fact.verification?.verdict;
  const confidence = fact.verification?.confidence;

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
  if (verdict === "false" && fact.verification?.conciseCorrection) {
    header += `: ${fact.verification.conciseCorrection}`;
  }

  return header;
}

function getLevel(fact: VerifiedFact): "error" | "warning" | "info" | "success" | "debug" {
  const verdict = fact.verification?.verdict;
  if (verdict === "false") return "error";
  if (verdict === "partially-true") return "warning";
  if (verdict === "true") return "success";

  // For unverified facts:
  // - Important facts that should have been verified: 'info' (visible by default)
  // - Low priority facts: 'debug' (hidden by default)
  if (!fact.verification) {
    return fact.shouldVerify() ? "info" : "debug";
  }

  return "info";
}

function buildObservation(fact: VerifiedFact): string | undefined {
  if (fact.verification) {
    return fact.verification.explanation;
  }
  if (fact.claim.truthProbability <= 50) {
    return `This claim appears questionable (${fact.claim.truthProbability}% truth probability)`;
  }
  return undefined;
}

function buildSignificance(fact: VerifiedFact): string | undefined {
  if (
    fact.verification?.verdict === "false" &&
    fact.claim.importanceScore >= 8
  ) {
    return "High-importance false claim";
  }
  if (fact.verification?.verdict === "false") {
    return "False claim identified";
  }
  if (fact.verification?.verdict === "partially-true") {
    return "Claim with missing context or nuances";
  }
  if (fact.claim.importanceScore >= 8 && !fact.verification) {
    return "This is a key claim that should be verified with credible sources";
  }
  return undefined;
}

function buildGrade(fact: VerifiedFact): number | undefined {
  if (fact.verification?.verdict === "false") {
    return 0.2; // Low grade for false claims
  }
  if (
    fact.verification?.verdict === "true" &&
    fact.verification.confidence === "high"
  ) {
    return 0.9; // High grade for verified true claims
  }
  return undefined;
}