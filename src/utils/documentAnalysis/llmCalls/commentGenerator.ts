import type { Agent } from "../../../types/agentSchema";
import { Document } from "../../../types/documents";
import type { Comment } from "../../../types/documentSchema";
import {
  ANALYSIS_MODEL,
  DEFAULT_TEMPERATURE,
  openai,
} from "../../../types/openai";
import { preprocessCommentData } from "../llmResponseProcessor";
import { getCommentPrompt } from "../prompts";
import { validateComments } from "../utils/commentUtils";

export async function getCommentData(
  document: Document,
  agentInfo: Agent,
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

    const rawResponse = response.choices[0].message.content;
    
    // Strip potential markdown fences before parsing
    const jsonString = rawResponse.replace(/^```json\n?|\n?```$/g, "");
    const result = JSON.parse(jsonString);
    
    // Pre-process comments using shared utility
    let newComments = preprocessCommentData(result.comments || []);

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
