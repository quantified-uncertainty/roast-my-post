import type { VerifiedFact } from "../VerifiedFact";

/**
 * Pure functions for generating markdown content for fact-check analysis summaries.
 * These functions take data and return formatted markdown strings.
 */

/**
 * Generate the main summary line for the analysis
 */
export function generateSummary(facts: VerifiedFact[]): string {
  const totalFacts = facts.length;
  const falseFacts = facts.filter(
    (f) => f.verification?.verdict === "false"
  ).length;
  const partiallyTrueFacts = facts.filter(
    (f) => f.verification?.verdict === "partially-true"
  ).length;
  const verifiedFacts = facts.filter((f) => f.verification).length;

  // User-focused summary (prioritize by severity)
  let summary = "";
  if (falseFacts > 0) {
    const highImportanceFalse = facts.filter(
      (f) =>
        f.verification?.verdict === "false" && f.claim.importanceScore >= 70
    ).length;
    if (highImportanceFalse > 0) {
      summary = `Critical factual error${highImportanceFalse !== 1 ? "s" : ""} found in key claims`;
    } else {
      summary = `Factual error${falseFacts !== 1 ? "s" : ""} identified requiring correction`;
    }
  } else if (partiallyTrueFacts > 0) {
    summary = `Partially accurate claim${partiallyTrueFacts !== 1 ? "s" : ""} needing clarification`;
  } else if (verifiedFacts > 0) {
    summary = "Factual claims verified as accurate";
  } else {
    summary = `Factual content reviewed (${totalFacts} claim${totalFacts !== 1 ? "s" : ""})`;
  }

  return summary;
}

/**
 * Generate the detailed analysis summary markdown
 */
export function generateAnalysisSummary(facts: VerifiedFact[]): string {
  const totalFacts = facts.length;
  const falseFacts = facts.filter(
    (f) => f.verification?.verdict === "false"
  ).length;
  const partiallyTrueFacts = facts.filter(
    (f) => f.verification?.verdict === "partially-true"
  ).length;

  // Impact-oriented analysis with template structure
  let analysisSummary = "";

  // Key Findings (prioritize by severity)
  const keyFindings = generateKeyFindings(facts);
  if (keyFindings) {
    analysisSummary += keyFindings + "\n";
  }

  // Document Impact
  const documentImpact = generateDocumentImpact(facts);
  if (documentImpact) {
    analysisSummary += documentImpact + "\n";
  }

  // Specific Issues Found
  const specificIssues = generateSpecificIssues(facts);
  if (specificIssues) {
    analysisSummary += specificIssues + "\n";
  }

  // Technical Details (collapsible)
  if (totalFacts > 0) {
    analysisSummary += generateTechnicalDetails(facts);
  }

  return analysisSummary;
}

/**
 * Generate the Key Findings section
 */
function generateKeyFindings(facts: VerifiedFact[]): string {
  const falseFacts = facts.filter(
    (f) => f.verification?.verdict === "false"
  ).length;
  const partiallyTrueFacts = facts.filter(
    (f) => f.verification?.verdict === "partially-true"
  ).length;

  if (falseFacts === 0 && partiallyTrueFacts === 0) {
    return "";
  }

  let findings = "**Key Findings:**\n";

  if (falseFacts > 0) {
    const highImportanceFalse = facts.filter(
      (f) =>
        f.verification?.verdict === "false" && f.claim.importanceScore >= 70
    ).length;
    if (highImportanceFalse > 0) {
      findings += `- ${highImportanceFalse} critical false claim${highImportanceFalse !== 1 ? "s" : ""} affecting main arguments\n`;
    }
    const otherFalse = falseFacts - (highImportanceFalse || 0);
    if (otherFalse > 0) {
      findings += `- ${otherFalse} additional false claim${otherFalse !== 1 ? "s" : ""} requiring correction\n`;
    }
  }

  if (partiallyTrueFacts > 0) {
    findings += `- ${partiallyTrueFacts} partially accurate claim${partiallyTrueFacts !== 1 ? "s" : ""} needing clarification\n`;
  }

  return findings;
}

/**
 * Generate the Document Impact section
 */
function generateDocumentImpact(facts: VerifiedFact[]): string {
  const falseFacts = facts.filter(
    (f) => f.verification?.verdict === "false"
  ).length;
  const partiallyTrueFacts = facts.filter(
    (f) => f.verification?.verdict === "partially-true"
  ).length;

  if (falseFacts === 0 && partiallyTrueFacts === 0) {
    return "";
  }

  let impact = "**Document Impact:**\n";

  const highImportanceFalse = facts.filter(
    (f) => f.verification?.verdict === "false" && f.claim.importanceScore >= 70
  ).length;

  if (highImportanceFalse > 0) {
    impact +=
      "Critical factual errors may significantly undermine document credibility. Immediate review and correction recommended.\n";
  } else if (falseFacts > 0) {
    impact +=
      "Factual errors present but may not affect core arguments. Review recommended for accuracy.\n";
  } else {
    impact +=
      "Partially accurate claims detected. Overall document integrity maintained but clarifications would improve precision.\n";
  }

  return impact;
}

/**
 * Generate the Specific Issues Found section
 */
