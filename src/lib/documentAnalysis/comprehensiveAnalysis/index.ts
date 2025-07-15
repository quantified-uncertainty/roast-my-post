import type { Agent } from "../../../types/agentSchema";
import { logger } from "@/lib/logger";
import type { Document } from "../../../types/documents";
import type {
  LLMInteraction,
  LLMMessage,
} from "../../../types/llm";
import {
  ANALYSIS_MODEL,
  createAnthropicClient,
  DEFAULT_TEMPERATURE,
  withTimeout,
  COMPREHENSIVE_ANALYSIS_TIMEOUT,
} from "../../../types/openai";
import { calculateApiCost } from "../../../utils/costCalculator";
import { calculateLLMCost } from "../shared/costUtils";
import type { TaskResult } from "../shared/types";
import { getComprehensiveAnalysisPrompts } from "./prompts";
import { createLogDetails } from "../shared/llmUtils";
import { shouldIncludeGrade } from "../shared/agentContext";
import { handleAnthropicError, formatFixing } from "../utils/anthropicErrorHandler";

export interface ComprehensiveAnalysisOutputs {
  summary: string;
  analysis: string;
  grade?: number;
  highlightInsights: HighlightInsight[];
}

export interface HighlightInsight {
  id: string;
  location: string; // Line reference like "Lines 45-52" or "Line 78"
  suggestedHighlight: string;
}

export async function generateComprehensiveAnalysis(
  document: Document,
  agentInfo: Agent,
  targetWordCount: number = 2000,
  targetHighlights: number = 5
): Promise<{ task: TaskResult; outputs: ComprehensiveAnalysisOutputs }> {
  const startTime = Date.now();
  const { systemMessage, userMessage } = getComprehensiveAnalysisPrompts(
    agentInfo,
    document,
    targetWordCount,
    targetHighlights
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
    highlightInsights: {
      type: "array",
      description: "Structured insights that will become highlights",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "Unique identifier like 'insight-1'" },
          location: { type: "string", description: "Line numbers like 'Lines 45-52' or 'Line 78'" },
          suggestedHighlight: { type: "string", description: "Draft highlight text" }
        },
        required: ["id", "location", "suggestedHighlight"]
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
            "Provide your complete response including summary, main content document, and structured highlight insights",
          input_schema: {
            type: "object",
            properties: analysisProperties,
            required: ["summary", "analysis", "highlightInsights"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "provide_comprehensive_analysis" },
    };

    const anthropic = createAnthropicClient();
    response = await withTimeout(
      anthropic.messages.create(apiParams),
      COMPREHENSIVE_ANALYSIS_TIMEOUT,
      `Anthropic API request timed out after ${COMPREHENSIVE_ANALYSIS_TIMEOUT / 60000} minutes`
    );
  } catch (error: any) {
    logger.error(
      "❌ Anthropic API error in comprehensive analysis generation:",
      error
    );
    handleAnthropicError(error);
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
      !validationResult.highlightInsights ||
      !Array.isArray(validationResult.highlightInsights)
    ) {
      throw new Error("Anthropic response missing or invalid 'highlightInsights' field");
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
    
    // Fix formatting in highlight insights
    validationResult.highlightInsights = validationResult.highlightInsights.map(insight => ({
      ...insight,
      suggestedHighlight: fixFormatting(insight.suggestedHighlight),
    }));
    
    // Validate highlight count
    if (validationResult.highlightInsights.length < targetHighlights - 1) {
      logger.warn(
        `⚠️ Generated ${validationResult.highlightInsights.length} highlights but requested ${targetHighlights}. ` +
        `Agent may have found fewer noteworthy points.`
      );
      
      // If we got significantly fewer highlights, consider retrying with stronger instructions
      if (validationResult.highlightInsights.length < Math.max(1, targetHighlights * 0.6)) {
        logger.info(
          `🔄 Attempting retry due to low highlight count (${validationResult.highlightInsights.length}/${targetHighlights})`
        );
        
        // Add a retry flag to track this
        const retryMessage = `Please ensure you generate exactly ${targetHighlights} highlight insights. ` +
          `Each highlight should reference a specific part of the document. ` +
          `If you cannot find ${targetHighlights} distinct points, create highlights for the most important sections.`;
        
        // For now, just log this - full retry implementation would require restructuring
        logger.info(`Retry message would be: ${retryMessage}`);
      }
    }

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

  const cost = calculateLLMCost(ANALYSIS_MODEL, interaction.usage);

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
      highlightInsightsCount: validationResult.highlightInsights.length,
      grade: validationResult.grade,
    },
    `Generated comprehensive analysis (${validationResult.analysis.length} chars) with ${validationResult.highlightInsights.length} highlight insights`
  );

  return {
    task: {
      name: "generateComprehensiveAnalysis",
      modelName: ANALYSIS_MODEL,
      priceInDollars: cost / 100,
      timeInSeconds,
      log: JSON.stringify(logDetails, null, 2),
      llmInteractions: [interaction],
    },
    outputs: validationResult,
  };
}