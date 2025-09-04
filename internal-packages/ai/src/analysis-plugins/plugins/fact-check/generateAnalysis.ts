import type { VerifiedFact } from './VerifiedFact';

export interface AnalysisResult {
  summary: string;
  analysisSummary: string;
}

/**
 * Generate analysis summary and detailed report for fact-checking results
 */
export function generateAnalysis(facts: VerifiedFact[]): AnalysisResult {
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

  // Impact-oriented analysis with template structure
  let analysisSummary = "";

  // Key Findings (prioritize by severity)
  if (falseFacts > 0 || partiallyTrueFacts > 0) {
    analysisSummary += "**Key Findings:**\n";
    if (falseFacts > 0) {
      const highImportanceFalse = facts.filter(
        (f) =>
          f.verification?.verdict === "false" && f.claim.importanceScore >= 70
      ).length;
      if (highImportanceFalse > 0) {
        analysisSummary += `- ${highImportanceFalse} critical false claim${highImportanceFalse !== 1 ? "s" : ""} affecting main arguments\n`;
      }
      const otherFalse = falseFacts - (highImportanceFalse || 0);
      if (otherFalse > 0) {
        analysisSummary += `- ${otherFalse} additional false claim${otherFalse !== 1 ? "s" : ""} requiring correction\n`;
      }
    }
    if (partiallyTrueFacts > 0) {
      analysisSummary += `- ${partiallyTrueFacts} partially accurate claim${partiallyTrueFacts !== 1 ? "s" : ""} needing clarification\n`;
    }
    analysisSummary += "\n";
  }

  // Document Impact
  if (falseFacts > 0 || partiallyTrueFacts > 0) {
    analysisSummary += "**Document Impact:**\n";
    const highImportanceFalse = facts.filter(
      (f) =>
        f.verification?.verdict === "false" && f.claim.importanceScore >= 70
    ).length;
    if (highImportanceFalse > 0) {
      analysisSummary +=
        "Critical factual errors may significantly undermine document credibility. Immediate review and correction recommended.\n";
    } else if (falseFacts > 0) {
      analysisSummary +=
        "Factual errors present but may not affect core arguments. Review recommended for accuracy.\n";
    } else {
      analysisSummary +=
        "Partially accurate claims detected. Overall document integrity maintained but clarifications would improve precision.\n";
    }
    analysisSummary += "\n";
  }

  // Specific Issues Found (for consistency with math plugin)
  if (falseFacts > 0 || partiallyTrueFacts > 0) {
    analysisSummary += "**🔍 Specific Issues Found:**\n\n";

    // Show false claims
    const falseClaimsList = facts
      .filter((f) => f.verification?.verdict === "false")
      .sort((a, b) => b.claim.importanceScore - a.claim.importanceScore)
      .slice(0, 3);

    if (falseClaimsList.length > 0) {
      analysisSummary += "**❌ False Claims:**\n";
      for (const fact of falseClaimsList) {
        const importance =
          fact.claim.importanceScore >= 70 ? " (Critical)" : "";
        analysisSummary += `- "${fact.claim.exactText}"${importance}\n`;
        if (fact.verification?.explanation) {
          analysisSummary += `  - ${fact.verification.explanation}\n`;
        }
      }

      const remainingFalse =
        facts.filter((f) => f.verification?.verdict === "false").length -
        falseClaimsList.length;
      if (remainingFalse > 0) {
        analysisSummary += `  - ...and ${remainingFalse} more false claim${remainingFalse !== 1 ? "s" : ""}\n`;
      }
    }

    // Show partially true claims
    const partialClaimsList = facts
      .filter((f) => f.verification?.verdict === "partially-true")
      .sort((a, b) => b.claim.importanceScore - a.claim.importanceScore)
      .slice(0, 2);

    if (partialClaimsList.length > 0) {
      analysisSummary += `\n**⚠️ Partially Accurate Claims:**\n`;
      for (const fact of partialClaimsList) {
        analysisSummary += `- "${fact.claim.exactText}"\n`;
        if (fact.verification?.explanation) {
          analysisSummary += `  - ${fact.verification.explanation}\n`;
        }
      }
    }

    analysisSummary += "\n";
  }

  // Technical Details (collapsible)
  if (totalFacts > 0) {
    analysisSummary += "<details>\n<summary>Technical Details</summary>\n\n";

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
      (f) =>
        f.verification?.verdict === "false" && f.claim.importanceScore >= 70
    ).length;

    // Quick summary with visual indicators
    analysisSummary += "**📊 Quick Summary:**\n";
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
      analysisSummary += indicators.join(" • ") + "\n\n";
    } else {
      analysisSummary += `📝 ${totalFacts} claim${totalFacts !== 1 ? "s" : ""} reviewed\n\n`;
    }

    analysisSummary += `**🔍 Verification Summary:**\n`;
    analysisSummary += `- ${totalFacts} factual claim${totalFacts !== 1 ? "s" : ""} extracted and analyzed\n`;
    analysisSummary += `- ${verifiedFacts} claim${verifiedFacts !== 1 ? "s" : ""} verified${researchedFacts > 0 ? ` (🔬 ${researchedFacts} with external research)` : ""}\n`;
    if (trueFacts > 0) {
      analysisSummary += `- ✅ ${trueFacts} verified as true\n`;
    }
    if (falseFacts > 0) {
      analysisSummary += `- ❌ ${falseFacts} verified as false\n`;
    }
    if (partiallyTrueFacts > 0) {
      analysisSummary += `- ⚠️ ${partiallyTrueFacts} verified as partially true\n`;
    }

    analysisSummary += `\n**📈 Claim Characteristics:**\n`;
    analysisSummary += `- ⭐ High importance claims: ${highImportanceFacts}\n`;
    analysisSummary += `- ⚠️ Likely false (≤40% truth probability): ${likelyFalseFacts}\n`;
    analysisSummary += `- ❓ Uncertain (41-70% truth probability): ${uncertainFacts}\n`;
    analysisSummary += `- 📊 Average quality score: ${Math.round(facts.reduce((sum, f) => sum + f.averageScore, 0) / totalFacts || 0)}\n`;

    const topicStats = facts.reduce(
      (acc, fact) => {
        acc[fact.topic] = (acc[fact.topic] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    analysisSummary += `\n**🏷️ Topics Covered:** ${Object.entries(topicStats)
      .sort((a, b) => b[1] - a[1])
      .map(([topic, count]) => `${topic} (${count})`)
      .join(", ")}`;

    analysisSummary += "\n</details>";
  }

  return { summary, analysisSummary };
}