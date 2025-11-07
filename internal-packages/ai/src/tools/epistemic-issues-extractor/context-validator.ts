/**
 * Context-aware validation to reduce false positives
 *
 * Validates detected epistemic issues by checking if the author is:
 * - COMMITTING the error (real issue)
 * - DISCUSSING the error (false positive)
 * - WARNING against the error (false positive)
 */

import { callClaudeWithTool } from "../../claude/wrapper";
import { ToolContext } from "../base/Tool";
import type { ExtractedEpistemicIssue } from "./types";

interface ValidationResult {
  isActualError: boolean;
  verdict: "COMMITTING" | "DISCUSSING" | "WARNING" | "UNCLEAR";
  adjustedSeverity: number;
  adjustedConfidence: number;
  reasoning: string;
}

const VALIDATION_EXAMPLES = `
EXAMPLE 1 - FALSE POSITIVE (Discussing):
Text: "Selection bias is a major problem in hiring research because we only see candidates who apply."
Issue Type: Selection Bias
Verdict: DISCUSSING - The author is explaining the concept, not committing the error.

EXAMPLE 2 - TRUE POSITIVE (Committing):
Text: "Our clients love us! 95% would recommend us to a friend."
Issue Type: Survivorship Bias
Verdict: COMMITTING - Only surveying existing clients (survivors) creates bias.

EXAMPLE 3 - FALSE POSITIVE (Warning):
Text: "Be careful not to generalize from a single case study."
Issue Type: Hasty Generalization
Verdict: WARNING - The author is cautioning against this error.

EXAMPLE 4 - TRUE POSITIVE (Committing):
Text: "Studies show that our approach is highly effective."
Issue Type: Weasel Words
Verdict: COMMITTING - Vague authority claim without specific citation.

EXAMPLE 5 - FALSE POSITIVE (Discussing):
Text: "There isn't a cheap way to run true RCTs on hiring, so we're stuck with observational data and its selection biases."
Issue Type: Selection Bias
Verdict: DISCUSSING - Author acknowledges the limitation; this is good epistemics.

EXAMPLE 6 - TRUE POSITIVE (Committing):
Text: "Since launching in March 2020, we've delivered 847% returns."
Issue Type: Cherry-picked Timeframe
Verdict: COMMITTING - March 2020 was market bottom; this timeframe inflates results.
`;

export async function validateIssueInContext(
  issue: ExtractedEpistemicIssue,
  fullChunkText: string,
  context: ToolContext
): Promise<ValidationResult> {
  const systemPrompt = `You are an expert at distinguishing between authors COMMITTING epistemic errors vs. DISCUSSING or WARNING about them.

${VALIDATION_EXAMPLES}

Your task: Determine if the flagged text is an ACTUAL error or a FALSE POSITIVE.

Key principles:
1. If the author is TEACHING about the concept → FALSE POSITIVE
2. If the author is WARNING against the error → FALSE POSITIVE
3. If the author is ACKNOWLEDGING a limitation → FALSE POSITIVE (this is good epistemics!)
4. If the author is MAKING the error themselves → TRUE POSITIVE

Be especially careful with:
- Academic/technical writing that discusses methodological limitations
- Authors explaining why something is difficult/impossible
- Meta-discussion about argumentation and evidence

Output your verdict with confidence 0-100.
`;

  const userPrompt = `
Full chunk of text:
"""
${fullChunkText}
"""

Flagged text: "${issue.exactText}"
Issue type: ${issue.issueType}
Original reasoning: ${issue.reasoning}

Is the author COMMITTING this error, DISCUSSING it, WARNING about it, or is it UNCLEAR?

Consider:
- Is this author explaining a concept or making the error?
- Is this acknowledging a limitation (good) or hiding one (bad)?
- Does the surrounding context resolve the issue?
`;

  try {
    const response = await callClaudeWithTool<ValidationResult>({
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: 1000,
      temperature: 0,
      toolName: "validate_epistemic_issue",
      toolDescription: "Validate if detected issue is real or false positive",
      toolSchema: {
        type: "object",
        properties: {
          verdict: {
            type: "string",
            enum: ["COMMITTING", "DISCUSSING", "WARNING", "UNCLEAR"],
            description: "Is author committing the error or discussing it?",
          },
          adjustedConfidence: {
            type: "number",
            description: "0-100: Confidence this is an actual error (not false positive)",
          },
          reasoning: {
            type: "string",
            description: "Brief explanation of verdict",
          },
        },
        required: ["verdict", "adjustedConfidence", "reasoning"],
      },
    });

    const result = response.toolResult;
    const isActualError = result.verdict === "COMMITTING";

    // If not committing, dramatically reduce confidence
    const adjustedConfidence = isActualError
      ? result.adjustedConfidence
      : Math.min(20, result.adjustedConfidence);

    // Adjust severity based on confidence
    const adjustedSeverity = isActualError
      ? issue.severityScore
      : Math.min(30, issue.severityScore);

    return {
      isActualError,
      verdict: result.verdict,
      adjustedSeverity,
      adjustedConfidence,
      reasoning: result.reasoning,
    };
  } catch (error) {
    context.logger.error("Context validation failed", { error });
    // On error, assume it's real but lower confidence
    return {
      isActualError: true,
      verdict: "UNCLEAR",
      adjustedSeverity: issue.severityScore * 0.7,
      adjustedConfidence: issue.confidenceScore * 0.7,
      reasoning: "Validation failed; defaulting to lower confidence",
    };
  }
}

/**
 * Batch validate multiple issues efficiently
 */
export async function validateIssuesBatch(
  issues: ExtractedEpistemicIssue[],
  fullChunkText: string,
  context: ToolContext
): Promise<Map<ExtractedEpistemicIssue, ValidationResult>> {
  const results = new Map<ExtractedEpistemicIssue, ValidationResult>();

  // Validate issues in parallel (up to 5 at a time to avoid rate limits)
  const batchSize = 5;
  for (let i = 0; i < issues.length; i += batchSize) {
    const batch = issues.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(issue => validateIssueInContext(issue, fullChunkText, context))
    );

    batch.forEach((issue, idx) => {
      results.set(issue, batchResults[idx]);
    });
  }

  return results;
}
