import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";
import type { Comment } from "../../../types/documentSchema";
import type { LLMInteraction, LLMMessage } from "../../../types/llm";
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
import type { ComprehensiveAnalysisOutputs } from "../comprehensiveAnalysis";
import { getCommentExtractionPrompts } from "./prompts";
import { createLogDetails } from "../shared/llmUtils";
import { validateAndConvertComments } from "../commentGeneration/commentValidator";
import type { LineBasedComment } from "../commentGeneration/lineBasedHighlighter";

/**
 * Extract and format comments from the comprehensive analysis
 */
export async function extractCommentsFromAnalysis(
  document: Document,
  agentInfo: Agent,
  analysisData: ComprehensiveAnalysisOutputs,
  targetComments: number = 5
): Promise<{ task: TaskResult; outputs: CommentAnalysisOutputs }> {
  const startTime = Date.now();
  
  // If we have structured comment insights from the analysis, we can use them directly
  if (analysisData.commentInsights && analysisData.commentInsights.length > 0) {
    // Convert insights to comments format
    const comments: Comment[] = [];
    const lineBasedComments: LineBasedComment[] = [];
    
    // Take up to targetComments insights
    // Use all insights provided by the comprehensive analysis
    const insightsToUse = analysisData.commentInsights;
    
    for (const insight of insightsToUse) {
      // Parse location to get line numbers
      const lineMatch = insight.location.match(/[Ll]ines?\s*(\d+)(?:\s*-\s*(\d+))?/);
      let startLine = 1;
      let endLine = 1;
      
      if (lineMatch) {
        startLine = parseInt(lineMatch[1]);
        endLine = lineMatch[2] ? parseInt(lineMatch[2]) : startLine;
      }
      
      // Get the actual line content to extract character snippets
      const lines = document.content.split('\n');
      const startLineContent = lines[startLine - 1] || '';
      const endLineContent = lines[endLine - 1] || '';
      
      // Extract character snippets, ensuring we always have valid content
      let startCharacters = startLineContent.slice(0, 10).trim();
      let endCharacters = endLineContent.length > 10 
        ? endLineContent.slice(-10).trim() 
        : endLineContent.trim();
      
      // Fallback: if snippets are empty, use first/last non-empty content
      if (!startCharacters) {
        // Look for first non-empty content starting from the highlight
        for (let i = startLine - 1; i < Math.min(startLine + 2, lines.length); i++) {
          const line = lines[i];
          if (line && line.trim()) {
            startCharacters = line.slice(0, 10).trim();
            break;
          }
        }
        // Ultimate fallback
        if (!startCharacters) startCharacters = "...";
      }
      
      if (!endCharacters) {
        // Look for last non-empty content ending at the highlight
        for (let i = endLine - 1; i >= Math.max(endLine - 3, 0); i--) {
          const line = lines[i];
          if (line && line.trim()) {
            endCharacters = line.slice(-10).trim();
            break;
          }
        }
        // Ultimate fallback
        if (!endCharacters) endCharacters = "...";
      }
      
      const lineBasedComment: LineBasedComment = {
        title: insight.title,
        description: insight.suggestedComment,
        importance: 5, // Default importance
        highlight: {
          startLineIndex: startLine - 1, // Convert to 0-based
          endLineIndex: endLine - 1,
          startCharacters: startCharacters,
          endCharacters: endCharacters,
        },
      };
      
      lineBasedComments.push(lineBasedComment);
    }
    
    // Convert to character-based comments
    const convertedComments = await validateAndConvertComments(lineBasedComments, document.content);
    comments.push(...convertedComments);
    
    const endTime = Date.now();
    const timeInSeconds = Math.round((endTime - startTime) / 1000);
    
    // Create a minimal task result since we didn't call the LLM
    const logDetails = createLogDetails(
      "extractCommentsFromAnalysis",
      "EXTRACTION_ONLY",
      startTime,
      endTime,
      0, // No cost for extraction
      0,
      0,
      {
        targetComments,
        agentName: agentInfo.name,
        availableInsights: analysisData.commentInsights.length,
      },
      {
        extractedComments: comments.length,
      },
      `Extracted ${comments.length} comments from ${analysisData.commentInsights.length} available insights`
    );
    
    return {
      task: {
        name: "extractCommentsFromAnalysis",
        modelName: "EXTRACTION_ONLY",
        priceInCents: 0,
        timeInSeconds,
        log: JSON.stringify(logDetails, null, 2),
        llmInteractions: [],
      },
      outputs: {
        comments,
      },
    };
  }
  
  // Fallback: If no structured insights, use LLM to extract comments from the analysis
  const { systemMessage, userMessage } = getCommentExtractionPrompts(
    document,
    agentInfo,
    analysisData,
    targetComments
  );

  const messages: LLMMessage[] = [
    { role: "system", content: systemMessage },
    { role: "user", content: userMessage },
  ];

  let response;
  let comments: Comment[] = [];

  try {
    response = await withTimeout(
      anthropic.messages.create({
        model: ANALYSIS_MODEL,
        max_tokens: 4000,
        temperature: DEFAULT_TEMPERATURE,
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
            description: "Extract and format comments based on the comprehensive analysis",
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
                        description: "Clear, descriptive title (max 80 characters)",
                      },
                      description: {
                        type: "string",
                        description: "Comment body text (100-300 words)",
                      },
                      highlight: {
                        type: "object",
                        properties: {
                          startLineIndex: {
                            type: "number",
                            description: "Starting line number (0-based)",
                          },
                          endLineIndex: {
                            type: "number",
                            description: "Ending line number (0-based)",
                          },
                          startCharacters: {
                            type: "string",
                            description: "First ~6 characters of the highlighted text",
                          },
                          endCharacters: {
                            type: "string",
                            description: "Last ~6 characters of the highlighted text",
                          },
                        },
                        required: ["startLineIndex", "endLineIndex", "startCharacters", "endCharacters"],
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
      90000, // 1.5 minute timeout
      "Anthropic API request timed out after 1.5 minutes"
    );

    const toolUse = response.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.name !== "provide_comments") {
      throw new Error("No tool use response from Anthropic for comment extraction");
    }

    const result = toolUse.input as { comments: LineBasedComment[] };
    
    // Convert line-based to character-based comments
    comments = await validateAndConvertComments(result.comments, document.content);

  } catch (error: any) {
    console.error("Error in comment extraction:", error);
    throw error;
  }

  const interaction: LLMInteraction = {
    messages: [...messages, { role: "assistant", content: JSON.stringify({ comments }) }],
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };

  const endTime = Date.now();
  const timeInSeconds = Math.round((endTime - startTime) / 1000);

  const cost = calculateApiCost(
    {
      input_tokens: interaction.usage.input_tokens,
      output_tokens: interaction.usage.output_tokens,
    },
    mapModelToCostModel(ANALYSIS_MODEL)
  );

  const logDetails = createLogDetails(
    "extractCommentsFromAnalysis",
    ANALYSIS_MODEL,
    startTime,
    endTime,
    cost,
    interaction.usage.input_tokens,
    interaction.usage.output_tokens,
    {
      targetComments,
      agentName: agentInfo.name,
    },
    {
      extractedComments: comments.length,
    },
    `Extracted ${comments.length} comments from comprehensive analysis`
  );

  return {
    task: {
      name: "extractCommentsFromAnalysis",
      modelName: ANALYSIS_MODEL,
      priceInCents: cost,
      timeInSeconds,
      log: JSON.stringify(logDetails, null, 2),
      llmInteractions: [interaction],
    },
    outputs: {
      comments,
    },
  };
}