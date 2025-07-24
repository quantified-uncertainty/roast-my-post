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
import { findSpellingErrorLocation } from "@/lib/documentAnalysis/shared/pluginLocationWrappers";
import { generateSpellingComment, generateDocumentSummary } from "./commentGeneration";

export interface SpellingErrorWithLocation {
  error: SpellingGrammarError;
  chunk: TextChunk;
  location?: {
    startOffset: number;
    endOffset: number;
    quotedText: string;
  };
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

    logger.info("SpellingAnalyzer: Starting analysis");

    await this.checkSpellingAndGrammar();
    this.findErrorLocations();
    this.createComments();
    this.generateAnalysis();

    this.hasRun = true;
    logger.info(
      `SpellingAnalyzer: Analysis complete - ${this.comments.length} comments generated`
    );

    return this.getResults();
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

  private async checkSpellingAndGrammar(): Promise<void> {
    logger.debug(
      `SpellingAnalyzer: Checking ${this.chunks.length} chunks in parallel`
    );

    // Process all chunks in parallel
    const chunkResults = await Promise.allSettled(
      this.chunks.map(async (chunk) => {
        try {
          const result = await checkSpellingGrammarTool.execute(
            {
              text: chunk.text,
              maxErrors: 20, // Limit errors per chunk
            },
            {
              logger: logger,
            }
          );

          // Track LLM interactions - convert from RichLLMInteraction to LLMInteraction
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
              // Calculate cost based on token usage (using rough estimate)
              const costPerInputToken = 0.003 / 1000; // $3 per 1M input tokens
              const costPerOutputToken = 0.015 / 1000; // $15 per 1M output tokens
              const cost = (richInteraction.tokensUsed.prompt * costPerInputToken) + 
                          (richInteraction.tokensUsed.completion * costPerOutputToken);
              this.totalCost += cost;
            }
          }

          return { chunk, result };
        } catch (error) {
          logger.error(
            `Failed to check spelling in chunk ${chunk.id}:`,
            error
          );
          throw error;
        }
      })
    );

    // Process successful results
    for (const chunkResult of chunkResults) {
      if (chunkResult.status === 'fulfilled') {
        const { chunk, result } = chunkResult.value;
        
        // Store errors with their chunks
        for (const error of result.errors) {
          this.errors.push({ error, chunk });
        }

        // Skip LLM interaction tracking for now - it's not critical
        // Just track a simple cost estimate based on text length
        const estimatedCost = (chunk.text.length / 1000) * 0.001; // Rough estimate
        this.totalCost += estimatedCost;
      }
    }

    logger.debug(
      `SpellingAnalyzer: Found ${this.errors.length} spelling/grammar errors`
    );
  }

  private findErrorLocations(): void {
    for (const errorWithChunk of this.errors) {
      const location = this.findLocationInChunk(errorWithChunk);
      if (location) {
        errorWithChunk.location = location;
      }
    }
  }

  private findLocationInChunk(errorWithChunk: SpellingErrorWithLocation): {
    startOffset: number;
    endOffset: number;
    quotedText: string;
  } | null {
    const { error, chunk } = errorWithChunk;
    
    const chunkLocation = findSpellingErrorLocation(
      error.text,
      chunk.text,
      {
        allowPartialMatch: true,
        context: error.context,
      }
    );

    if (!chunkLocation || !chunk.metadata?.position) {
      logger.warn(
        `Could not find location for spelling error: ${error.text}`
      );
      return null;
    }

    return {
      startOffset: chunk.metadata.position.start + chunkLocation.startOffset,
      endOffset: chunk.metadata.position.start + chunkLocation.endOffset,
      quotedText: chunkLocation.quotedText,
    };
  }

  private createComments(): void {
    for (const errorWithLocation of this.errors) {
      if (!errorWithLocation.location) continue;

      const comment = this.createComment(errorWithLocation);
      if (comment) {
        this.comments.push(comment);
      }
    }

    logger.debug(`SpellingAnalyzer: Created ${this.comments.length} comments`);
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