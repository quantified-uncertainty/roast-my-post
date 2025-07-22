import type { Agent } from "../../../types/agentSchema";
import { logger } from "@/lib/logger";
import type { Document } from "../../../types/documents";
import type { LLMInteraction } from "../../../types/llm";
import {
  withTimeout,
  DEFAULT_TEMPERATURE,
} from "../../../types/openai";
import { calculateLLMCost } from "../shared/costUtils";
import type { TaskResult } from "../shared/types";
import { createLogDetails } from "../shared/llmUtils";
import { shouldIncludeGrade } from "../shared/agentContext";
import { handleAnthropicError } from "../utils/anthropicErrorHandler";
import { callClaudeWithTool, MODEL_CONFIG } from "@/lib/claude/wrapper";
import type { HeliconeSessionConfig } from "../../helicone/sessions";
import { createHeliconeHeaders } from "../../helicone/sessions";
import { getDocumentFullContent } from "../../../utils/documentContentHelpers";

export interface PluginSynthesisOutputs {
  summary: string;
  analysis: string;
  grade?: number;
}

/**
 * Generate a synthesized analysis from plugin findings
 * This is a lighter-weight alternative to comprehensive analysis
 * that focuses on summarizing and contextualizing plugin results
 */
export async function generatePluginSynthesisAnalysis(
  document: Document,
  agentInfo: Agent,
  pluginFindings: string,
  targetWordCount: number = 800,
  sessionConfig?: HeliconeSessionConfig
): Promise<{ task: TaskResult; outputs: PluginSynthesisOutputs }> {
  const startTime = Date.now();
  
  // Get document content for context
  const { content: fullContent } = getDocumentFullContent(document);
  
  // Create system message
  const systemMessage = `You are ${agentInfo.name}.

${agentInfo.primaryInstructions}

You have been provided with automated analysis results from specialized plugins. Your task is to:
1. Synthesize these findings into a coherent analysis
2. Add context and interpretation based on the document content
3. Highlight the most important issues and patterns
4. Provide actionable recommendations

Focus on clarity and actionability. The plugin findings are your primary source - add value by contextualizing and prioritizing them.`;

  // Create user message
  const userMessage = `Please analyze this document based on the plugin findings provided.

DOCUMENT TITLE: ${document.title}

PLUGIN ANALYSIS RESULTS:
${pluginFindings}

DOCUMENT CONTENT:
${fullContent}

Create a synthesized analysis that:
- Summarizes the key findings across all plugins
- Provides context for why these findings matter
- Prioritizes the most critical issues
- Offers specific, actionable recommendations

Target length: approximately ${targetWordCount} words.`;

  // Build properties dynamically
  const analysisProperties: Record<string, { type: string; description: string }> = {
    summary: {
      type: "string",
      description: "Brief executive summary of the plugin findings and their implications",
    },
    analysis: {
      type: "string",
      description: `Synthesized analysis (${targetWordCount} words) in markdown format. Focus on interpreting and contextualizing the plugin findings.`,
    },
  };

  // Only include grade field for agents that should provide grades
  if (shouldIncludeGrade(agentInfo)) {
    analysisProperties.grade = {
      type: "number",
      description: "Grade from 0-100 based on the plugin findings",
    };
  }

  let validationResult: PluginSynthesisOutputs;
  let response;
  let interaction;

  try {
    // Prepare helicone headers if session config is provided
    const heliconeHeaders = sessionConfig ? createHeliconeHeaders(sessionConfig) : undefined;
    
    const result = await withTimeout(
      callClaudeWithTool<PluginSynthesisOutputs>({
        model: MODEL_CONFIG.analysis, // Use analysis model for synthesis
        system: systemMessage,
        messages: [{ role: "user", content: userMessage }],
        max_tokens: 4000,
        temperature: DEFAULT_TEMPERATURE,
        toolName: "provide_synthesis_analysis",
        toolDescription: "Provide your synthesized analysis of the plugin findings",
        toolSchema: {
          type: "object",
          properties: analysisProperties,
          required: ["summary", "analysis"],
        },
        heliconeHeaders,
        enablePromptCaching: true
      }),
      60000, // 1 minute timeout for synthesis
      `Synthesis analysis timed out after 1 minute`
    );

    interaction = result.interaction;
    validationResult = result.toolResult;
  } catch (error: unknown) {
    logger.error(
      "❌ Anthropic API error in plugin synthesis analysis:",
      error
    );
    handleAnthropicError(error);
  }

  // Validate that required fields are present and non-empty
  if (
    !validationResult.summary ||
    validationResult.summary.trim().length === 0
  ) {
    throw new Error("Synthesis response missing or empty 'summary' field");
  }
  if (
    !validationResult.analysis ||
    validationResult.analysis.trim().length === 0
  ) {
    throw new Error("Synthesis response missing or empty 'analysis' field");
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

  // Convert RichLLMInteraction to LLMInteraction format
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
    "generatePluginSynthesisAnalysis",
    MODEL_CONFIG.analysis,
    startTime,
    endTime,
    cost,
    interaction.tokensUsed.prompt,
    interaction.tokensUsed.completion,
    {
      targetWordCount,
      agentName: agentInfo.name,
      pluginFindingsLength: pluginFindings.length,
    },
    {
      summary: validationResult.summary,
      analysisLength: validationResult.analysis.length,
      grade: validationResult.grade,
    },
    `Generated plugin synthesis analysis (${validationResult.analysis.length} chars)`
  );

  return {
    task: {
      name: "generatePluginSynthesisAnalysis",
      modelName: MODEL_CONFIG.analysis,
      priceInDollars: cost / 100,
      timeInSeconds,
      log: JSON.stringify(logDetails, null, 2),
      llmInteractions: [llmInteraction],
    },
    outputs: validationResult,
  };
}