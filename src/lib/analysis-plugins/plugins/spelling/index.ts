import type { SpellingGrammarError } from "@/tools/check-spelling-grammar";
import { checkSpellingGrammarTool } from "@/tools/check-spelling-grammar";
import type { Comment } from "@/types/documentSchema";

import { logger } from "../../../logger";
import { TextChunk } from "../../TextChunk";
import {
  AnalysisResult,
  RoutingExample,
  SimpleAnalysisPlugin,
} from "../../types";
import { generateSpellingComment, generateDocumentSummary } from "./commentGeneration";
import { detectLanguageConvention, detectDocumentType, getConventionExamples } from "./conventionDetector";
import { calculateGrade, countWords, generateGradeSummary } from "./grading";

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
  private totalCost: number = 0;
  private errors: SpellingErrorWithLocation[] = [];
  private languageConvention?: ReturnType<typeof detectLanguageConvention>;
  private documentType?: ReturnType<typeof detectDocumentType>;
  private gradeResult?: ReturnType<typeof calculateGrade>;

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

      // Detect conventions and document type
      this.detectConventions();

      // Process chunks and create comments in one pass
      await this.processChunksAndCreateComments();
      
      // Calculate grade
      const wordCount = countWords(this.documentText);
      this.gradeResult = calculateGrade(this.errors.map(e => e.error), wordCount);
      
      logger.info("SpellingAnalyzer: Generating analysis summary...");
      this.generateAnalysis();

      this.hasRun = true;
      logger.info(
        `SpellingAnalyzer: Analysis complete - ${this.comments.length} comments generated, grade: ${this.gradeResult.grade}/100`
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
      cost: this.totalCost,
      grade: this.gradeResult?.grade,
    };
  }

  private async processChunksAndCreateComments(): Promise<void> {
    logger.debug(
      `SpellingAnalyzer: Processing ${this.chunks.length} chunks`
    );

    // Log detected convention once before processing
    if (this.languageConvention && this.languageConvention.convention !== 'unknown') {
      logger.info(`SpellingAnalyzer: Using detected ${this.languageConvention.convention} English convention for spell checking`);
    }

    // Process chunks sequentially to maintain order and process errors immediately
    for (const chunk of this.chunks) {
      try {
        logger.debug(`SpellingAnalyzer: Checking chunk ${chunk.id}`);
        
        // Use detected convention if available, otherwise auto-detect
        const convention = this.languageConvention && this.languageConvention.convention !== 'unknown' 
          ? (this.languageConvention.convention === 'mixed' ? 'auto' : this.languageConvention.convention)
          : 'auto';
        
        const result = await checkSpellingGrammarTool.execute(
          {
            text: chunk.text,
            maxErrors: 20, // Limit errors per chunk
            convention: convention as 'US' | 'UK' | 'auto',
          },
          {
            logger: logger,
          }
        );


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
        llmContext: error.context, // Use context if provided
        useLLMFallback: true,   // Enable LLM fallback for difficult cases
        pluginName: 'spelling'
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

  private detectConventions(): void {
    logger.info("SpellingAnalyzer: Detecting language conventions and document type");
    
    // Take a sample from the beginning for analysis
    const sampleSize = Math.min(2000, this.documentText.length);
    const sample = this.documentText.slice(0, sampleSize);
    
    this.languageConvention = detectLanguageConvention(sample);
    this.documentType = detectDocumentType(sample);
    
    logger.info("SpellingAnalyzer: Detected conventions", {
      language: this.languageConvention.convention,
      languageConfidence: this.languageConvention.confidence,
      documentType: this.documentType.type,
      documentTypeConfidence: this.documentType.confidence
    });
  }

  private generateAnalysis(): void {
    // Build comprehensive analysis
    let analysisText = '';
    
    // Always add grade summary if available
    if (this.gradeResult) {
      analysisText += generateGradeSummary(this.gradeResult) + '\n\n';
    }
    
    // Always add convention detection results if available
    if (this.languageConvention && this.languageConvention.convention !== 'unknown') {
      analysisText += `**Language Convention**: ${this.languageConvention.convention} English`;
      if (this.languageConvention.confidence < 0.8) {
        analysisText += ` (${Math.round(this.languageConvention.confidence * 100)}% confidence)`;
      }
      analysisText += '\n';
      
      if (this.languageConvention.convention === 'mixed') {
        analysisText += '⚠️ Mixed US/UK spelling detected. Consider standardizing to one convention.\n';
      }
      
      const examples = getConventionExamples(this.languageConvention.convention);
      if (examples.length > 0) {
        analysisText += examples.map(ex => `• ${ex}`).join('\n') + '\n';
      }
      analysisText += '\n';
    }
    
    // Always add document type if available
    if (this.documentType && this.documentType.type !== 'unknown') {
      analysisText += `**Document Type**: ${this.documentType.type.charAt(0).toUpperCase() + this.documentType.type.slice(1)}\n\n`;
    }
    
    if (this.errors.length === 0) {
      // No errors case
      if (!analysisText) {
        this.analysis = "The document appears to be free of spelling and grammar errors.";
      } else {
        analysisText += "The document appears to be free of spelling and grammar errors.";
        this.analysis = analysisText;
      }
      
      this.summary = "No spelling or grammar errors found.";
      if (this.gradeResult) {
        this.summary = `${this.gradeResult.category} (${this.gradeResult.grade}/100) - ${this.summary}`;
      }
      return;
    }
    
    // Add detailed error analysis
    analysisText += generateDocumentSummary(this.errors);
    
    this.analysis = analysisText;

    // Generate simple summary for the summary field
    if (this.gradeResult) {
      this.summary = `${this.gradeResult.category} (${this.gradeResult.grade}/100) - ${this.gradeResult.statistics.totalErrors} issue${this.gradeResult.statistics.totalErrors !== 1 ? 's' : ''}`;
    } else {
      const totalErrors = this.errors.length;
      this.summary = `Found ${totalErrors} issue${totalErrors !== 1 ? "s" : ""}`;
    }
  }

  getCost(): number {
    return this.totalCost;
  }


  getDebugInfo(): Record<string, unknown> {
    return {
      hasRun: this.hasRun,
      errorsCount: this.errors.length,
      commentsCount: this.comments.length,
      totalCost: this.totalCost,
      llmInteractionsCount: 0,
    };
  }
}

// Export SpellingAnalyzerJob as SpellingPlugin for compatibility
export { SpellingAnalyzerJob as SpellingPlugin };