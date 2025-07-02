import type { Agent } from "../../../types/agentSchema";
import { logger } from "@/lib/logger";
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
  COMPREHENSIVE_ANALYSIS_TIMEOUT,
} from "../../../types/openai";
import {
  calculateApiCost,
  mapModelToCostModel,
} from "../../../utils/costCalculator";
import type { TaskResult } from "../shared/types";
import { getComprehensiveAnalysisPrompts } from "./prompts";
import { createLogDetails } from "../shared/llmUtils";
import { shouldIncludeGrade } from "../shared/agentContext";

export interface ComprehensiveAnalysisOutputs {
  summary: string;
  analysis: string;
  grade?: number;
  commentInsights: CommentInsight[];
}

export interface CommentInsight {
  id: string;
  location: string; // Line reference like "Lines 45-52" or "Line 78"
  observation: string;
  significance: string;
  suggestedComment: string;
}

export async function generateComprehensiveAnalysis(
  document: Document,
  agentInfo: Agent,
  targetWordCount: number = 2000,
  targetComments: number = 5
): Promise<{ task: TaskResult; outputs: ComprehensiveAnalysisOutputs }> {
  const startTime = Date.now();
  const { systemMessage, userMessage } = getComprehensiveAnalysisPrompts(
    agentInfo,
    document,
    targetWordCount,
    targetComments
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
    summary: {
      type: "string",
      description: "Brief summary of your main findings and contributions",
    },
    analysis: {
      type: "string",
      description: `Main content document (${targetWordCount}+ words) in markdown format. Structure according to your specific role and instructions. Use proper markdown with headers, subheaders, lists, emphasis, code blocks, etc.`,
    },
    commentInsights: {
      type: "array",
      description: "Structured insights that will become comments",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "Unique identifier like 'insight-1'" },
          title: { type: "string", description: "Short descriptive title" },
          location: { type: "string", description: "Line numbers like 'Lines 45-52' or 'Line 78'" },
          observation: { type: "string", description: "Detailed explanation of the insight" },
          significance: { type: "string", description: "Why this matters" },
          suggestedComment: { type: "string", description: "Draft comment text" }
        },
        required: ["id", "title", "location", "observation", "significance", "suggestedComment"]
      }
    }
  };

  // Only include grade field for agents that should provide grades
  if (shouldIncludeGrade(agentInfo)) {
    analysisProperties.grade = {
      type: "number",
      description: "Grade from 0-100 based on comprehensive assessment",
    };
  }

  try {
    // Build the API request parameters
    const apiParams: any = {
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
          name: "provide_comprehensive_analysis",
          description:
            "Provide your complete response including summary, main content document, and structured comment insights",
          input_schema: {
            type: "object",
            properties: analysisProperties,
            required: ["summary", "analysis", "commentInsights"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "provide_comprehensive_analysis" },
    };

    response = await withTimeout(
      anthropic.messages.create(apiParams),
      COMPREHENSIVE_ANALYSIS_TIMEOUT,
      `Anthropic API request timed out after ${COMPREHENSIVE_ANALYSIS_TIMEOUT / 60000} minutes`
    );
  } catch (error: any) {
    console.error(
      "❌ Anthropic API error in comprehensive analysis generation:",
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
    if (!toolUse || toolUse.name !== "provide_comprehensive_analysis") {
      throw new Error(
        "No tool use response from Anthropic for comprehensive analysis generation"
      );
    }

    validationResult = toolUse.input as ComprehensiveAnalysisOutputs;

    // Validate that required fields are present and non-empty
    if (
      !validationResult.summary ||
      validationResult.summary.trim().length === 0
    ) {
      throw new Error("Anthropic response missing or empty 'summary' field");
    }
    if (
      !validationResult.analysis ||
      validationResult.analysis.trim().length === 0
    ) {
      throw new Error("Anthropic response missing or empty 'analysis' field");
    }
    if (
      !validationResult.commentInsights ||
      !Array.isArray(validationResult.commentInsights)
    ) {
      throw new Error("Anthropic response missing or invalid 'commentInsights' field");
    }

    // Post-process to fix formatting issues from JSON tool use
    const fixFormatting = (text: string): string => {
      return text
        .replace(/\\n/g, "\n") // Convert escaped newlines to actual newlines
        .replace(/\\"/g, '"') // Convert escaped quotes
        .replace(/\\\\/g, "\\") // Convert escaped backslashes
        .trim();
    };

    validationResult.summary = fixFormatting(validationResult.summary);
    validationResult.analysis = fixFormatting(validationResult.analysis);
    
    // Fix formatting in comment insights
    validationResult.commentInsights = validationResult.commentInsights.map(insight => ({
      ...insight,
      observation: fixFormatting(insight.observation),
      significance: fixFormatting(insight.significance),
      suggestedComment: fixFormatting(insight.suggestedComment),
    }));

    rawResponse = JSON.stringify(validationResult);
  } catch (error) {
    logger.error('❌ Failed to parse or validate Anthropic response:', error);
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
    "generateComprehensiveAnalysis",
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
      summary: validationResult.summary,
      analysisLength: validationResult.analysis.length,
      commentInsightsCount: validationResult.commentInsights.length,
      grade: validationResult.grade,
    },
    `Generated comprehensive analysis (${validationResult.analysis.length} chars) with ${validationResult.commentInsights.length} comment insights`
  );

  return {
    task: {
      name: "generateComprehensiveAnalysis",
      modelName: ANALYSIS_MODEL,
      priceInCents: cost,
      timeInSeconds,
      log: JSON.stringify(logDetails, null, 2),
      llmInteractions: [interaction],
    },
    outputs: validationResult,
  };
}