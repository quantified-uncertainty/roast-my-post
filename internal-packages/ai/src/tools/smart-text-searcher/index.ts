import { z } from "zod";

import {
  Tool,
  ToolConfig,
  ToolContext,
} from "../base/Tool";
import { fuzzyTextSearcherConfig } from "../configs";
import {
  findTextLocation,
  TextLocationOptions,
} from "./core";

export interface TextLocationFinderInput {
  documentText: string;
  searchText: string;
  context?: string;
  lineNumberHint?: number; // Optional line number to help narrow search
  options?: {
    // Simple options based on actual plugin usage
    normalizeQuotes?: boolean;
    partialMatch?: boolean;
    useLLMFallback?: boolean;
  };
}

export interface TextLocationFinderOutput {
  searchText: string;
  found: boolean;
  location?: {
    startOffset: number;
    endOffset: number;
    quotedText: string;
    strategy: string;
    confidence: number;
  };
  error?: string;
  processingTimeMs: number;
  llmUsed?: boolean;
}

// Input validation schema
const inputSchema = z.object({
  documentText: z
    .string()
    .min(1, "Document text is required")
    .max(100000, "Document text too long"),
  searchText: z
    .string()
    .min(1, "Search text is required")
    .max(1000, "Search text too long"),
  context: z.string().optional(),
  lineNumberHint: z
    .number()
    .min(1)
    .optional()
    .describe("Optional line number to help narrow search"),
  options: z
    .object({
      normalizeQuotes: z.boolean().optional(),
      partialMatch: z.boolean().optional(),
      useLLMFallback: z.boolean().optional(),
    })
    .optional(),
});

// Output validation schema
const outputSchema = z.object({
  searchText: z.string(),
  found: z.boolean(),
  location: z
    .object({
      startOffset: z.number(),
      endOffset: z.number(),
      quotedText: z.string(),
      strategy: z.string(),
      confidence: z.number(),
    })
    .optional(),
  error: z.string().optional(),
  processingTimeMs: z.number(),
  llmUsed: z.boolean().optional(),
});

export class FuzzyTextLocatorTool extends Tool<
  TextLocationFinderInput,
  TextLocationFinderOutput
> {
  config: ToolConfig = fuzzyTextSearcherConfig;

  inputSchema = inputSchema;
  outputSchema = outputSchema;

  async execute(
    input: TextLocationFinderInput,
    context: ToolContext
  ): Promise<TextLocationFinderOutput> {
    const startTime = Date.now();

    // Validate input exists
    if (!input || !input.documentText || !input.searchText) {
      throw new Error(
        `Invalid input: documentText and searchText are required. Received: ${JSON.stringify(input)}`
      );
    }

    context.logger.debug(
      `FuzzyTextLocator: Searching for "${input.searchText}" in document of ${input.documentText.length} characters`
    );

    try {
      // Convert options to unified TextLocationOptions format
      const locationOptions: TextLocationOptions = {
        normalizeQuotes: input.options?.normalizeQuotes ?? false,
        partialMatch: input.options?.partialMatch ?? false,
        useLLMFallback: input.options?.useLLMFallback ?? false,
        llmContext: input.context,
        pluginName: "smart-text-searcher",
        lineNumberHint: input.lineNumberHint,
        toolContext: context, // Pass through for session tracking
      };

      // Use the unified finder with all strategies
      const locationResult = await findTextLocation(
        input.searchText,
        input.documentText,
        locationOptions
      );
      console.log("locationResult", {
        locationResult,
        documentText: input.documentText,
        searchText: input.searchText,
        locationOptions,
      });

      // Check if LLM was used based on the strategy
      const llmUsed = locationResult?.strategy === "llm";

      const processingTime = Date.now() - startTime;

      if (locationResult) {
        const output: TextLocationFinderOutput = {
          searchText: input.searchText,
          found: true,
          location: {
            startOffset: locationResult.startOffset,
            endOffset: locationResult.endOffset,
            quotedText: locationResult.quotedText,
            strategy: locationResult.strategy,
            confidence: locationResult.confidence,
          },
          processingTimeMs: processingTime,
          llmUsed,
        };

        context.logger.debug(
          `FuzzyTextLocator: Found text using ${locationResult.strategy} strategy in ${processingTime}ms`
        );
        return output;
      } else {
        const output: TextLocationFinderOutput = {
          searchText: input.searchText,
          found: false,
          error: "Text not found in document",
          processingTimeMs: processingTime,
          llmUsed,
        };

        context.logger.debug(
          `FuzzyTextLocator: Text not found in ${processingTime}ms`
        );
        return output;
      }
    } catch (error) {
      context.logger.error("FuzzyTextLocator execution failed:", error);
      throw new Error(
        `Fuzzy text locator failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // Validation specific to this tool
  override async validateAccess(context: ToolContext): Promise<boolean> {
    // This tool requires no special permissions - it's a pure utility
    return true;
  }

  // Optional: provide usage examples
  getExamples(): Array<{
    input: TextLocationFinderInput;
    description: string;
  }> {
    return [
      {
        description: "Basic exact text search",
        input: {
          documentText:
            "This is a sample document with some text. It contains multiple sentences and paragraphs.",
          searchText: "sample document",
        },
      },
      {
        description: "Quote normalization (apostrophes)",
        input: {
          documentText:
            "The company's earnings weren't what analysts expected.",
          searchText: "The company's earnings weren't what analysts expected.",
          options: {
            normalizeQuotes: true,
          },
        },
      },
      {
        description: "Partial match for long text",
        input: {
          documentText:
            "The research shows that climate change will impact agriculture significantly by 2030.",
          searchText:
            "The research shows that climate change will impact agriculture and food security in developing nations by 2030",
          options: {
            partialMatch: true,
          },
        },
      },
      {
        description: "LLM fallback for paraphrased text",
        input: {
          documentText:
            "Studies indicate that global temperatures may rise by 2-3 degrees Celsius over the next five decades.",
          searchText:
            "research shows that worldwide temperatures could increase by 2-3°C in the next 50 years",
          options: {
            useLLMFallback: true,
          },
        },
      },
      {
        description: "Context-aware search",
        input: {
          documentText:
            "The company reported revenues of $5.2 billion in Q3 2023.",
          searchText: "5.2 billion",
          context: "financial earnings report",
        },
      },
    ];
  }
}

// Export the tool instance
export default new FuzzyTextLocatorTool();

// Simple document location interface for compatibility
export interface DocumentLocation {
  startOffset: number;
  endOffset: number;
  quotedText: string;
}

// Re-export core functions and types for use by other tools/plugins
export {
  findTextLocation,
  type TextLocation,
  type TextLocationOptions,
} from "./core";
