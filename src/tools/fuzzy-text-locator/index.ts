import { z } from 'zod';
import { Tool, ToolConfig, ToolContext } from '../base/Tool';
import { findTextLocation, TextLocationOptions, TextLocation } from './core';

export interface TextLocationFinderInput {
  documentText: string;
  searchText: string;
  context?: string;
  options?: {
    // Simple options based on actual plugin usage
    normalizeQuotes?: boolean;
    partialMatch?: boolean;
    useLLMFallback?: boolean;
    includeLLMExplanation?: boolean;
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
  llmSuggestion?: string;
}

// Input validation schema
const inputSchema = z.object({
  documentText: z.string().min(1, "Document text is required").max(100000, "Document text too long"),
  searchText: z.string().min(1, "Search text is required").max(1000, "Search text too long"),
  context: z.string().optional(),
  options: z.object({
    normalizeQuotes: z.boolean().optional(),
    partialMatch: z.boolean().optional(),
    useLLMFallback: z.boolean().optional(),
    includeLLMExplanation: z.boolean().optional(),
  }).optional()
});

// Output validation schema
const outputSchema = z.object({
  searchText: z.string(),
  found: z.boolean(),
  location: z.object({
    startOffset: z.number(),
    endOffset: z.number(),
    quotedText: z.string(),
    strategy: z.string(),
    confidence: z.number()
  }).optional(),
  error: z.string().optional(),
  processingTimeMs: z.number(),
  llmUsed: z.boolean().optional(),
  llmSuggestion: z.string().optional()
});

export class FuzzyTextLocatorTool extends Tool<TextLocationFinderInput, TextLocationFinderOutput> {
  config: ToolConfig = {
    id: 'fuzzy-text-locator',
    name: 'Fuzzy Text Locator',
    description: 'Find the location of text within documents using multiple search strategies including exact matching, fuzzy matching, quote normalization, partial matching, and LLM fallback for paraphrased or difficult-to-find text',
    version: '1.1.0',
    category: 'utility',
    costEstimate: 'Free (or minimal LLM cost if fallback is used)',
    path: '/tools/fuzzy-text-locator',
    status: 'stable'
  };

  inputSchema = inputSchema;
  outputSchema = outputSchema;

  async execute(input: TextLocationFinderInput, context: ToolContext): Promise<TextLocationFinderOutput> {
    const startTime = Date.now();
    
    context.logger.debug(`FuzzyTextLocator: Searching for "${input.searchText}" in document of ${input.documentText.length} characters`);

    try {
      // Convert options to unified TextLocationOptions format
      const locationOptions: TextLocationOptions = {
        normalizeQuotes: input.options?.normalizeQuotes ?? false,
        partialMatch: input.options?.partialMatch ?? false,
        useLLMFallback: input.options?.useLLMFallback ?? false,
        llmContext: input.context,
        pluginName: 'fuzzy-text-locator'
      };

      // Use the unified finder with all strategies
      const locationResult = await findTextLocation(input.searchText, input.documentText, locationOptions);
      
      // Check if LLM was used based on the strategy
      const llmUsed = locationResult?.strategy === 'llm';
      const llmSuggestion: string | undefined = undefined; // LLM explanations removed for efficiency

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
            confidence: locationResult.confidence
          },
          processingTimeMs: processingTime,
          llmUsed,
          llmSuggestion
        };

        context.logger.debug(`FuzzyTextLocator: Found text using ${locationResult.strategy} strategy in ${processingTime}ms`);
        return output;
      } else {
        const output: TextLocationFinderOutput = {
          searchText: input.searchText,
          found: false,
          error: 'Text not found in document',
          processingTimeMs: processingTime,
          llmUsed,
          llmSuggestion
        };

        context.logger.debug(`FuzzyTextLocator: Text not found in ${processingTime}ms`);
        return output;
      }

    } catch (error) {
      context.logger.error('FuzzyTextLocator execution failed:', error);
      throw new Error(`Fuzzy text locator failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Validation specific to this tool
  override async validateAccess(context: ToolContext): Promise<boolean> {
    // This tool requires no special permissions - it's a pure utility
    return true;
  }


  // Optional: provide usage examples
  getExamples(): Array<{ input: TextLocationFinderInput; description: string }> {
    return [
      {
        description: "Basic exact text search",
        input: {
          documentText: "This is a sample document with some text. It contains multiple sentences and paragraphs.",
          searchText: "sample document"
        }
      },
      {
        description: "Quote normalization (apostrophes)",
        input: {
          documentText: "The company's earnings weren't what analysts expected.",
          searchText: "The company's earnings weren't what analysts expected.",
          options: {
            normalizeQuotes: true
          }
        }
      },
      {
        description: "Partial match for long text",
        input: {
          documentText: "The research shows that climate change will impact agriculture significantly by 2030.",
          searchText: "The research shows that climate change will impact agriculture and food security in developing nations by 2030",
          options: {
            partialMatch: true
          }
        }
      },
      {
        description: "LLM fallback for paraphrased text (with explanation)",
        input: {
          documentText: "Studies indicate that global temperatures may rise by 2-3 degrees Celsius over the next five decades.",
          searchText: "research shows that worldwide temperatures could increase by 2-3°C in the next 50 years",
          options: {
            useLLMFallback: true,
            includeLLMExplanation: true
          }
        }
      },
      {
        description: "LLM fallback without explanation (saves tokens)",
        input: {
          documentText: "The company reported revenues of $5.2 billion in Q3 2023.",
          searchText: "the firm announced earnings of 5.2B dollars in the third quarter of 2023",
          options: {
            useLLMFallback: true,
            includeLLMExplanation: false
          }
        }
      }
    ];
  }
}

// Export the tool instance
export default new FuzzyTextLocatorTool();

// Re-export core functions and types for use by other tools/plugins
export {
  findTextLocation,
  type TextLocation,
  type TextLocationOptions,
  type SimpleLocationOptions, // Backward compatibility alias
  type EnhancedLocationOptions, // Backward compatibility alias
  type DocumentLocation
} from './core';