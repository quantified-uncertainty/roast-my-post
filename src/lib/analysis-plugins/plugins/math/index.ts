import type {
  ExtractedMathExpression as ExtractedMathExpressionToolType,
} from "@/tools/extract-math-expressions";
import {
  extractMathExpressionsTool,
} from "@/tools/extract-math-expressions";
import type { Comment } from "@/types/documentSchema";

import { logger } from "../../../logger";
import { TextChunk } from "../../TextChunk";
import {
  AnalysisResult,
  LLMInteraction,
  RoutingExample,
  SimpleAnalysisPlugin,
} from "../../types";
import { generateMathComment, generateDocumentSummary } from "./commentGeneration";

export interface MathExpressionWithComment {
  expression: ExtractedMathExpressionToolType;
  comment?: Comment;
}

export class ExtractedMathExpression {
  public expression: ExtractedMathExpressionToolType;
  private chunk: TextChunk;
  private documentText: string;

  constructor(expression: ExtractedMathExpressionToolType, chunk: TextChunk, documentText: string) {
    this.expression = expression;
    this.chunk = chunk;
    this.documentText = documentText;
  }

  get originalText(): string {
    return this.expression.originalText;
  }

  get averageScore(): number {
    return (
      (this.expression.complexityScore +
        this.expression.contextImportanceScore +
        this.expression.errorSeverityScore) /
      3
    );
  }

  public async findLocationInDocument(): Promise<{
    startOffset: number;
    endOffset: number;
    quotedText: string;
  } | null> {
    // Use the chunk's method to find text and convert to absolute position
    const location = await this.chunk.findTextAbsolute(
      this.expression.originalText,
      {
        normalizeQuotes: true,  // Math might have quote variations
        useLLMFallback: true,   // Enable LLM fallback for complex expressions
        pluginName: 'math',
        documentText: this.documentText  // Pass for position verification
      }
    );
    
    if (!location) {
      logger.warn(
        `Math expression not found in chunk: "${this.expression.originalText}"`,
        {
          chunkId: this.chunk.id,
          chunkTextPreview: this.chunk.text.slice(0, 200) + '...',
          searchedFor: this.expression.originalText
        }
      );
    }
    
    return location;
  }

  private commentImportanceScore(): number {
    // Higher importance for errors, complex expressions, and contextually important ones
    const baseScore = this.expression.hasError ? 8 : 3;
    const complexityBonus = this.expression.complexityScore / 20;
    const contextBonus = this.expression.contextImportanceScore / 30;
    return Math.min(10, baseScore + complexityBonus + contextBonus);
  }

  public async getComment(): Promise<Comment | null> {
    // Only generate comments for expressions with errors or high importance
    if (!this.expression.hasError && this.averageScore < 60) {
      return null;
    }

    const location = await this.findLocationInDocument();
    if (!location) return null;

    const message = generateMathComment(this.expression);

    return {
      description: message,
      isValid: true,
      highlight: {
        startOffset: location.startOffset,
        endOffset: location.endOffset,
        quotedText: location.quotedText,
        isValid: true,
      },
      importance: this.commentImportanceScore(),
    };
  }
}

export class MathAnalyzerJob implements SimpleAnalysisPlugin {
  private documentText: string;
  private chunks: TextChunk[];
  private hasRun = false;
  private comments: Comment[] = [];
  private summary: string = "";
  private analysis: string = "";
  private llmInteractions: LLMInteraction[] = [];
  private totalCost: number = 0;
  private extractedExpressions: ExtractedMathExpression[] = [];

  name(): string {
    return "MATH";
  }

  promptForWhenToUse(): string {
    return `Call this when there is math of any kind. This includes:
- Equations and formulas (2+2=4, E=mc², etc.)
- Statistical calculations or percentages
- Back-of-the-envelope calculations
- Mathematical reasoning or proofs
- Numerical comparisons (X is 3x larger than Y)
- Unit conversions
- Any discussion involving mathematical relationships`;
  }

