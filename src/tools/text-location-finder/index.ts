import { z } from 'zod';
import { Tool, ToolConfig, ToolContext } from '../base/Tool';
import { findTextLocation, findMultipleTextLocations, TextLocationOptions } from '@/lib/documentAnalysis/shared/textLocationFinder';

export interface TextLocationFinderInput {
  documentText: string;
  searchText: string;
  context?: string;
  options?: {
    // Essential options only
    caseInsensitive?: boolean;
    allowPartialMatch?: boolean;
  };
}

export interface TextLocationFinderOutput {
  searchText: string;
  found: boolean;
  location?: {
    startOffset: number;
    endOffset: number;
    quotedText: string;
    lineNumber: number;
    lineText: string;
    strategy: string;
    confidence: number;
  };
  error?: string;
  processingTimeMs: number;
}

// Input validation schema
const inputSchema = z.object({
  documentText: z.string().min(1, "Document text is required").max(100000, "Document text too long"),
  searchText: z.string().min(1, "Search text is required").max(1000, "Search text too long"),
  context: z.string().optional(),
  options: z.object({
    caseInsensitive: z.boolean().optional(),
    allowPartialMatch: z.boolean().optional(),
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
    lineNumber: z.number(),
    lineText: z.string(),
    strategy: z.string(),
    confidence: z.number()
  }).optional(),
  error: z.string().optional(),
  processingTimeMs: z.number()
});

export class TextLocationFinderTool extends Tool<TextLocationFinderInput, TextLocationFinderOutput> {
  config: ToolConfig = {
    id: 'text-location-finder',
    name: 'Text Location Finder',
    description: 'Find the location of text within documents using multiple search strategies including exact matching, fuzzy matching, and context-based searching',
    version: '1.0.0',
    category: 'utility',
    costEstimate: 'Free - no external API calls',
    path: '/tools/text-location-finder',
    status: 'stable'
  };

  inputSchema = inputSchema;
  outputSchema = outputSchema;

  async execute(input: TextLocationFinderInput, context: ToolContext): Promise<TextLocationFinderOutput> {
    const startTime = Date.now();
    
    context.logger.debug(`TextLocationFinder: Searching for "${input.searchText}" in document of ${input.documentText.length} characters`);

    try {
      // Convert options to TextLocationOptions format
      const locationOptions: TextLocationOptions = {
        caseInsensitive: input.options?.caseInsensitive ?? false,
        allowPartialMatch: input.options?.allowPartialMatch ?? false,
        context: input.context
      };

      // Use the unified finder for single search
      const locationResult = findTextLocation(input.searchText, input.documentText, locationOptions);

      const processingTime = Date.now() - startTime;
      
      if (locationResult) {
        const output: TextLocationFinderOutput = {
          searchText: input.searchText,
          found: true,
          location: {
            startOffset: locationResult.startOffset,
            endOffset: locationResult.endOffset,
            quotedText: locationResult.quotedText,
            lineNumber: locationResult.lineNumber,
            lineText: locationResult.lineText,
            strategy: locationResult.strategy,
            confidence: locationResult.confidence
          },
          processingTimeMs: processingTime
        };

        context.logger.debug(`TextLocationFinder: Found text using ${locationResult.strategy} strategy in ${processingTime}ms`);
        return output;
      } else {
        const output: TextLocationFinderOutput = {
          searchText: input.searchText,
          found: false,
          error: 'Text not found in document',
          processingTimeMs: processingTime
        };

        context.logger.debug(`TextLocationFinder: Text not found in ${processingTime}ms`);
        return output;
      }

    } catch (error) {
      context.logger.error('TextLocationFinder execution failed:', error);
      throw new Error(`Text location finder failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        description: "Partial match with context",
        input: {
          documentText: "The research shows that climate change will impact agriculture by 2030. Scientists predict significant challenges.",
          searchText: "climate change will cause problems by 2030",
          context: "research about agriculture and climate",
          options: {
            allowPartialMatch: true
          }
        }
      },
      {
        description: "Case-insensitive search",
        input: {
          documentText: 'The article mentions "artificial intelligence" and discusses AI development.',
          searchText: "ARTIFICIAL INTELLIGENCE",
          options: {
            caseInsensitive: true
          }
        }
      }
    ];
  }
}

// Export the tool instance
export default new TextLocationFinderTool();