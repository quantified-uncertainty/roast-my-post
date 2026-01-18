/**
 * Epistemic Review Tool
 *
 * Final review step that:
 * 1. Filters out redundant/weak comments
 * 2. Generates comprehensive document summary
 * 3. Generates one-sentence evaluation summary
 */

import { z } from "zod";
import { Tool, type ToolContext } from "../base/Tool";
import { callClaudeWithTool } from "../../claude/wrapper";
import { MODEL_CONFIG } from "../../claude/wrapper";
import { fallacyReviewConfig } from "./config";
import type {
  FallacyReviewInput,
  FallacyReviewOutput,
  ReviewComment,
} from "./types";

const reviewCommentSchema = z.object({
  index: z.number().describe("Comment index in the original array (0-based)"),
  header: z.string().describe("Short title summarizing the issue"),
  description: z.string().describe("Detailed explanation of the epistemic issue"),
  level: z.enum(['error', 'warning', 'nitpick', 'info', 'success', 'debug']).describe("Severity level of the issue"),
  importance: z.number().optional().describe("Importance score from 0-100 (higher = more important)"),
  quotedText: z.string().describe("The exact text from the document that has the issue"),
}) satisfies z.ZodType<ReviewComment>;

const inputSchema = z.object({
  documentText: z.string().min(1).describe("The full document text being analyzed for epistemic issues"),
  comments: z.array(reviewCommentSchema).min(0).describe("Array of epistemic comments to review and filter for redundancy"),
  customSystemPrompt: z.string().optional().describe("Custom system prompt override"),
}) satisfies z.ZodType<FallacyReviewInput>;

const outputSchema = z.object({
  commentIndicesToKeep: z.array(z.number()).describe("Indices of comments to keep after filtering redundant/weak ones"),
  documentSummary: z.string().min(200).max(800).describe("Comprehensive 200-600 word analysis of the document's overall epistemic quality"),
  oneLineSummary: z.string().min(20).max(200).describe("One-sentence summary capturing the essence of the epistemic evaluation"),
}) satisfies z.ZodType<FallacyReviewOutput>;

export class FallacyReviewTool extends Tool<
  FallacyReviewInput,
  FallacyReviewOutput
