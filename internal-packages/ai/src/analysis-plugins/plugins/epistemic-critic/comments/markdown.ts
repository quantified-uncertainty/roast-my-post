import type { EpistemicIssue } from "../EpistemicIssue";
import { ISSUE_TYPES } from "../constants";

/**
 * Pure functions for generating markdown content for epistemic critic comments.
 */

// Helper to escape markdown special characters
function escapeMd(s: string): string {
  return s.replace(/[[\]()*_`>]/g, (m) => `\\${m}`);
}

// Helper to sanitize URLs
function sanitizeUrl(u: string): string {
  try {
    const url = new URL(u, "https://example.com");
    const scheme = url.protocol.replace(":", "");
    return scheme === "http" || scheme === "https" ? u : "#";
  } catch {
    return "#";
  }
}

/**
 * Build the main description content for an epistemic issue comment
 */
export function buildDescription(issue: EpistemicIssue): string {
  const { issueType, reasoning, suggestedContext } = issue.issue;

  let description = `**Issue Type:** ${formatIssueType(issueType)}

**Text:** "${issue.text}"

**Analysis:** ${reasoning}`;

  // Add suggested context if available
  if (suggestedContext) {
    description += `\n\n**Suggested Context/Correction:**\n${suggestedContext}`;
  }

  // Add research findings if available
  if (issue.researchFindings) {
    description += `\n\n**Research Findings:**\n${issue.researchFindings.summary}`;

    if (
      issue.researchFindings.sources &&
      issue.researchFindings.sources.length > 0
    ) {
      const items = issue.researchFindings.sources.map((s, i) => {
        const url = sanitizeUrl(s);
        return `${i + 1}. [Source](${url})`;
      });
      description += "\n\nSources:\n" + items.join("\n");
    }
  }

  return description;
}

/**
 * Format issue type for display
 */
function formatIssueType(issueType: string): string {
  switch (issueType) {
    case ISSUE_TYPES.MISINFORMATION:
      return "Misinformation";
    case ISSUE_TYPES.MISSING_CONTEXT:
      return "Missing Critical Context";
    case ISSUE_TYPES.DECEPTIVE_WORDING:
      return "Deceptive/Misleading Wording";
    case ISSUE_TYPES.LOGICAL_FALLACY:
      return "Logical Fallacy";
    case ISSUE_TYPES.VERIFIED_ACCURATE:
      return "Verified Accurate";
    default:
      return "Epistemic Issue";
  }
}

/**
 * Build the title/header for an epistemic issue comment
 */
export function buildTitle(issue: EpistemicIssue): string {
  return issue.getHeader();
}

/**
 * Get the severity level for an epistemic issue comment
 */
export function getLevel(
  issue: EpistemicIssue
): "error" | "warning" | "info" | "success" {
  return issue.getCommentLevel();
}

/**
 * Build the observation text for an epistemic issue comment
 */
export function buildObservation(issue: EpistemicIssue): string | undefined {
  return issue.issue.reasoning;
}

/**
 * Build the significance text for an epistemic issue comment
 */
export function buildSignificance(issue: EpistemicIssue): string | undefined {
  const { severityScore, importanceScore, issueType } = issue.issue;

  if (severityScore >= 80) {
    if (issueType === ISSUE_TYPES.MISINFORMATION) {
      return "Critical misinformation that could mislead readers";
    }
    return "Critical epistemic issue requiring immediate attention";
  }

  if (severityScore >= 60 && importanceScore >= 70) {
    return "Significant issue affecting a key claim or argument";
  }

  if (issueType === ISSUE_TYPES.VERIFIED_ACCURATE && importanceScore >= 60) {
    return "Important claim verified as accurate";
  }

  return undefined;
}

/**
 * Get importance score for sorting
 */
export function getImportance(issue: EpistemicIssue): number {
  // Importance is a combination of severity and importance score
  // Range: 0-100
  const { severityScore, importanceScore } = issue.issue;
  return Math.round((severityScore * 0.6 + importanceScore * 0.4));
}
