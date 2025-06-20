import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";
import type { Comment } from "../../../types/documentSchema";
import type { LLMInteraction, LLMRole } from "../../../types/llm";
import {
  ANALYSIS_MODEL,
  anthropic,
  DEFAULT_TEMPERATURE,
  withTimeout,
} from "../../../types/openai";
import {
  calculateApiCost,
  mapModelToCostModel,
} from "../../../utils/costCalculator";
import type { CommentAnalysisOutputs, TaskResult } from "../shared/types";
import { getCommentPrompts } from "./prompts";
import { createLogDetails } from "../shared/llmUtils";

import type { AnthropicResponse } from "./types";
import { convertCommentsToLineBased } from "./highlightConverter";
import { parseAnthropicResponse } from "./llmResponseParser";
import { 
  normalizeComments, 
  validateAndConvertComments,
  createValidationErrorFeedback 
} from "./commentValidator";

/**
 * Main function to generate comments for a document
 */
import type { ThinkingOutputs } from "../shared/types";

export async function getCommentData(
  document: Document,
  agentInfo: Agent,
  thinkingData: ThinkingOutputs,
  targetComments: number = 5,
  maxAttempts: number = 3
): Promise<{ task: TaskResult; outputs: CommentAnalysisOutputs }> {
  const startTime = Date.now();
  const comments: Comment[] = [];
  const llmInteractions: LLMInteraction[] = [];
  let attempts = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  while (comments.length < targetComments && attempts < maxAttempts) {
    attempts++;
    console.log(`💬 Attempt ${attempts}/${maxAttempts} to get comments...`);
    console.log(
      `📊 Current progress: ${comments.length}/${targetComments} valid comments`
    );

    // Generate prompt with existing comments converted to line-based format
    let { systemMessage, userMessage } = getCommentPrompts(
      document,
      agentInfo,
      thinkingData,
      targetComments - comments.length,
      convertCommentsToLineBased(comments, document)
    );

    console.log(`📝 Generated prompt: ${userMessage.length} characters`);

    const messages = [
      { role: "system" as LLMRole, content: systemMessage },
      { role: "user" as LLMRole, content: userMessage },
    ];

    try {
      // Call Anthropic API
      const response = await callAnthropicAPI(
        systemMessage,
        userMessage,
        attempts,
        maxAttempts
      );

      // Parse and validate response
      const validationResult = parseAnthropicResponse(response);
      const rawResponse = JSON.stringify(validationResult);

      // Normalize and validate comments
      const normalizedComments = normalizeComments(validationResult.comments);
      
      try {
        const validComments = await validateAndConvertComments(
          normalizedComments,
          document.content
        );
        
        comments.push(...validComments);
        console.log(`✅ Added ${validComments.length} valid comments`);
        
        // Record interaction
        llmInteractions.push({
          messages: [
            ...messages,
            { role: "assistant" as LLMRole, content: rawResponse },
          ],
          usage: {
            input_tokens: response.usage.input_tokens,
            output_tokens: response.usage.output_tokens,
          },
        });
        
        totalInputTokens += response.usage.input_tokens;
        totalOutputTokens += response.usage.output_tokens;
        
      } catch (error) {
        console.warn(`⚠️ Invalid comments in attempt ${attempts}:`, error);
        
        // Add error feedback to next attempt
        const feedback = createValidationErrorFeedback(
          error,
          validationResult.comments,
          document.content
        );
        userMessage = `${userMessage}\n\n${feedback}`;
      }
      
    } catch (error: any) {
      console.error(`❌ API error on attempt ${attempts}:`, error);
      
      // Handle specific error cases
      if (error?.status === 429) {
        const waitTime = Math.min(1000 * Math.pow(2, attempts - 1), 30000);
        console.log(`⏳ Rate limited, waiting ${waitTime}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }
      
      if (error?.status === 402) {
        throw new Error("Anthropic API quota exceeded. Please check your billing.");
      }
      
      if (error?.status === 401) {
        throw new Error("Anthropic API authentication failed. Please check your API key.");
      }
      
      if (error?.status >= 500) {
        console.warn(`🔄 Server error (${error.status}), will retry on next attempt`);
        continue;
      }
      
      throw new Error(
        `Anthropic API error (${error?.status || "unknown"}): ${error?.message || error}`
      );
    }
  }

  // Create task result
  const endTime = Date.now();
  const timeInSeconds = Math.round((endTime - startTime) / 1000);
  const cost = calculateApiCost(
    {
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
    },
    mapModelToCostModel(ANALYSIS_MODEL)
  );

  const logDetails = createLogDetails(
    "getCommentData",
    ANALYSIS_MODEL,
    startTime,
    endTime,
    cost,
    totalInputTokens,
    totalOutputTokens,
    {
      agentName: agentInfo.name,
      documentLength: document.content.length,
      attempts,
      targetComments,
      validComments: comments.length,
    },
    {
      comments,
    },
    `Generated ${comments.length} comments after ${attempts} attempts`
  );

  return {
    task: {
      name: "getCommentData",
      modelName: ANALYSIS_MODEL,
      priceInCents: cost,
      timeInSeconds,
      log: JSON.stringify(logDetails, null, 2),
      llmInteractions,
    },
    outputs: {
      comments,
    },
  };
}

/**
 * Calls the Anthropic API with the comment generation tool
 */
async function callAnthropicAPI(
  systemMessage: string,
  userMessage: string,
  attempt: number,
  maxAttempts: number
): Promise<AnthropicResponse> {
  console.log("🤖 Calling Anthropic API...");
  const apiCallStart = Date.now();
  
  const response = await withTimeout(
    anthropic.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 8000,
      temperature: DEFAULT_TEMPERATURE * (attempt / maxAttempts),
      system: systemMessage,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
      tools: [
        {
          name: "provide_comments",
          description:
            "Provide comments for the document. Use proper markdown formatting with newlines, headers, lists, etc. Make comments substantive and detailed.",
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
                      description: "Title of the comment",
                    },
                    description: {
                      type: "string",
                      description: "Detailed description of the comment",
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
                    importance: {
                      type: "number",
                      description: "Importance of the comment (0-100)",
                    },
                    grade: {
                      type: "number",
                      description: "Grade for this section (0-100)",
                    },
                  },
                  required: ["title", "description", "highlight"],
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
    `Anthropic API request timed out after 2 minutes (attempt ${attempt})`
  );
  
  const apiCallEnd = Date.now();
  console.log(
    `✅ Received response from Anthropic API (${Math.round((apiCallEnd - apiCallStart) / 1000)}s)`
  );
  
  return response as AnthropicResponse;
}