  routingExamples(): RoutingExample[] {
    return [
      {
        chunkText:
          "The population grew by 15% over the last decade, from 1.2M to 1.38M",
        shouldProcess: true,
        reason: "Contains percentage calculation that should be verified",
      },
      {
        chunkText: "Mathematics has been called the language of the universe",
        shouldProcess: false,
        reason: "Discusses math conceptually but contains no actual math",
      },
      {
        chunkText:
          "If we assume a 7% annual return, $10,000 invested today would be worth $19,672 in 10 years",
        shouldProcess: true,
        reason: "Contains compound interest calculation",
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
      logger.info("MathAnalyzer: Starting analysis");
      logger.info(`MathAnalyzer: Processing ${chunks.length} chunks`);

      await this.extractMathExpressions();
      
      logger.info(`MathAnalyzer: Extracted ${this.extractedExpressions.length} math expressions from document`);
      await this.createComments();
      
      logger.info(`MathAnalyzer: Created ${this.comments.length} comments`);
      this.generateAnalysis();

      this.hasRun = true;
      logger.info(
        `MathAnalyzer: Analysis complete - ${this.comments.length} comments generated`
      );

      return this.getResults();
    } catch (error) {
      logger.error("MathAnalyzer: Fatal error during analysis", error);
      // Return a partial result instead of throwing
      this.hasRun = true;
      this.summary = "Analysis failed due to an error";
      this.analysis = "The mathematical analysis could not be completed due to a technical error.";
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

  private async extractMathExpressions(): Promise<void> {
    logger.debug(
      `MathAnalyzer: Extracting from ${this.chunks.length} chunks in parallel`
    );

    // Process all chunks in parallel
    const chunkResults = await Promise.allSettled(
      this.chunks.map(async (chunk) => {
        try {
          const result = await extractMathExpressionsTool.execute(
            {
              text: chunk.text,
              verifyCalculations: true,
              includeContext: true,
            },
            {
              logger: logger,
            }
          );

          // Track LLM interactions - convert from RichLLMInteraction to LLMInteraction
          if (result.llmInteraction) {
            const richInteraction = result.llmInteraction;
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

          return { chunk, result };
        } catch (error) {
          logger.error(
            `Failed to extract math from chunk ${chunk.id}:`,
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
        for (const expression of result.expressions) {
          const extractedExpression = new ExtractedMathExpression(
            expression,
            chunk,
            this.documentText
          );
          this.extractedExpressions.push(extractedExpression);
        }
      }
    }

    logger.debug(
      `MathAnalyzer: Extracted ${this.extractedExpressions.length} math expressions from document`
    );
  }

  private async createComments(): Promise<void> {
    // Process comments in parallel for better performance
    const comments = await Promise.all(
      this.extractedExpressions.map(extractedExpression => extractedExpression.getComment())
    );
    
    // Filter out null comments and add to array
    this.comments = comments.filter((comment): comment is Comment => comment !== null);

    logger.debug(`MathAnalyzer: Created ${this.comments.length} comments`);
  }

  private generateAnalysis(): void {
    if (this.extractedExpressions.length === 0) {
      this.summary = "No mathematical expressions found.";
      this.analysis =
        "No mathematical calculations or formulas were identified in this document.";
      return;
    }

    // Use the document summary generator
    this.analysis = generateDocumentSummary(this.extractedExpressions);

    // Generate simple summary for the summary field
    const totalExpressions = this.extractedExpressions.length;
    const expressionsWithErrors = this.extractedExpressions.filter(
      (ee) => ee.expression.hasError
    ).length;
    const complexExpressions = this.extractedExpressions.filter(
      (ee) => ee.expression.complexityScore > 70
    ).length;

    this.summary = `Found ${totalExpressions} mathematical expression${totalExpressions !== 1 ? "s" : ""}`;
    if (expressionsWithErrors > 0) {
      this.summary += ` (${expressionsWithErrors} with errors)`;
    }
    if (complexExpressions > 0) {
      this.summary += `. ${complexExpressions} complex calculations analyzed.`;
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
      expressionsCount: this.extractedExpressions.length,
      commentsCount: this.comments.length,
      totalCost: this.totalCost,
      llmInteractionsCount: this.llmInteractions.length,
    };
  }
}

// Export MathAnalyzerJob as MathPlugin for compatibility
export { MathAnalyzerJob as MathPlugin };