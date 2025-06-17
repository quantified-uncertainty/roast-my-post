import type { Agent } from "../../../types/agentSchema";
import { Document } from "../../../types/documents";
import type { Comment } from "../../../types/documentSchema";
import {
  ANALYSIS_MODEL,
  DEFAULT_TEMPERATURE,
  openai,
} from "../../../types/openai";
import { LineBasedHighlighter } from "../../highlightUtils";
import { preprocessCommentData } from "../llmResponseProcessor";
import { getCommentPrompts } from "../prompts";
import { validateComments } from "../utils/commentUtils";

function convertToLineBasedComments(comments: Comment[], document: Document) {
  const highlighter = new LineBasedHighlighter(document.content);
  return comments.map((comment) => ({
    title: comment.title,
    description: comment.description,
    highlight: highlighter.convertOffsetToLineBased(comment.highlight),
    importance: comment.importance ?? 50,
  }));
}

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
    console.log(
      `📊 Current progress: ${comments.length}/${targetComments} valid comments`
    );

    let prompt = getCommentPrompts(
      document,
      agentInfo,
      targetComments - comments.length,
      convertToLineBasedComments(comments, document)
    );

    console.log("📝 Generated prompt:", prompt);

    const response = await openai.chat.completions.create({
      model: ANALYSIS_MODEL,
      temperature: DEFAULT_TEMPERATURE * (attempts / maxAttempts),
      messages: [
        {
          role: "system",
          content: `You are ${agentInfo.name}, an expert ${agentInfo.purpose}.
Your purpose is to ${agentInfo.description}.
Your instructions are: ${agentInfo.genericInstructions}
${agentInfo.commentInstructions ? `\nYour instructions for comments are: ${agentInfo.commentInstructions}` : ""}

IMPORTANT LINE-BASED HIGHLIGHTING RULES:
1. Use startLineIndex/endLineIndex (0-based line numbers)
2. Use startCharacters/endCharacters (first ~6 chars to identify position within line)
3. Lines are split on \\n - could be paragraphs, sentences, headings, etc.
4. Count lines carefully - line 0 is the first line
5. Character snippets should be the first few characters of the highlight within that line
6. For single-line highlights: startLineIndex = endLineIndex
7. Character snippets help identify exact position when lines are long
8. DO NOT duplicate existing comments - focus on new sections of the document

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

    const rawResponse = response.choices[0].message.content;
    console.log(`Response: ${rawResponse}`);

    // Find the JSON object in the response, handling cases where there might be markdown content before it
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in LLM response");
    }

    // Strip potential markdown fences before parsing
    const jsonString = jsonMatch[0].replace(/^```json\n?|\n?```$/g, "");
    let result;
    try {
      result = JSON.parse(jsonString);
    } catch (error) {
      console.error("Failed to parse JSON:", jsonString);
      throw error;
    }

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
5. For single-line highlights: startLineIndex = endLineIndex
6. DO NOT duplicate existing comments - focus on new sections of the document
7. Keep highlights between 5-1000 characters - focus on the most important part of long sections`;

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

    // If we have some valid comments, don't retry for those sections
    if (validCommentsCount > 0) {
      console.log(
        `📝 Keeping ${validCommentsCount} valid comments and retrying for remaining ${targetComments - comments.length} comments`
      );
    }
  }

  return {
    comments,
    llmInteractions,
  };
}
