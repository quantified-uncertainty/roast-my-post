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
): Promise<{
  comments: Comment[];
  llmInteractions: Array<{
    attempt: number;
    prompt: string;
    response: string;
    validCommentsCount: number;
    failedCommentsCount: number;
  }>;
}> {
  const comments: Comment[] = [];
  const llmInteractions: Array<{
    attempt: number;
    prompt: string;
    response: string;
    validCommentsCount: number;
    failedCommentsCount: number;
  }> = [];
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

    let validCommentsCount = 0;
    let failedCommentsCount = 0;

    // Validate new comments before adding them
    try {
      // Cast needed here as pre-processing might not satisfy Comment type perfectly yet
      const validComments = await validateComments(
        newComments as Comment[],
        document.content
      );
      validCommentsCount = validComments.length;
      failedCommentsCount = newComments.length - validComments.length;
      comments.push(...validComments);
      console.log(`✅ Added ${validComments.length} valid comments`);
    } catch (error) {
      failedCommentsCount = newComments.length;
      console.warn(`⚠️ Invalid comments in attempt ${attempts}:`, error);
      // Log the actual comments that failed validation
      console.warn(
        `Failed comments data (attempt ${attempts}):\n`,
        JSON.stringify(newComments, null, 2)
      );
    }

    // Record this interaction
    llmInteractions.push({
      attempt: attempts,
      prompt: prompt,
      response: rawResponse,
      validCommentsCount,
      failedCommentsCount
    });
  }

  return {
    comments,
    llmInteractions
  };
}
