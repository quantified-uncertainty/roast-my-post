import type { SpellingGrammarError } from "@/tools/check-spelling-grammar";
import { checkSpellingGrammarTool } from "@/tools/check-spelling-grammar";
import type { Comment } from "@/types/documentSchema";

import { logger } from "../../../logger";
import { TextChunk } from "../../TextChunk";
import {
  AnalysisResult,
  LLMInteraction,
  RoutingExample,
  SimpleAnalysisPlugin,
} from "../../types";
import { generateSpellingComment, generateDocumentSummary } from "./commentGeneration";

export interface SpellingErrorWithLocation {
  error: SpellingGrammarError;
  chunk: TextChunk;
  location?: {
    startOffset: number;
    endOffset: number;
    quotedText: string;
  } | null;
}

export class SpellingAnalyzerJob implements SimpleAnalysisPlugin {
  private documentText: string;
  private chunks: TextChunk[];
  private hasRun = false;
  private comments: Comment[] = [];
  private summary: string = "";
  private analysis: string = "";
  private llmInteractions: LLMInteraction[] = [];
  private totalCost: number = 0;
  private errors: SpellingErrorWithLocation[] = [];

  name(): string {
    return "SPELLING";
  }

  promptForWhenToUse(): string {
    return `Call this for ALL text chunks to check spelling and grammar. This is a basic check that should run on every chunk unless it's pure code, data, or references.`;
  }

  routingExamples(): RoutingExample[] {
    return [
      {
        chunkText: "The quick brown fox jumps over the lazy dog.",
        shouldProcess: true,
        reason: "Normal text should be checked for spelling and grammar",
      },
      {
        chunkText: "Thier are many problms with this sentance.",
        shouldProcess: true,
        reason: "Text with obvious errors needs checking",
      },
      {
        chunkText: "[1] Smith, J. (2023). Title. Journal. [2] Doe, J. (2022)...",
        shouldProcess: false,
        reason: "Pure reference lists can be skipped",
      },
      {
        chunkText: "function calculate() { return 2 + 2; }",
        shouldProcess: false,
        reason: "Code blocks should not be spell-checked",
      },
    ];
  }

  constructor() {
    // Initialize empty values - they'll be set in analyze()
    this.documentText = "";
    this.chunks = [];
  }

  async analyze(chunks: TextChunk[], documentText: string): Promise<AnalysisResult> {
    // Store the inputs
    this.documentText = documentText;
    this.chunks = chunks;
    if (this.hasRun) {
      return this.getResults();
    }

    try {
      logger.info("SpellingAnalyzer: Starting analysis");

      // Process chunks and create comments in one pass
      await this.processChunksAndCreateComments();
      
      logger.info("SpellingAnalyzer: Generating analysis summary...");
      this.generateAnalysis();

      this.hasRun = true;
      logger.info(
        `SpellingAnalyzer: Analysis complete - ${this.comments.length} comments generated`
      );

      return this.getResults();
    } catch (error) {
      logger.error("SpellingAnalyzer: Fatal error during analysis", error);
      // Return a partial result instead of throwing
      this.hasRun = true;
      this.summary = "Analysis failed due to an error";
      this.analysis = "The spelling and grammar analysis could not be completed due to a technical error.";
      return this.getResults();
    }
  }

  public getResults(): AnalysisResult {
    if (!this.hasRun) {
      throw new Error("Analysis has not been run yet. Call analyze() first.");
    }

    return {
      summary: this.summary,
      analysis: this.analysis,
      comments: this.comments,
      llmInteractions: this.llmInteractions,
      cost: this.totalCost,
    };
  }

  private async processChunksAndCreateComments(): Promise<void> {
    logger.debug(
      `SpellingAnalyzer: Processing ${this.chunks.length} chunks`
    );

    // Process chunks sequentially to maintain order and process errors immediately
    for (const chunk of this.chunks) {
      try {
        logger.debug(`SpellingAnalyzer: Checking chunk ${chunk.id}`);
        
        const result = await checkSpellingGrammarTool.execute(
          {
            text: chunk.text,
            maxErrors: 20, // Limit errors per chunk
          },
          {
            logger: logger,
          }
        );

        // Track LLM interactions
        if (result.llmInteractions) {
          for (const richInteraction of result.llmInteractions) {
            const llmInteraction: LLMInteraction = {
              messages: [
                { role: "user", content: richInteraction.prompt },
                { role: "assistant", content: richInteraction.response }
              ],
              usage: {
                input_tokens: richInteraction.tokensUsed.prompt,
                output_tokens: richInteraction.tokensUsed.completion
              }
            };
            this.llmInteractions.push(llmInteraction);
            // Calculate cost based on token usage
            const costPerInputToken = 0.003 / 1000; // $3 per 1M input tokens
            const costPerOutputToken = 0.015 / 1000; // $15 per 1M output tokens
            const cost = (richInteraction.tokensUsed.prompt * costPerInputToken) + 
                        (richInteraction.tokensUsed.completion * costPerOutputToken);
            this.totalCost += cost;
          }
        }

        logger.info(`SpellingAnalyzer: Chunk ${chunk.id} returned ${result.errors.length} errors`);

        // Process each error immediately
        for (const error of result.errors) {
          // Validate error has required fields
          if (!error || !error.text || typeof error.text !== 'string' || !error.text.trim()) {
            logger.warn('SpellingAnalyzer: Skipping invalid error from LLM', { error });
            continue;
          }

          // Find location in this specific chunk immediately
          const location = await this.findLocationInChunk({ error, chunk });
          
          if (location) {
            // Create comment immediately
            const comment = this.createComment({ error, chunk, location });
            if (comment) {
              this.comments.push(comment);
              logger.debug(`SpellingAnalyzer: Created comment for error "${error.text.slice(0, 30)}..." in chunk ${chunk.id}`);
            }
          } else {
            logger.warn(`SpellingAnalyzer: Could not find location for error "${error.text.slice(0, 30)}..." in chunk ${chunk.id}`);
          }
          
          // Still track the error for analysis summary
          this.errors.push({ error, chunk, location });
        }

      } catch (error) {
        logger.error(`Failed to process chunk ${chunk.id}:`, error);
        // Continue with next chunk instead of failing entirely
      }
    }

    logger.info(
      `SpellingAnalyzer: Processed ${this.chunks.length} chunks, created ${this.comments.length} comments`
    );
  }


