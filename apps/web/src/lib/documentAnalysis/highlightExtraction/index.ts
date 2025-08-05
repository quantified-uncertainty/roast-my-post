import { logger } from "@/lib/logger";
import type { Anthropic } from "@anthropic-ai/sdk";
import type { Agent, Comment, Document, LLMMessage } from "@roast/ai";
import {
  callClaudeWithTool,
  DEFAULT_TEMPERATURE,
  HIGHLIGHT_EXTRACTION_TIMEOUT,
  MODEL_CONFIG,
  withTimeout,
} from "@roast/ai";

import type { ComprehensiveAnalysisOutputs } from "../comprehensiveAnalysis";
import { validateAndConvertHighlights } from "../highlightGeneration/highlightValidator";
import type { LineBasedHighlight } from "../highlightGeneration/types";
import { calculateLLMCost } from "../shared/costUtils";
import { createLogDetails } from "../shared/llmUtils";
import {
  findHighlightLocation,
  type HighlightLocation,
} from "../shared/pluginLocationWrappers";
import type { HighlightAnalysisOutputs, TaskResult } from "../shared/types";
import { getHighlightExtractionPrompts } from "./prompts";

/**
 * Extract and format highlights from the comprehensive analysis
 */
export async function extractHighlightsFromAnalysis(
  document: Document,
  agentInfo: Agent,
  analysisData: ComprehensiveAnalysisOutputs,
  targetHighlights: number = 5
): Promise<{ task: TaskResult; outputs: HighlightAnalysisOutputs }> {
  const startTime = Date.now();

  // If we have structured highlight insights from the analysis, we can use them directly
  if (
    analysisData.highlightInsights &&
    analysisData.highlightInsights.length > 0
  ) {
    // Convert insights to highlights format
    const highlights: Comment[] = [];
    const lineBasedHighlights: LineBasedHighlight[] = [];

    // Document content already includes prepend from Job.ts
    const lines = document.content.split("\n");

    // Take up to targetHighlights insights
    // Use all insights provided by the comprehensive analysis
    const insightsToUse = analysisData.highlightInsights;

    for (const insight of insightsToUse) {
      // Parse location to get line numbers
      const lineMatch = insight.location.match(
        /[Ll]ines?\s*(\d+)(?:\s*-\s*(\d+))?/
      );
      let startLine = 1;
      let endLine = 1;

      if (lineMatch) {
        startLine = parseInt(lineMatch[1]);
        endLine = lineMatch[2] ? parseInt(lineMatch[2]) : startLine;
      }

      // Use unified location finder for more robust highlighting
      const location = await findHighlightLocation(
        insight.suggestedHighlight,
        document.content,
        {
          lineNumber: startLine,
          contextBefore: lines[startLine - 2] || "",
          contextAfter: lines[endLine] || "",
        }
      );

      if (location) {
        // Successfully found the text
        const lineBasedHighlight = createHighlightFromLocation(location, insight);
        lineBasedHighlights.push(lineBasedHighlight);
      } else {
        // Location finder failed - try fuzzy text search without line context
        const fuzzyLocation = await findHighlightLocation(
          insight.suggestedHighlight,
          document.content,
          {} // No line context - pure text search
        );
        
        if (fuzzyLocation) {
          // Found via fuzzy search
          const lineBasedHighlight = createHighlightFromLocation(fuzzyLocation, insight);
          lineBasedHighlights.push(lineBasedHighlight);
        } else {
          // Complete failure - skip this highlight
          logger.warn(`Could not find text anywhere in document: "${insight.suggestedHighlight.substring(0, 100)}..."`);
        }
      }
    }

    // Convert to character-based highlights using document content (already has prepend)
    const convertedHighlights = await validateAndConvertHighlights(
      lineBasedHighlights,
      document.content
    );
    highlights.push(...convertedHighlights);

    // Check for mismatch between highlights in markdown vs structured data
    const markdownHighlightMatches =
      analysisData.analysis.match(/### Highlight \[/g);
    const markdownHighlightCount = markdownHighlightMatches
      ? markdownHighlightMatches.length
      : 0;

    if (markdownHighlightCount > analysisData.highlightInsights.length) {
      logger.warn(
        `⚠️ Highlight count mismatch: ${markdownHighlightCount} highlights in markdown but only ${analysisData.highlightInsights.length} in structured data. ` +
          `Missing ${markdownHighlightCount - analysisData.highlightInsights.length} highlights.`
      );

      // If we're missing more than half the highlights, log additional details
      if (
        analysisData.highlightInsights.length <
        markdownHighlightCount * 0.5
      ) {
        logger.error(
          `🚨 Critical mismatch: Only ${Math.round((analysisData.highlightInsights.length / markdownHighlightCount) * 100)}% of highlights were captured in structured data. ` +
            `Consider falling back to markdown parsing.`
        );
      }
    }

    const endTime = Date.now();
    const timeInSeconds = Math.round((endTime - startTime) / 1000);

    // Create a minimal task result since we didn't call the LLM
    const logDetails = createLogDetails(
      "extractHighlightsFromAnalysis",
      "EXTRACTION_ONLY",
      startTime,
      endTime,
      0, // No cost for extraction
      0,
      0,
      {
        targetHighlights,
        agentName: agentInfo.name,
        availableInsights: analysisData.highlightInsights.length,
      },
      {
        extractedHighlights: highlights.length,
      },
      `Extracted ${highlights.length} highlights from ${analysisData.highlightInsights.length} available insights`
    );

    return {
      task: {
        name: "extractHighlightsFromAnalysis",
        modelName: "EXTRACTION_ONLY",
        priceInDollars: 0,
        timeInSeconds,
        log: JSON.stringify(logDetails, null, 2),
      },
      outputs: {
        highlights,
      },
    };
  }

  // Fallback: If no structured insights, use LLM to extract highlights from the analysis
  const { systemMessage, userMessage } = getHighlightExtractionPrompts(
    document,
    agentInfo,
    analysisData,
    targetHighlights
  );

  const messages: LLMMessage[] = [
    { role: "system", content: systemMessage },
    { role: "user", content: userMessage },
  ];

  let highlights: Comment[] = [];
  let interaction;

  try {
    const toolSchema: Anthropic.Messages.Tool.InputSchema = {
      type: "object",
      properties: {
        highlights: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: {
                type: "string",
                description:
                  "Highlight text (100-300 words) starting with a clear, concise statement of the main point",
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
                required: [
                  "startLineIndex",
                  "endLineIndex",
                  "startCharacters",
                  "endCharacters",
                ],
              },
            },
            required: ["description", "highlight"],
          },
        },
      },
      required: ["highlights"],
    };

    const result = await withTimeout(
      callClaudeWithTool<{ highlights: LineBasedHighlight[] }>({
        model: MODEL_CONFIG.analysis,
        system: systemMessage,
        messages: [
          {
            role: "user",
            content: userMessage,
          },
        ],
        max_tokens: 4000,
        temperature: DEFAULT_TEMPERATURE,
        toolName: "provide_highlights",
        toolDescription:
          "Extract and format highlights based on the comprehensive analysis",
        toolSchema,
        enablePromptCaching: true, // Enable caching for highlight extraction system prompt and tools
      }),
      HIGHLIGHT_EXTRACTION_TIMEOUT,
      `Anthropic API request timed out after ${HIGHLIGHT_EXTRACTION_TIMEOUT / 60000} minutes`
    );

    interaction = result.interaction;

    // Convert line-based to character-based highlights
    // Document content already includes prepend from Job.ts
    highlights = await validateAndConvertHighlights(
      result.toolResult.highlights,
      document.content
    );
  } catch (error: unknown) {
    logger.error("Error in highlight extraction:", error);
    throw error;
  }

  const endTime = Date.now();
  const timeInSeconds = Math.round((endTime - startTime) / 1000);

  const usage = {
    input_tokens: interaction?.tokensUsed.prompt || 0,
    output_tokens: interaction?.tokensUsed.completion || 0,
  };
  const cost = calculateLLMCost(MODEL_CONFIG.analysis, usage);

  const logDetails = createLogDetails(
    "extractHighlightsFromAnalysis",
    MODEL_CONFIG.analysis,
    startTime,
    endTime,
    cost,
    usage.input_tokens,
    usage.output_tokens,
    {
      targetHighlights,
      agentName: agentInfo.name,
    },
    {
      extractedHighlights: highlights.length,
    },
    `Extracted ${highlights.length} highlights from comprehensive analysis`
  );

  return {
    task: {
      name: "extractHighlightsFromAnalysis",
      modelName: MODEL_CONFIG.analysis,
      priceInDollars: cost / 100,
      timeInSeconds,
      log: JSON.stringify(logDetails, null, 2),
    },
    outputs: {
      highlights,
    },
  };
}

/**
 * Creates a LineBasedHighlight from successful location finder results
 */
function createHighlightFromLocation(
  location: HighlightLocation,
  insight: { suggestedHighlight: string }
): LineBasedHighlight {
  return {
    description: insight.suggestedHighlight,
    importance: 5, // Default importance
    highlight: {
      startLineIndex: location.startLineIndex,
      endLineIndex: location.endLineIndex,
      startCharacters: location.startCharacters,
      endCharacters: location.endCharacters,
    },
  };
}

