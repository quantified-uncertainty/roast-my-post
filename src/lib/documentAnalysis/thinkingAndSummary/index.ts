import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";
import type {
  LLMInteraction,
  LLMMessage,
} from "../../../types/llm";
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
import type { TaskResult, ThinkingAnalysisOutputs } from "../shared/types";
import { getThinkingAnalysisSummaryPrompts } from "./prompts";
import { createLogDetails } from "../shared/llmUtils";

export async function generateThinkingAndSummary(
  document: Document,
  targetWordCount: number,
  agentInfo: Agent
): Promise<{ task: TaskResult; outputs: ThinkingAnalysisOutputs }> {
  const startTime = Date.now();
  const { systemMessage, userMessage } = getThinkingAnalysisSummaryPrompts(
    agentInfo,
    targetWordCount,
    document
  );

  const messages: LLMMessage[] = [
    { role: "system", content: systemMessage },
    { role: "user", content: userMessage },
  ];

  let response;
  let validationResult;
  let rawResponse;

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

    validationResult = toolUse.input as ThinkingAnalysisOutputs;

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

    rawResponse = JSON.stringify(validationResult);
  } catch (error) {
    console.error("❌ Failed to parse or validate Anthropic response:", error);
    throw new Error(
      `Failed to process Anthropic response: ${error instanceof Error ? error.message : error}`
    );
  }

  const interaction: LLMInteraction = {
    messages: [...messages, { role: "assistant", content: rawResponse }],
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
    "generateThinkingAndSummary",
    ANALYSIS_MODEL,
    startTime,
    endTime,
    cost,
    interaction.usage.input_tokens,
    interaction.usage.output_tokens,
    {
      targetWordCount,
      agentName: agentInfo.name,
      documentLength: document.content.length,
    },
    {
      thinking: validationResult.thinking,
      analysis: validationResult.analysis,
      summary: validationResult.summary,
      grade: validationResult.grade,
    },
    `Generated thinking, analysis, and summary with grade ${validationResult.grade || "N/A"}`
  );

  return {
    task: {
      name: "generateThinkingAndSummary",
      modelName: ANALYSIS_MODEL,
      priceInCents: cost,
      timeInSeconds,
      log: JSON.stringify(logDetails, null, 2),
      llmInteractions: [interaction],
    },
    outputs: {
      thinking: validationResult.thinking,
      analysis: validationResult.analysis,
      summary: validationResult.summary,
      grade: validationResult.grade,
    },
  };
}