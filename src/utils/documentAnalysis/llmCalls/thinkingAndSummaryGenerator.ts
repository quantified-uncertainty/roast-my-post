import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";
import {
  ANALYSIS_MODEL,
  anthropic,
  DEFAULT_TEMPERATURE,
  withTimeout,
} from "../../../types/openai";
import { getThinkingAnalysisSummaryPrompts } from "../prompts";

export async function generateThinkingAndSummary(
  document: Document,
  targetWordCount: number,
  agentInfo: Agent
): Promise<{
  llmMessages: string;
  thinking: string;
  analysis: string;
  summary: string;
  grade: number | undefined;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}> {
  const { systemMessage, userMessage } = getThinkingAnalysisSummaryPrompts(
    agentInfo,
    targetWordCount,
    document
  );

  const messagesAsString = `system: ${systemMessage}\nuser: ${userMessage}`;

  let response;
  let validationResult;

  try {
    response = await withTimeout(
      anthropic.messages.create({
        model: ANALYSIS_MODEL,
        max_tokens: 8000,
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
            name: "provide_analysis",
            description:
              "Provide comprehensive thinking, analysis, summary and grade for the document. Use proper markdown formatting with newlines, headers, lists, etc. Make thinking and analysis substantive and detailed.",
            input_schema: {
              type: "object",
              properties: {
                thinking: {
                  type: "string",
                  description:
                    "Detailed thinking process with proper markdown formatting. Should be substantive and comprehensive, around 300-500 words. Use newlines, bullet points, headers as needed.",
                },
                analysis: {
                  type: "string",
                  description:
                    "Detailed analysis with heavy markdown formatting. Should be approximately 200-300 words with headers, bullet points, emphasis, etc. Make it highly readable.",
                },
                summary: {
                  type: "string",
                  description: "Concise 1-2 sentence summary",
                },
                grade: {
                  type: "number",
                  description: "Optional grade from 0-1",
                },
              },
              required: ["thinking", "analysis", "summary"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "provide_analysis" },
      }),
      120000, // 2 minute timeout
      "Anthropic API request timed out after 2 minutes"
    );
  } catch (error: any) {
    console.error(
      "❌ Anthropic API error in thinking/summary generation:",
      error
    );

    // Handle specific error types
    if (error?.status === 429) {
      throw new Error(
        "Anthropic API rate limit exceeded. Please try again in a moment."
      );
    }

    if (error?.status === 402) {
      throw new Error(
        "Anthropic API quota exceeded. Please check your billing."
      );
    }

    if (error?.status === 401) {
      throw new Error(
        "Anthropic API authentication failed. Please check your API key."
      );
    }

    if (error?.status >= 500) {
      throw new Error(
        `Anthropic API server error (${error.status}). Please try again later.`
      );
    }

    // For other errors, provide a generic message
    throw new Error(`Anthropic API error: ${error?.message || error}`);
  }

  try {
    const toolUse = response.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.name !== "provide_analysis") {
      throw new Error(
        "No tool use response from Anthropic for thinking/summary/grade"
      );
    }

    validationResult = toolUse.input as {
      thinking: string;
      analysis: string;
      summary: string;
      grade?: number;
    };

    // Validate that required fields are present and non-empty
    if (
      !validationResult.thinking ||
      validationResult.thinking.trim().length === 0
    ) {
      throw new Error("Anthropic response missing or empty 'thinking' field");
    }
    if (
      !validationResult.analysis ||
      validationResult.analysis.trim().length === 0
    ) {
      throw new Error("Anthropic response missing or empty 'analysis' field");
    }
    if (
      !validationResult.summary ||
      validationResult.summary.trim().length === 0
    ) {
      throw new Error("Anthropic response missing or empty 'summary' field");
    }

    // Post-process to fix formatting issues from JSON tool use
    const fixFormatting = (text: string): string => {
      return text
        .replace(/\\n/g, "\n") // Convert escaped newlines to actual newlines
        .replace(/\\"/g, '"') // Convert escaped quotes
        .replace(/\\\\/g, "\\") // Convert escaped backslashes
        .trim();
    };

    validationResult.thinking = fixFormatting(validationResult.thinking);
    validationResult.analysis = fixFormatting(validationResult.analysis);
    validationResult.summary = fixFormatting(validationResult.summary);
  } catch (error) {
    console.error("❌ Failed to parse or validate Anthropic response:", error);
    throw new Error(
      `Failed to process Anthropic response: ${error instanceof Error ? error.message : error}`
    );
  }

  return {
    llmMessages: messagesAsString,
    thinking: validationResult.thinking,
    analysis: validationResult.analysis,
    summary: validationResult.summary,
    grade: validationResult.grade,
    usage: response.usage
      ? {
          prompt_tokens: response.usage.input_tokens,
          completion_tokens: response.usage.output_tokens,
          total_tokens:
            response.usage.input_tokens + response.usage.output_tokens,
        }
      : undefined,
  };
}
