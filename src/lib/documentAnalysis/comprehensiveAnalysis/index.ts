import type { Agent } from "../../../types/agentSchema";
import { logger } from "@/lib/logger";
import type { Document } from "../../../types/documents";
import type { LLMInteraction } from "../../../types/llm";
import {
  withTimeout,
  COMPREHENSIVE_ANALYSIS_TIMEOUT,
  DEFAULT_TEMPERATURE,
} from "../../../types/openai";
import { calculateLLMCost } from "../shared/costUtils";
import type { TaskResult } from "../shared/types";
import { getComprehensiveAnalysisPrompts } from "./prompts";
import { createLogDetails } from "../shared/llmUtils";
import { shouldIncludeGrade } from "../shared/agentContext";
import { handleAnthropicError } from "../utils/anthropicErrorHandler";
import { callClaudeWithTool, MODEL_CONFIG } from "@/lib/claude/wrapper";

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

  let validationResult: ComprehensiveAnalysisOutputs;
  let response;
  let interaction;

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
    const result = await withTimeout(
      callClaudeWithTool<ComprehensiveAnalysisOutputs>({
        model: MODEL_CONFIG.analysis,
        system: systemMessage,
        messages: [{ role: "user", content: userMessage }],
        max_tokens: 8000,
        temperature: DEFAULT_TEMPERATURE,
        toolName: "provide_comprehensive_analysis",
        toolDescription: "Provide your complete response including summary, main content document, and structured highlight insights",
        toolSchema: {
          type: "object",
          properties: analysisProperties,
          required: ["summary", "analysis", "highlightInsights"],
        }
      }),
      COMPREHENSIVE_ANALYSIS_TIMEOUT,
      `Anthropic API request timed out after ${COMPREHENSIVE_ANALYSIS_TIMEOUT / 60000} minutes`
    );

    response = result.response;
    interaction = result.interaction;
    validationResult = result.toolResult;
  } catch (error: any) {
    logger.error(
      "❌ Anthropic API error in comprehensive analysis generation:",
      error
    );
    handleAnthropicError(error);
  }

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

  // Convert RichLLMInteraction to LLMInteraction format for backwards compatibility
  const llmInteraction: LLMInteraction = {
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
      { role: "assistant", content: JSON.stringify(validationResult) }
    ],
    usage: {
      input_tokens: interaction.tokensUsed.prompt,
      output_tokens: interaction.tokensUsed.completion,
    },
  };

  const endTime = Date.now();
  const timeInSeconds = Math.round((endTime - startTime) / 1000);

  const cost = calculateLLMCost(MODEL_CONFIG.analysis, llmInteraction.usage);

  const logDetails = createLogDetails(
    "generateComprehensiveAnalysis",
    MODEL_CONFIG.analysis,
    startTime,
    endTime,
    cost,
    interaction.tokensUsed.prompt,
    interaction.tokensUsed.completion,
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
      modelName: MODEL_CONFIG.analysis,
      priceInDollars: cost / 100,
      timeInSeconds,
      log: JSON.stringify(logDetails, null, 2),
      llmInteractions: [llmInteraction],
    },
    outputs: validationResult,
  };
}