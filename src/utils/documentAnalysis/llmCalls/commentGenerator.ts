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

    let prompt = getCommentPrompt(
      document,
      agentInfo,
      targetComments - comments.length
    );

    const response = await openai.chat.completions.create({
      model: ANALYSIS_MODEL,
      temperature: DEFAULT_TEMPERATURE * (attempts / maxAttempts),
      messages: [
        {
          role: "system",
          content: `You are an expert document analyst. Your task is to provide detailed comments and insights using LINE-BASED highlighting.

IMPORTANT LINE-BASED HIGHLIGHTING RULES:
1. Use startLineIndex/endLineIndex (0-based line numbers)
2. Use startCharacters/endCharacters (first ~6 chars to identify position within line)
3. Lines are split on \\n - could be paragraphs, sentences, headings, etc.
4. Count lines carefully - line 0 is the first line
5. Character snippets should be the first few characters of the highlight within that line
6. For single-line highlights: startLineIndex = endLineIndex
7. Character snippets help identify exact position when lines are long

Example format:
{
  "highlight": {
    "startLineIndex": 2,
    "startCharacters": "The key",
    "endLineIndex": 2, 
    "endCharacters": "important."
  }
}`,
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
        newComments as any[], // Use any[] since we're now expecting line-based format
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
      const feedback = `Previous attempt failed with error: ${error instanceof Error ? error.message : String(error)}. Please ensure your highlights use the line-based format:
1. startLineIndex/endLineIndex are valid 0-based line numbers
2. startCharacters/endCharacters match the beginning of text on those lines
3. Line indices are within document bounds
4. Character snippets are 3-10 characters from the actual line content
5. For single-line highlights: startLineIndex = endLineIndex`;

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
