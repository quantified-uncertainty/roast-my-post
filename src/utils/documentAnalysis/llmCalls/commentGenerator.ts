import type {
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/messages/messages";

import type { Agent } from "../../../types/agentSchema";
import { Document } from "../../../types/documents";
import type { Comment } from "../../../types/documentSchema";
import {
  ANALYSIS_MODEL,
  anthropic,
  DEFAULT_TEMPERATURE,
  withTimeout,
} from "../../../types/openai";
import { LineBasedHighlighter } from "../../highlightUtils";
import { preprocessCommentData } from "../llmResponseProcessor";
import { getCommentPrompts } from "../prompts";
import { validateComments } from "../utils/commentUtils";

function convertToLineBasedComments(comments: Comment[], document: Document) {
  const highlighter = new LineBasedHighlighter(document.content);
  return comments.map((comment) => {
    // Ensure highlight has required properties for conversion
    if (
      typeof comment.highlight.startOffset === "number" &&
      typeof comment.highlight.endOffset === "number" &&
      typeof comment.highlight.quotedText === "string"
    ) {
      return {
        title: comment.title,
        description: comment.description,
        highlight: highlighter.convertOffsetToLineBased({
          startOffset: comment.highlight.startOffset,
          endOffset: comment.highlight.endOffset,
          quotedText: comment.highlight.quotedText,
        }),
        importance: comment.importance ?? 50,
      };
    } else {
      // If it's already in line-based format, use as-is
      return {
        title: comment.title,
        description: comment.description,
        highlight: comment.highlight as any, // Type assertion since we know it's line-based
        importance: comment.importance ?? 50,
      };
    }
  });
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
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }>;
  totalUsage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}> {
  const comments: Comment[] = [];
  const llmInteractions: Array<{
    attempt: number;
    prompt: string;
    response: string;
    validCommentsCount: number;
    failedCommentsCount: number;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }> = [];
  let attempts = 0;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  while (comments.length < targetComments && attempts < maxAttempts) {
    attempts++;
    console.log(`💬 Attempt ${attempts}/${maxAttempts} to get comments...`);
    console.log(
      `📊 Current progress: ${comments.length}/${targetComments} valid comments`
    );

    let promptData = getCommentPrompts(
      document,
      agentInfo,
      targetComments - comments.length,
      convertToLineBasedComments(comments, document)
    );

    console.log(
      `📝 Generated prompt: ${promptData.userMessage.length} characters`
    );

    let response;
    let result;
    let rawResponse;

    console.log("🤖 Calling Anthropic API...");
    const apiCallStart = Date.now();
    try {
      response = await withTimeout(
        anthropic.messages.create({
          model: ANALYSIS_MODEL,
          max_tokens: 8000,
          temperature: DEFAULT_TEMPERATURE * (attempts / maxAttempts),
          system: promptData.systemMessage,
          messages: [
            {
              role: "user",
              content: promptData.userMessage,
            },
          ],
          tools: [
            {
              name: "provide_comments",
              description:
                "Provide concise, focused comments for the document. Keep descriptions under 200 words each.",
              input_schema: {
                type: "object",
                properties: {
                  comments: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: {
                          type: "string",
                          description:
                            "Clear, descriptive title for the comment",
                        },
                        description: {
                          type: "string",
                          description:
                            "Concise description (max 200 words) with specific insights. Use simple markdown formatting. Be substantive but brief.",
                        },
                        highlight: {
                          type: "object",
                          properties: {
                            startLineIndex: { type: "number" },
                            startCharacters: { type: "string" },
                            endLineIndex: { type: "number" },
                            endCharacters: { type: "string" },
                          },
                          required: [
                            "startLineIndex",
                            "startCharacters",
                            "endLineIndex",
                            "endCharacters",
                          ],
                        },
                        importance: { type: "number" },
                        grade: { type: "number" },
                      },
                      required: [
                        "title",
                        "description",
                        "highlight",
                        "importance",
                      ],
                    },
                  },
                },
                required: ["comments"],
              },
            },
          ],
          tool_choice: { type: "tool", name: "provide_comments" },
        }),
        120000, // 2 minute timeout
        `Anthropic API request timed out after 2 minutes (attempt ${attempts})`
      );
      const apiCallEnd = Date.now();
      console.log(
        `✅ Received response from Anthropic API (${Math.round((apiCallEnd - apiCallStart) / 1000)}s)`
      );
    } catch (error: any) {
      console.error(`❌ Anthropic API error on attempt ${attempts}:`, error);

      // Handle rate limiting with exponential backoff
      if (error?.status === 429) {
        const waitTime = Math.min(1000 * Math.pow(2, attempts - 1), 30000); // Max 30s
        console.log(`⏳ Rate limited, waiting ${waitTime}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue; // Retry this attempt
      }

      // Handle quota exceeded
      if (error?.status === 402) {
        throw new Error(
          "Anthropic API quota exceeded. Please check your billing."
        );
      }

      // Handle authentication errors
      if (error?.status === 401) {
        throw new Error(
          "Anthropic API authentication failed. Please check your API key."
        );
      }

      // Handle server errors (500-599) - these are retryable
      if (error?.status >= 500) {
        console.warn(
          `🔄 Server error (${error.status}), will retry on next attempt`
        );
        continue; // Continue to next attempt
      }

      // For other errors, throw immediately
      throw new Error(
        `Anthropic API error (${error?.status || "unknown"}): ${error?.message || error}`
      );
    }

    try {
      const toolUse = response.content.find(
        (c): c is ToolUseBlock => c.type === "tool_use"
      );
      if (!toolUse || toolUse.name !== "provide_comments") {
        throw new Error("No tool use response from Anthropic for comments");
      }

      result = toolUse.input as { comments: any[] };

      // Post-process to fix formatting issues from JSON tool use
      const fixFormatting = (text: string): string => {
        return text
          .replace(/\\n/g, "\n") // Convert escaped newlines to actual newlines
          .replace(/\\"/g, '"') // Convert escaped quotes
          .replace(/\\\\/g, "\\") // Convert escaped backslashes
          .trim();
      };

      // Fix formatting in comment descriptions and titles
      if (result.comments && Array.isArray(result.comments)) {
        result.comments = result.comments.map((comment: any) => ({
          ...comment,
          title: comment.title ? fixFormatting(comment.title) : comment.title,
          description: comment.description
            ? fixFormatting(comment.description)
            : comment.description,
        }));
      }

      rawResponse = JSON.stringify(result);
    } catch (error) {
      console.error(
        `❌ Failed to parse Anthropic response on attempt ${attempts}:`,
        error
      );
      continue; // Continue to next attempt
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

      // Add detailed feedback to help the LLM learn from its mistakes
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const feedback = `
VALIDATION ERROR FROM PREVIOUS ATTEMPT:
${errorMessage}

DEBUGGING TIPS FOR FIXING HIGHLIGHTS:
1. VERIFY LINE NUMBERS: Check that your startLineIndex and endLineIndex match the "Line X:" numbers in the document above
2. COPY TEXT EXACTLY: Your startCharacters and endCharacters must be copied EXACTLY from the specified lines
3. CHECK DOCUMENT BOUNDS: The document has ${document.content.split("\n").length} lines (0-${document.content.split("\n").length - 1})
4. USE PROPER SNIPPETS: Character snippets should be 3-8 characters from the actual line content
5. SINGLE-LINE RULE: If highlighting within one line, startLineIndex must equal endLineIndex
6. NO DUPLICATES: Don't create comments for sections already covered by existing comments
7. REASONABLE LENGTH: Keep highlights between 5-1000 characters

FAILED COMMENTS DEBUG INFO:
${JSON.stringify(newComments, null, 2)}

Please carefully review the line numbers and text snippets above, then create new highlights that exactly match the document content.`;

      // Add feedback to the next attempt's prompt
      promptData.userMessage = `${promptData.userMessage}\n\n${feedback}`;
    }

    // Record this interaction
    llmInteractions.push({
      attempt: attempts,
      prompt: promptData.userMessage,
      response: rawResponse,
      validCommentsCount,
      failedCommentsCount,
      usage: response.usage
        ? {
            prompt_tokens: response.usage.input_tokens,
            completion_tokens: response.usage.output_tokens,
            total_tokens:
              response.usage.input_tokens + response.usage.output_tokens,
          }
        : undefined,
    });

    // Update total token counts
    if (response.usage) {
      totalPromptTokens += response.usage.input_tokens;
      totalCompletionTokens += response.usage.output_tokens;
    }

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
    totalUsage: {
      prompt_tokens: totalPromptTokens,
      completion_tokens: totalCompletionTokens,
      total_tokens: totalPromptTokens + totalCompletionTokens,
    },
  };
}
