import type { DocumentLocation } from "../../../shared/types";
import { CommentSeverity, SEVERITY_STYLES } from "../../utils/comment-styles";
import { THRESHOLDS } from "./constants";
import type { VerifiedFact } from "./index";

export function generateFactCheckComments(
  fact: VerifiedFact,
  location: DocumentLocation
): { description: string } | null {
  const content = generateCommentContent(fact, location);

  // Don't create a comment if the content is empty
  if (!content || content.trim() === "") {
    return null;
  }

  return {
    description: content,
  };
}

function generateCommentContent(
  fact: VerifiedFact,
  _location?: DocumentLocation
): string {
  // Determine severity and emoji based on verification status
  let severity: CommentSeverity;
  let emoji: string;
  let headerContent = "";

  if (fact.verification) {
    switch (fact.verification.verdict) {
      case "false":
        severity = CommentSeverity.HIGH;
        emoji = "⚠️";
        // Use conciseCorrection if available
        if (fact.verification.conciseCorrection) {
          headerContent = fact.verification.conciseCorrection;
        } else {
          headerContent = "Incorrect";
        }
        break;
      case "partially-true":
        severity = CommentSeverity.MEDIUM;
        emoji = "📝";
        headerContent = "Partially correct";
        break;
      case "outdated":
        severity = CommentSeverity.MEDIUM;
        emoji = "📅";
        headerContent = "Outdated";
        break;
      case "true":
        severity = CommentSeverity.GOOD;
        emoji = "✅";
        headerContent = "Verified";
        break;
      case "unverifiable":
        severity = CommentSeverity.LOW;
        emoji = "💡";
        headerContent = "Cannot verify";
        break;
      default:
        severity = CommentSeverity.INFO;
        emoji = "📋";
        headerContent = "Claim";
    }
  } else {
    // Unverified claims - only create comments for problematic or important ones
    if (
      fact.claim.truthProbability <= THRESHOLDS.TRUTH_PROBABILITY_LIKELY_FALSE
    ) {
      severity = CommentSeverity.HIGH;
      emoji = "🚨";
      headerContent = "Likely false";
    } else if (
      fact.claim.truthProbability <= THRESHOLDS.TRUTH_PROBABILITY_LOW
    ) {
      severity = CommentSeverity.MEDIUM;
      emoji = "⚠️";
      headerContent = "Questionable";
    } else if (
      fact.claim.importanceScore >= THRESHOLDS.IMPORTANCE_HIGH &&
      fact.claim.truthProbability < THRESHOLDS.TRUTH_PROBABILITY_HIGH
    ) {
      severity = CommentSeverity.LOW;
      emoji = "📍";
      headerContent = "Key claim";
    } else {
      // Don't create comments for unverified facts with high truth probability
      // These are just normal factual statements that don't need attention
      return "";
    }
  }

  const style = SEVERITY_STYLES[severity];
  const styledHeader = `${emoji} [Fact] <span style="color: ${style.color}">${headerContent}</span>`;

  // Build content sections
  let content = styledHeader;

  // Add research indicator if Perplexity was used
  if (fact.factCheckerOutput?.perplexityData) {
    content += `\n\n**🔍 Research conducted**: This claim was verified using external sources.`;
  }

  // Add explanation if available
  if (fact.verification?.explanation) {
    content += `  \n${fact.verification.explanation}`;
  } else if (
    !fact.verification &&
    fact.claim.truthProbability <= THRESHOLDS.TRUTH_PROBABILITY_MEDIUM
  ) {
    content += `  \nEstimated ${fact.claim.truthProbability}% probability of being true`;
  }

  // Add score table
  content += "\n\n";
  content += "| Metric | Score |\n";
  content += "|--------|-------|\n";
  content += `| Importance | ${fact.claim.importanceScore}/100 |\n`;
  content += `| Checkability | ${fact.claim.checkabilityScore}/100 |\n`;
  content += `| Truth Probability | ${fact.claim.truthProbability}% |\n`;

  // Add verification confidence if available
  if (fact.verification?.confidence) {
    const confidenceMap = { low: "⚪", medium: "🟡", high: "🟢" };
    const confidenceEmoji = confidenceMap[fact.verification.confidence] || "";
    content += `| Verification Confidence | ${confidenceEmoji} ${fact.verification.confidence} |\n`;
  }

  // Add sources if available
  if (fact.verification?.sources && fact.verification.sources.length > 0) {
    content += "\n\n### Sources\n\n";
    fact.verification.sources.forEach((source) => {
      content += `- [${source.title}](${source.url})\n`;
    });
  }

  // Add Perplexity debug information if available
  if (fact.factCheckerOutput?.perplexityData) {
    content += "\n\n<details>\n<summary>Debug: Research Data</summary>\n\n";
    content += "```json\n";
    content += JSON.stringify(fact.factCheckerOutput.perplexityData, null, 2);
    content += "\n```\n\n</details>";
  }

  return content;
}
