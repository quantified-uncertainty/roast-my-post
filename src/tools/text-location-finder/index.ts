import { z } from 'zod';
import { Tool, ToolConfig, ToolContext } from '../base/Tool';
import { findTextLocation, findMultipleTextLocations, TextLocationOptions, TextLocation } from '@/lib/documentAnalysis/shared/textLocationFinder';
import { callClaudeWithTool, MODEL_CONFIG } from '@/lib/claude/wrapper';

export interface TextLocationFinderInput {
  documentText: string;
  searchText: string;
  context?: string;
  options?: {
    // Essential options only
    caseInsensitive?: boolean;
    allowPartialMatch?: boolean;
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
    lineNumber: number;
    lineText: string;
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
    caseInsensitive: z.boolean().optional(),
    allowPartialMatch: z.boolean().optional(),
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
    lineNumber: z.number(),
    lineText: z.string(),
    strategy: z.string(),
    confidence: z.number()
  }).optional(),
  error: z.string().optional(),
  processingTimeMs: z.number(),
  llmUsed: z.boolean().optional(),
  llmSuggestion: z.string().optional()
});

export class TextLocationFinderTool extends Tool<TextLocationFinderInput, TextLocationFinderOutput> {
  config: ToolConfig = {
    id: 'text-location-finder',
    name: 'Text Location Finder',
    description: 'Find the location of text within documents using multiple search strategies including exact matching, fuzzy matching, context-based searching, and LLM fallback for difficult cases',
    version: '1.1.0',
    category: 'utility',
    costEstimate: 'Free (or minimal LLM cost if fallback is used)',
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
      let locationResult = findTextLocation(input.searchText, input.documentText, locationOptions);
      let llmUsed = false;
      let llmSuggestion: string | undefined;

      // If not found and LLM fallback is enabled, try LLM
      if (!locationResult && input.options?.useLLMFallback) {
        context.logger.debug('TextLocationFinder: Trying LLM fallback...');
        const llmResult = await this.findWithLLM(
          input.searchText, 
          input.documentText, 
          input.context, 
          input.options.includeLLMExplanation || false,
          context
        );
        
        if (llmResult) {
          locationResult = llmResult.location;
          llmUsed = true;
          llmSuggestion = llmResult.suggestion;
        }
      }

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
          processingTimeMs: processingTime,
          llmUsed,
          llmSuggestion
        };

        context.logger.debug(`TextLocationFinder: Found text using ${locationResult.strategy} strategy in ${processingTime}ms`);
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

  // LLM fallback method
  private async findWithLLM(
    searchText: string,
    documentText: string,
    context: string | undefined,
    includeExplanation: boolean,
    toolContext: ToolContext
  ): Promise<{ location: TextLocation; suggestion?: string } | null> {
    try {
      const schema = {
        properties: {
          found: {
            type: 'boolean',
            description: 'Whether the text was found in the document'
          },
          matchedText: {
            type: 'string',
            description: 'The actual text found in the document that matches or is most similar to the search text'
          },
          startOffset: {
            type: 'number',
            description: 'The character position where the matched text starts'
          },
          endOffset: {
            type: 'number',
            description: 'The character position where the matched text ends'
          },
          confidence: {
            type: 'number',
            description: 'Confidence score between 0 and 1'
          },
          ...(includeExplanation ? {
            explanation: {
              type: 'string',
              description: 'Brief explanation of how the match was found or why it might be different from the search text'
            }
          } : {})
        },
        required: ['found', 'matchedText', 'startOffset', 'endOffset', 'confidence', ...(includeExplanation ? ['explanation'] : [])]
      };

      const prompt = `You are helping find text in a document. The user is looking for a specific piece of text, but it might not match exactly due to:
- Minor differences in wording
- Truncation or partial text
- OCR errors or typos
- Different formatting or punctuation
- Paraphrasing

Search text: "${searchText}"
${context ? `Additional context: ${context}` : ''}

Document to search in:
${documentText}

Find the best match for the search text in the document. If the exact text isn't found, look for the closest semantic match or partial match. Return the actual text from the document, not the search text.${includeExplanation ? ' Include a brief explanation of how the match was found.' : ''}`;

      const { toolResult } = await callClaudeWithTool({
        model: MODEL_CONFIG.analysis, // Use analysis model as requested
        messages: [{ role: 'user', content: prompt }],
        toolName: 'find_text_location',
        toolDescription: 'Find the location of text in a document',
        toolSchema: { type: 'object', ...schema }
      });

      // Type the result properly
      const result = toolResult as {
        found: boolean;
        matchedText: string;
        startOffset: number;
        endOffset: number;
        confidence: number;
        explanation?: string;
      };

      if (result.found && result.matchedText) {
        // Verify the offsets are correct
        const verifiedText = documentText.substring(result.startOffset, result.endOffset);
        if (verifiedText !== result.matchedText) {
          // Try to find the actual position
          const actualPos = documentText.indexOf(result.matchedText);
          if (actualPos !== -1) {
            result.startOffset = actualPos;
            result.endOffset = actualPos + result.matchedText.length;
          }
        }

        const location: TextLocation = {
          startOffset: result.startOffset,
          endOffset: result.endOffset,
          quotedText: result.matchedText,
          lineNumber: getLineNumberAtPosition(documentText, result.startOffset),
          lineText: getLineAtPosition(documentText, result.startOffset),
          strategy: 'llm',
          confidence: Math.max(0.7, result.confidence * 0.9) // Slightly lower confidence for LLM matches, but keep minimum 70%
        };

        return {
          location,
          suggestion: result.explanation
        };
      }

      return null;
    } catch (error) {
      toolContext.logger.error('LLM fallback failed:', error);
      return null;
    }
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

// Helper function to get line number at position
function getLineNumberAtPosition(text: string, position: number): number {
  const lines = text.substring(0, position).split('\n');
  return lines.length;
}

// Helper function to get line at position
function getLineAtPosition(text: string, position: number): string {
  const lines = text.split('\n');
  const lineNumber = getLineNumberAtPosition(text, position);
  return lines[lineNumber - 1] || '';
}

// Export the tool instance
export default new TextLocationFinderTool();