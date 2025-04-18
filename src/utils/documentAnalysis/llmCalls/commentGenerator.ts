import type { Comment } from "../../../types/documentReview";
import { Document } from "../../../types/documents";
import { EvaluationAgent } from "../../../types/evaluationAgents";
import {
  ANALYSIS_MODEL,
  DEFAULT_TEMPERATURE,
  openai,
} from "../../../types/openai";
import { getCommentPrompt } from "../prompts";
import { validateComments } from "../utils/commentUtils";

export async function getCommentData(
  document: Document,
  agentInfo: EvaluationAgent,
  targetComments: number,
  maxAttempts = 3
): Promise<Comment[]> {
  const comments: Comment[] = [];
  let attempts = 0;

  while (comments.length < targetComments && attempts < maxAttempts) {
    attempts++;
    console.log(`💬 Attempt ${attempts}/${maxAttempts} to get comments...`);

    const prompt = getCommentPrompt(
      document,
      agentInfo,
      targetComments - comments.length
    );
    console.log(`Comment Prompt: ${prompt}`);

    const response = await openai.chat.completions.create({
      model: ANALYSIS_MODEL,
      temperature: DEFAULT_TEMPERATURE,
      messages: [
        {
          role: "system",
          content:
            "You are an expert document analyst. Provide detailed comments and insights.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    if (!response.choices[0]?.message?.content) {
      throw new Error("No response from LLM for comments");
    }

    console.log(`Response: ${response.choices[0]?.message?.content}`);

    // Strip potential markdown fences before parsing
    const rawResponse = response.choices[0].message.content;
    const jsonString = rawResponse.replace(/^```json\n?|\n?```$/g, "");

    const result = JSON.parse(jsonString); // Parse the cleaned string
    let newComments = result.comments || [];

    // Pre-process comments: Ensure 'importance' is a number
    newComments = newComments.map((comment: any) => {
      if (
        comment.importance !== undefined &&
        typeof comment.importance === "string"
      ) {
        const parsedImportance = parseInt(comment.importance, 10);
        // If parsing fails (NaN), keep it as is for validation to catch, or set a default?
        // Let's keep it for now, validation should catch NaN.
        comment.importance = isNaN(parsedImportance)
          ? comment.importance
          : parsedImportance;
      }
      // Pre-process grade as well
      if (comment.grade !== undefined && typeof comment.grade === "string") {
        const parsedGrade = parseInt(comment.grade, 10);
        comment.grade = isNaN(parsedGrade) ? comment.grade : parsedGrade;
      }
      return comment;
    });

    // Validate new comments before adding them
    try {
      // Cast needed here as pre-processing might not satisfy Comment type perfectly yet
      const validComments = await validateComments(
        newComments as Comment[],
        document.content
      );
      comments.push(...validComments);
      console.log(`✅ Added ${validComments.length} valid comments`);
    } catch (error) {
      console.warn(`⚠️ Invalid comments in attempt ${attempts}:`, error);
      // Log the actual comments that failed validation
      console.warn(
        `Failed comments data (attempt ${attempts}):\n`,
        JSON.stringify(newComments, null, 2)
      );
    }
  }

  return comments;
}
