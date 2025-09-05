import type { VerifiedFact } from '../VerifiedFact';
import { escapeXml } from '../../../../shared/utils/xml';

/**
 * Pure functions for generating markdown content for fact-check comments.
 * These functions take data and return formatted markdown strings.
 */

/**
 * Build the main description content for a fact comment
 */
export function buildDescription(fact: VerifiedFact): string {
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

/**
 * Build description for facts that were not verified
 */
export function buildSkipDescription(fact: VerifiedFact): string {
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

/**
 * Build the title/header for a fact comment
 */
export function buildTitle(fact: VerifiedFact): string {
  const verdict = fact.verification?.verdict;
  const confidence = fact.verification?.confidence;

  // Use concise verdict with emoji
  let header = "";
  if (verdict === "false") {
    // For false verdicts, skip the "False:" prefix and just show the correction
    if (fact.verification?.displayCorrection) {
      // Use displayCorrection directly if it's already in XML format
      header = fact.verification.displayCorrection;
    } else if ((fact.verification as any)?.conciseCorrection) {
      // Backward compatibility: convert old format to XML
      const conciseCorrection = (fact.verification as any).conciseCorrection;
      const correctionMatch = conciseCorrection.match(/^(.+?)\s*→\s*(.+)$/);
      if (correctionMatch) {
        const [, wrongValue, correctValue] = correctionMatch;
        // Generate XML format
        header = `<r:replace from="${escapeXml(wrongValue.trim())}" to="${escapeXml(correctValue.trim())}"/>`;
      } else {
        // Fallback for non-arrow corrections
        header = conciseCorrection;
      }
    } else {
      // No correction available, just show "False"
      header = "False";
    }
  } else if (verdict === "partially-true") {
    header = "Partially true";
  } else if (verdict === "true") {
    header = "Verified";
  } else if (verdict === "unverifiable") {
    header = "Unverifiable";
  } else {
    header = "Claim Detected, Skipped";
  }

  return header;
}

/**
 * Get the severity level for a fact comment
 */
export function getLevel(fact: VerifiedFact): "error" | "warning" | "info" | "success" | "debug" {
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

/**
 * Build the observation text for a fact comment
 */
export function buildObservation(fact: VerifiedFact): string | undefined {
  if (fact.verification) {
    return fact.verification.explanation;
  }
  if (fact.claim.truthProbability <= 50) {
    return `This claim appears questionable (${fact.claim.truthProbability}% truth probability)`;
  }
  return undefined;
}

/**
 * Build the significance text for a fact comment
 */
export function buildSignificance(fact: VerifiedFact): string | undefined {
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

/**
 * Build the grade score for a fact comment
 */
export function buildGrade(fact: VerifiedFact): number | undefined {
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