function generateSpecificIssues(facts: VerifiedFact[]): string {
  const falseFacts = facts.filter(
    (f) => f.verification?.verdict === "false"
  ).length;
  const partiallyTrueFacts = facts.filter(
    (f) => f.verification?.verdict === "partially-true"
  ).length;

  if (falseFacts === 0 && partiallyTrueFacts === 0) {
    return "";
  }

  let issues = "**🔍 Specific Issues Found:**\n\n";

  // Show false claims
  const falseClaimsList = facts
    .filter((f) => f.verification?.verdict === "false")
    .sort((a, b) => b.claim.importanceScore - a.claim.importanceScore)
    .slice(0, 3);

  if (falseClaimsList.length > 0) {
    issues += "**❌ False Claims:**\n";
    for (const fact of falseClaimsList) {
      const importance = fact.claim.importanceScore >= 70 ? " (Critical)" : "";
      issues += `- "${fact.claim.exactText}"${importance}\n`;
      if (fact.verification?.explanation) {
        issues += `  - ${fact.verification.explanation}\n`;
      }
    }

    const remainingFalse =
      facts.filter((f) => f.verification?.verdict === "false").length -
      falseClaimsList.length;
    if (remainingFalse > 0) {
      issues += `  - ...and ${remainingFalse} more false claim${remainingFalse !== 1 ? "s" : ""}\n`;
    }
  }

  // Show partially true claims
  const partialClaimsList = facts
    .filter((f) => f.verification?.verdict === "partially-true")
    .sort((a, b) => b.claim.importanceScore - a.claim.importanceScore)
    .slice(0, 2);

  if (partialClaimsList.length > 0) {
    issues += `\n**⚠️ Partially Accurate Claims:**\n`;
    for (const fact of partialClaimsList) {
      issues += `- "${fact.claim.exactText}"\n`;
      if (fact.verification?.explanation) {
        issues += `  - ${fact.verification.explanation}\n`;
      }
    }
  }

  return issues;
}

/**
 * Generate the Technical Details section (collapsible)
 */
function generateTechnicalDetails(facts: VerifiedFact[]): string {
  const totalFacts = facts.length;
  const verifiedFacts = facts.filter((f) => f.verification).length;
  const trueFacts = facts.filter(
    (f) => f.verification?.verdict === "true"
  ).length;
  const falseFacts = facts.filter(
    (f) => f.verification?.verdict === "false"
  ).length;
  const partiallyTrueFacts = facts.filter(
    (f) => f.verification?.verdict === "partially-true"
  ).length;
  const highImportanceFacts = facts.filter(
    (f) => f.claim.importanceScore >= 70
  ).length;

  let details = "<details>\n<summary>Technical Details</summary>\n\n";

  const researchedFacts = facts.filter(
    (f) => f.factCheckerOutput?.perplexityData
  ).length;
  const likelyFalseFacts = facts.filter(
    (f) => f.claim.truthProbability <= 40
  ).length;
  const uncertainFacts = facts.filter(
    (f) => f.claim.truthProbability > 40 && f.claim.truthProbability <= 70
  ).length;
  const highImportanceFalse = facts.filter(
    (f) => f.verification?.verdict === "false" && f.claim.importanceScore >= 70
  ).length;

  // Quick summary with visual indicators
  details += "**📊 Quick Summary:**\n";
  const indicators = [];
  if (highImportanceFalse > 0) {
    indicators.push(`🔴 ${highImportanceFalse} critical false`);
  }
  if (falseFacts > highImportanceFalse) {
    indicators.push(`🟡 ${falseFacts - highImportanceFalse} other false`);
  }
  if (partiallyTrueFacts > 0) {
    indicators.push(`🔵 ${partiallyTrueFacts} partially true`);
  }
  if (trueFacts > 0) {
    indicators.push(`✅ ${trueFacts} verified true`);
  }

  if (indicators.length > 0) {
    details += indicators.join(" • ") + "\n\n";
  } else {
    details += `📝 ${totalFacts} claim${totalFacts !== 1 ? "s" : ""} reviewed\n\n`;
  }

  details += `**🔍 Verification Summary:**\n`;
  details += `- ${totalFacts} factual claim${totalFacts !== 1 ? "s" : ""} extracted and analyzed\n`;
  details += `- ${verifiedFacts} claim${verifiedFacts !== 1 ? "s" : ""} verified${researchedFacts > 0 ? ` (🔬 ${researchedFacts} with external research)` : ""}\n`;
  if (trueFacts > 0) {
    details += `- ✅ ${trueFacts} verified as true\n`;
  }
  if (falseFacts > 0) {
    details += `- ❌ ${falseFacts} verified as false\n`;
  }
  if (partiallyTrueFacts > 0) {
    details += `- ⚠️ ${partiallyTrueFacts} verified as partially true\n`;
  }

  details += `\n**📈 Claim Characteristics:**\n`;
  details += `- ⭐ High importance claims: ${highImportanceFacts}\n`;
  details += `- ⚠️ Likely false (≤40% truth probability): ${likelyFalseFacts}\n`;
  details += `- ❓ Uncertain (41-70% truth probability): ${uncertainFacts}\n`;
  details += `- 📊 Average quality score: ${Math.round(facts.reduce((sum, f) => sum + f.averageScore, 0) / totalFacts || 0)}\n`;

  details += "\n</details>";

  return details;
}
