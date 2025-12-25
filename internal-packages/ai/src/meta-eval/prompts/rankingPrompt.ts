/**
 * Prompt for N-way ranking comparison of evaluation comments
 */

import type { Comment } from "../../shared/types";
import type { RankingCandidate } from "../types";

function formatComments(comments: Comment[]): string {
  if (comments.length === 0) {
    return "(No comments provided)";
  }

  return comments
    .map((c, i) => {
      const parts = [
        `  Comment ${i + 1}:`,
        `    Header: ${c.header || "(none)"}`,
        `    Level: ${c.level || "(none)"}`,
        `    Description: ${c.description}`,
        `    Quoted: "${c.highlight.quotedText.slice(0, 100)}${c.highlight.quotedText.length > 100 ? "..." : ""}"`,
      ];
      return parts.join("\n");
    })
    .join("\n\n");
}

function formatCandidates(candidates: RankingCandidate[]): string {
  return candidates
    .map((candidate, i) => {
      const label = String.fromCharCode(65 + i); // A, B, C, ...
      const agentInfo = candidate.agentName
        ? ` (${candidate.agentName})`
        : "";
      return `### Candidate ${label}${agentInfo}
ID: ${candidate.versionId}

${formatComments(candidate.comments)}`;
    })
    .join("\n\n---\n\n");
}

export function buildRankingPrompt(
  sourceText: string,
  candidates: RankingCandidate[]
): string {
  const candidateLabels = candidates
    .map((_, i) => String.fromCharCode(65 + i))
    .join(", ");

  return `You are an expert evaluator comparing multiple AI-generated document analyses.

## Task
Compare the following ${candidates.length} candidate outputs (${candidateLabels}) and rank them from best to worst.

## Source Document
<document>
${sourceText}
</document>

## Candidates to Compare

${formatCandidates(candidates)}

## Evaluation Hierarchy

Use this strict hierarchy for comparison (earlier criteria trump later ones):

1. **VALIDITY** - Are the issues real? Hallucinations or false claims automatically lose.
2. **UTILITY** - Which output is more actionable and valuable to the reader?
3. **TONE** - Which is more constructive and professional? (final tiebreaker)

## Output Format

Respond with a JSON object in this exact format:
\`\`\`json
{
  "rankings": [
    { "versionId": "<id of best candidate>", "rank": 1, "relativeScore": 100 },
    { "versionId": "<id of second best>", "rank": 2, "relativeScore": <0-100> },
    ...
  ],
  "reasoning": "<3-5 sentence explanation of the ranking, referencing specific examples>"
}
\`\`\`

Guidelines for relativeScore:
- Best candidate always gets 100
- Other scores reflect relative quality (e.g., 85 = close second, 50 = significantly worse)
- Ties are allowed (same rank and similar relativeScore)

Be specific in your reasoning - cite actual comments when explaining why one output is better.`;
}
