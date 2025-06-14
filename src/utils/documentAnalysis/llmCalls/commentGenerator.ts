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
  console.log("getCommentData");

  while (comments.length < targetComments && attempts < maxAttempts) {
    attempts++;
    console.log(`💬 Attempt ${attempts}/${maxAttempts} to get comments...`);

    let prompt = getCommentPrompt(
      document,
      agentInfo,
      targetComments - comments.length
    );
    console.log(`Comment Prompt: ${prompt}`);

    const response = await openai.chat.completions.create({
      model: ANALYSIS_MODEL,
      temperature: DEFAULT_TEMPERATURE * (attempts / maxAttempts),
      messages: [
        {
          role: "system",
          content: `You are an expert document analyst. Your task is to provide detailed comments and insights.

IMPORTANT HIGHLIGHT RULES:
1. You MUST select text that exists EXACTLY in the document
2. The start text MUST appear before the end text
3. Select complete sentences or logical phrases
4. Keep highlights between 10-200 characters
5. Copy and paste the exact text, including spaces and punctuation
6. Do not modify or paraphrase the text in any way

If you cannot find exact matches for your highlights, choose different text that does exist in the document.`,
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

    console.log("83");
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
    } catch (error: unknown) {
      failedCommentsCount = newComments.length;
      console.warn(`⚠️ Invalid comments in attempt ${attempts}:`, error);
      // Log the actual comments that failed validation
      console.warn(
        `Failed comments data (attempt ${attempts}):\n`,
        JSON.stringify(newComments, null, 2)
      );

      // Add feedback to help the LLM learn from its mistakes
      const feedback = `Previous attempt failed with error: ${error instanceof Error ? error.message : String(error)}. Please ensure your highlights:
1. Are exact matches from the document
2. Have start text appearing before end text
3. Are between 10-200 characters
4. Are complete sentences or logical phrases
5. Include all spaces and punctuation exactly as in the document`;

      // Add feedback to the next attempt's prompt
      prompt = `${prompt}\n\n${feedback}`;
    }

    // Record this interaction
    llmInteractions.push({
      attempt: attempts,
      prompt: prompt,
      response: rawResponse,
      validCommentsCount,
      failedCommentsCount,
    });
  }

  return {
    comments,
    llmInteractions,
  };
}
