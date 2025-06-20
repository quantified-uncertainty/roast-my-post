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
import type { TaskResult, AnalysisOutputs, ThinkingOutputs } from "../shared/types";
import { getAnalysisPrompts } from "./prompts";
import { createLogDetails } from "../shared/llmUtils";
import { shouldIncludeGrade } from "../shared/agentContext";

export async function generateAnalysis(
  document: Document,
  agentInfo: Agent,
  thinkingData: ThinkingOutputs,
  targetWordCount: number = 300
): Promise<{ task: TaskResult; outputs: AnalysisOutputs }> {
  const startTime = Date.now();
  const { systemMessage, userMessage } = getAnalysisPrompts(
    agentInfo,
    document,
    thinkingData,
    targetWordCount
  );

  const messages: LLMMessage[] = [
    { role: "system", content: systemMessage },
    { role: "user", content: userMessage },
  ];

  let response;
  let validationResult;
  let rawResponse;

  // Build properties dynamically
  const analysisProperties: any = {
    analysis: {
      type: "string",
      description:
        "Detailed analysis with heavy markdown formatting. Should be approximately 200-400 words with headers, bullet points, emphasis, etc. Based on the thinking provided, distill the key insights into a well-formatted analysis.",
    },
    summary: {
      type: "string",
      description: "Concise 1-2 sentence summary of the main findings",
    },
  };

  // Only include grade field for agents that should provide grades
  if (shouldIncludeGrade(agentInfo)) {
    analysisProperties.grade = {
      type: "number",
      description: "Grade from 0-100 based on the agent's assessment",
    };
  }

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
            name: "provide_analysis",
            description:
              "Provide concise analysis and summary based on the comprehensive thinking already completed.",
            input_schema: {
              type: "object",
              properties: analysisProperties,
              required: ["analysis", "summary"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "provide_analysis" },
      }),
      90000, // 1.5 minute timeout
      "Anthropic API request timed out after 1.5 minutes"
    );
  } catch (error: any) {
    console.error(
      "❌ Anthropic API error in analysis generation:",
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
        "No tool use response from Anthropic for analysis generation"
      );
    }

    validationResult = toolUse.input as AnalysisOutputs;

    // Validate that required fields are present and non-empty
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
    "generateAnalysis",
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
      analysis: validationResult.analysis,
      summary: validationResult.summary,
      grade: validationResult.grade,
    },
    `Generated analysis and summary with grade ${validationResult.grade || "N/A"}`
  );

  return {
    task: {
      name: "generateAnalysis",
      modelName: ANALYSIS_MODEL,
      priceInCents: cost,
      timeInSeconds,
      log: JSON.stringify(logDetails, null, 2),
      llmInteractions: [interaction],
    },
    outputs: {
      analysis: validationResult.analysis,
      summary: validationResult.summary,
      grade: validationResult.grade,
    },
  };
}