  private async findLocationInChunk(errorWithChunk: SpellingErrorWithLocation): Promise<{
    startOffset: number;
    endOffset: number;
    quotedText: string;
  } | null> {
    const { error, chunk } = errorWithChunk;
    
    // Safety check for undefined error text
    if (!error.text || typeof error.text !== 'string') {
      logger.warn(`SpellingAnalyzer: Invalid error text - skipping`, { 
        errorText: error.text,
        correction: error.correction,
        type: error.type
      });
      return null;
    }
    
    // Since we're now processing errors immediately after extraction from the same chunk,
    // we can trust that the error exists in this chunk. No need for extensive debugging.
    
    // Use the chunk's method to find text and convert to absolute position
    const location = await chunk.findTextAbsolute(
      error.text,
      {
        normalizeQuotes: true,  // Handle apostrophe variations
        partialMatch: true,     // For longer errors
        context: error.context, // Use context if provided
        useLLMFallback: true,   // Enable LLM fallback for difficult cases
        pluginName: 'spelling',
        documentText: this.documentText  // Pass for position verification
      }
    );

    if (!location) {
      logger.warn(
        `Could not find location for spelling error: ${error.text}`
      );
      return null;
    }

    return location;
  }


  private createComment(errorWithLocation: SpellingErrorWithLocation): Comment | null {
    const { error, location } = errorWithLocation;
    
    if (!location) return null;

    const message = generateSpellingComment(error);
    const importance = this.calculateImportance(error);

    return {
      description: message,
      isValid: true,
      highlight: {
        startOffset: location.startOffset,
        endOffset: location.endOffset,
        quotedText: location.quotedText,
        isValid: true,
      },
      importance,
    };
  }

  private calculateImportance(error: SpellingGrammarError): number {
    // Map importance (0-100) to comment importance (1-10)
    const score = error.importance;
    
    if (score <= 25) {
      // Minor typos: importance 2-3
      return 2 + Math.floor(score / 25);
    } else if (score <= 50) {
      // Noticeable errors: importance 4-5
      return 4 + Math.floor((score - 25) / 25);
    } else if (score <= 75) {
      // Errors affecting clarity: importance 6-7
      return 6 + Math.floor((score - 50) / 25);
    } else {
      // Critical errors: importance 8-10
      return 8 + Math.floor((score - 75) / 12.5);
    }
  }

  private generateAnalysis(): void {
    if (this.errors.length === 0) {
      this.summary = "No spelling or grammar errors found.";
      this.analysis = "The document appears to be free of spelling and grammar errors.";
      return;
    }

    // Use the document summary generator
    this.analysis = generateDocumentSummary(this.errors);

    // Generate simple summary for the summary field
    const totalErrors = this.errors.length;
    const errorsByType = {
      spelling: this.errors.filter(e => e.error.type === 'spelling').length,
      grammar: this.errors.filter(e => e.error.type === 'grammar').length,
    };

    this.summary = `Found ${totalErrors} issue${totalErrors !== 1 ? "s" : ""}`;
    
    const parts = [];
    if (errorsByType.spelling > 0) {
      parts.push(`${errorsByType.spelling} spelling`);
    }
    if (errorsByType.grammar > 0) {
      parts.push(`${errorsByType.grammar} grammar`);
    }
    
    if (parts.length > 0) {
      this.summary += ` (${parts.join(", ")})`;
    }
  }

  getCost(): number {
    return this.totalCost;
  }

  getLLMInteractions(): LLMInteraction[] {
    return this.llmInteractions;
  }

  getDebugInfo(): Record<string, unknown> {
    return {
      hasRun: this.hasRun,
      errorsCount: this.errors.length,
      commentsCount: this.comments.length,
      totalCost: this.totalCost,
      llmInteractionsCount: this.llmInteractions.length,
    };
  }
}

// Export SpellingAnalyzerJob as SpellingPlugin for compatibility
export { SpellingAnalyzerJob as SpellingPlugin };