> {
  config = fallacyReviewConfig;
  inputSchema = inputSchema;
  outputSchema = outputSchema;

  async execute(
    input: FallacyReviewInput,
    context: ToolContext
  ): Promise<FallacyReviewOutput> {
    context.logger.info(`[FallacyReview] Reviewing ${input.comments.length} comments`);

    // If no comments, return empty result with basic summaries
    if (input.comments.length === 0) {
      return {
        commentIndicesToKeep: [],
        documentSummary: "No fallacy issues were identified in this document during analysis. The content appears to present claims with adequate supporting context and reasoning. No obvious patterns of logical fallacies, misleading statistics, or deceptive framing were detected. The document maintains reasonable epistemic standards without significant reasoning flaws that would undermine its credibility or reliability.",
        oneLineSummary: "No significant fallacy issues detected",
      };
    }

    // Format comments for the LLM
    const formattedComments = input.comments
      .map((comment, idx) => {
        return `**Comment ${idx}**:
Header: ${comment.header}
Level: ${comment.level}
Importance: ${comment.importance || 'N/A'}
Quoted Text: "${comment.quotedText.substring(0, 100)}${comment.quotedText.length > 100 ? '...' : ''}"
Description: ${comment.description}
`;
      })
      .join('\n---\n\n');

    // Default system prompt - can be overridden via input.customSystemPrompt
    const defaultSystemPrompt = `You are an expert epistemic review editor. Your job is to:

1. **Filter Comments** - Remove redundant, weak, or overly similar comments
   - Target keeping 50-90% of comments (be selective!)
   - Remove duplicates that make the same point
   - Keep only the most impactful and unique insights
   - Prioritize comments with higher importance scores
   - Remove comments that are too nitpicky or don't add much value

2. **Generate Document Summary** (200-600 words)
   - Analyze the document's overall epistemic quality
   - Identify patterns and systemic issues (not individual instances)
   - Discuss the document's credibility and reliability
   - Note any particularly strong or weak aspects of reasoning
   - Be analytical but fair - acknowledge both strengths and weaknesses

3. **Generate One-Sentence Summary**
   - Capture the essence of the document's epistemic quality
   - Be specific about the main issues found (if any)
   - Keep it concise but informative (20-150 characters)

**Guidelines:**
- If multiple comments say similar things, keep only the best one
- Prioritize variety - keep comments about different types of issues
- Don't keep every minor issue - focus on what matters
- Be ruthless about redundancy
- The document summary should read like a professional analysis, not just a list of issues`;

    const systemPrompt = input.customSystemPrompt || defaultSystemPrompt;

    const userPrompt = `Review the following epistemic analysis:

**Document Text** (first 2000 chars):
${input.documentText.substring(0, 2000)}${input.documentText.length > 2000 ? '\n...[truncated]...' : ''}

**Comments to Review** (${input.comments.length} total):

${formattedComments}

---

Please review these comments and provide:
1. Which comment indices to keep (e.g., [0, 2, 5, 7])
2. A comprehensive 200-600 word summary
3. A one-sentence summary`;

    try {
      const result = await callClaudeWithTool<FallacyReviewOutput>(
        {
          model: MODEL_CONFIG.analysis,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
          max_tokens: 2000,
          temperature: 0.2,
          toolName: "review_fallacy_comments",
          toolDescription: "Review and filter fallacy comments, generate summaries",
          toolSchema: {
            type: "object",
            properties: {
              commentIndicesToKeep: {
                type: "array",
                items: { type: "number" },
                description: "Array of comment indices to keep (0-based)",
              },
              documentSummary: {
                type: "string",
                description: "Comprehensive 200-600 word analysis of document's epistemic quality",
                minLength: 200,
                maxLength: 800,
              },
              oneLineSummary: {
                type: "string",
                description: "One-sentence summary of epistemic evaluation",
                minLength: 20,
                maxLength: 200,
              },
            },
            required: ["commentIndicesToKeep", "documentSummary", "oneLineSummary"],
          },
        },
        []
      );

      // Validate that indices are valid
      const validIndices = result.toolResult.commentIndicesToKeep.filter(
        (idx) => idx >= 0 && idx < input.comments.length
      );

      // Sort indices to maintain order
      validIndices.sort((a, b) => a - b);

      context.logger.info(
        `[FallacyReview] Filtered ${input.comments.length} comments down to ${validIndices.length}`
      );

      if (result.unifiedUsage) {
        context.logger.info(`[FallacyReview] Cost: $${result.unifiedUsage.costUsd?.toFixed(6) || 'N/A'}`);
      }

      return {
        commentIndicesToKeep: validIndices,
        documentSummary: result.toolResult.documentSummary,
        oneLineSummary: result.toolResult.oneLineSummary,
        unifiedUsage: result.unifiedUsage,
      };
    } catch (error) {
      context.logger.error("[FallacyReview] Review failed:", error);
      // Fallback: keep all comments and generate basic summaries
      return {
        commentIndicesToKeep: input.comments.map((_, idx) => idx),
        documentSummary: `The fallacy analysis identified ${input.comments.length} potential reasoning issues across the document. Due to a processing error, automated filtering and summarization could not be completed. All identified issues have been preserved for manual review. These issues may include logical fallacies, statistical misrepresentations, misleading framing, or other epistemic concerns that warrant careful examination.`,
        oneLineSummary: `Found ${input.comments.length} fallacy issues requiring review`,
      };
    }
  }
}

const fallacyReviewTool = new FallacyReviewTool();
export default fallacyReviewTool;
