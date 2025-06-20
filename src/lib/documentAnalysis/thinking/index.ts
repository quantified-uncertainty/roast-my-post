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
import type { TaskResult, ThinkingOutputs } from "../shared/types";
import { getThinkingPrompts } from "./prompts";
import { createLogDetails } from "../shared/llmUtils";

export async function generateThinking(
  document: Document,
  agentInfo: Agent
): Promise<{ task: TaskResult; outputs: ThinkingOutputs }> {
  const startTime = Date.now();
  const { systemMessage, userMessage } = getThinkingPrompts(
    agentInfo,
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
            name: "provide_thinking",
            description:
              "Provide comprehensive thinking process for analyzing the document. This is the core processing step where all the key work should be done.",
            input_schema: {
              type: "object",
              properties: {
                thinking: {
                  type: "string",
                  description:
                    "Comprehensive thinking process with detailed analysis, observations, insights, and evaluation. This should be the MAIN work - extensive and substantive (800-1200 words). Use proper markdown formatting with headers, bullet points, emphasis, etc. Include all key insights, quality assessment, notable sections, and any other important observations that will inform both the final analysis and comment generation.",
                },
              },
              required: ["thinking"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "provide_thinking" },
      }),
      120000, // 2 minute timeout
      "Anthropic API request timed out after 2 minutes"
    );
  } catch (error: any) {
    console.error(
      "❌ Anthropic API error in thinking generation:",
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
    if (!toolUse || toolUse.name !== "provide_thinking") {
      throw new Error(
        "No tool use response from Anthropic for thinking generation"
      );
    }

    validationResult = toolUse.input as ThinkingOutputs;

    // Validate that required fields are present and non-empty
    if (
      !validationResult.thinking ||
      validationResult.thinking.trim().length === 0
    ) {
      throw new Error("Anthropic response missing or empty 'thinking' field");
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
    "generateThinking",
    ANALYSIS_MODEL,
    startTime,
    endTime,
    cost,
    interaction.usage.input_tokens,
    interaction.usage.output_tokens,
    {
      agentName: agentInfo.name,
      documentLength: document.content.length,
    },
    {
      thinking: validationResult.thinking,
    },
    `Generated comprehensive thinking document (${validationResult.thinking.length} characters)`
  );

  return {
    task: {
      name: "generateThinking",
      modelName: ANALYSIS_MODEL,
      priceInCents: cost,
      timeInSeconds,
      log: JSON.stringify(logDetails, null, 2),
      llmInteractions: [interaction],
    },
    outputs: {
      thinking: validationResult.thinking,
    },
  };
}