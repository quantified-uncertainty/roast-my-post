import type {
  ExtractedMathExpression as ExtractedMathExpressionToolType,
} from "../../../tools/extract-math-expressions";
import {
  extractMathExpressionsTool,
} from "../../../tools/extract-math-expressions";
import { checkMathHybridTool } from "../../../tools/check-math-hybrid";
import type { CheckMathHybridOutput } from "../../../tools/check-math-hybrid/types";
import type { Comment, ToolChainResult } from "../../../shared/types";

import { logger } from "../../../shared/logger";
import { TextChunk } from "../../TextChunk";
import {
  AnalysisResult,
  RoutingExample,
  SimpleAnalysisPlugin,
} from "../../types";
import { generateMathComment, generateDocumentSummary } from "./commentGeneration";
import { CommentBuilder } from "../../utils/CommentBuilder";

export interface MathExpressionWithComment {
  expression: ExtractedMathExpressionToolType;
  comment?: Comment;
}

export class HybridMathErrorWrapper {
  public verificationResult: CheckMathHybridOutput;
  public expression: ExtractedMathExpressionToolType;
  private documentText: string;
  private chunkId: string;
  private processingStartTime: number;

  constructor(
    verificationResult: CheckMathHybridOutput, 
    expression: ExtractedMathExpressionToolType, 
    documentText: string,
    chunkId: string,
    processingStartTime: number
  ) {
    this.verificationResult = verificationResult;
    this.expression = expression;
    this.documentText = documentText;
    this.chunkId = chunkId;
    this.processingStartTime = processingStartTime;
  }

  get originalText(): string {
    return this.expression.originalText;
  }

  get averageScore(): number {
    // Convert severity to score for sorting
    if (this.verificationResult.status === 'verified_false') {
      const severity = this.verificationResult.llmResult?.severity || 'minor';
      const severityScore = severity === 'critical' ? 10 : 
                           severity === 'major' ? 7 : 4;
      return severityScore;
    }
    return 0;
  }

  private commentImportanceScore(): number {
    if (this.verificationResult.status === 'verified_false') {
      const baseScore = this.verificationResult.verifiedBy === 'mathjs' ? 9 : 6; // MathJS verified errors are more important
      const severity = this.verificationResult.llmResult?.severity || 'minor';
      const severityBonus = severity === 'critical' ? 2 : 
                           severity === 'major' ? 1 : 0;
      return Math.min(10, baseScore + severityBonus);
    } else if (this.verificationResult.status === 'verified_true') {
      // Lower importance for successful verifications
      return 3;
    }
    return 0;
  }

  public async getComment(): Promise<Comment | null> {
    // Generate comments for all verification results
    // (We can filter later if we only want errors)
    
    // Use the expression text to find location
    const startOffset = this.findTextOffsetInDocument(this.expression.originalText);
    if (startOffset === -1) {
      logger.warn(`Math expression text not found: "${this.expression.originalText}"`);
      return null;
    }

    const endOffset = startOffset + this.expression.originalText.length;
    
    // Build tool chain results
    const toolChain: ToolChainResult[] = [
      {
        toolName: 'extractMath',
        stage: 'extraction',
        timestamp: new Date(this.processingStartTime + 20).toISOString(),
        result: this.expression
      },
      {
        toolName: 'check-math-hybrid',
        stage: 'verification', 
        timestamp: new Date().toISOString(),
        result: this.verificationResult
      }
    ];
    
    // Keep formatted description for backwards compatibility
    const formattedDescription = this.generateEnhancedComment();
    
    return CommentBuilder.build({
      plugin: 'math',
      location: {
        startOffset,
        endOffset,
        quotedText: this.expression.originalText
      },
      chunkId: this.chunkId,
      processingStartTime: this.processingStartTime,
      toolChain,
      
      // Custom description (keeps existing formatting)
      description: formattedDescription,
      
      // Structured content
      header: this.buildHeader(),
      level: this.getLevel(),
      observation: this.buildObservation(),
      significance: this.buildSignificance()
    });
  }
  
  private buildHeader(): string {
    if (this.verificationResult.status === 'verified_true') {
      return `✓ Verified correct`;
    } else if (this.verificationResult.status === 'verified_false' && this.verificationResult.conciseCorrection) {
      return this.verificationResult.conciseCorrection;
    } else if (this.verificationResult.status === 'verified_false') {
      return `Math error: ${this.expression.originalText}`;
    } else {
      return `Cannot verify: ${this.expression.originalText}`;
    }
  }
  
  private getLevel(): 'error' | 'warning' | 'info' | 'success' {
    if (this.verificationResult.status === 'verified_true') {
      return 'success';
    } else if (this.verificationResult.status === 'verified_false') {
      return 'error';
    } else {
      return 'info';
    }
  }
  
  private buildObservation(): string {
    if (this.verificationResult.mathJsResult?.error) {
      return `Calculation error: ${this.verificationResult.mathJsResult.error}`;
    }
    if (this.verificationResult.llmResult?.explanation) {
      return this.verificationResult.llmResult.explanation;
    }
    return "Mathematical expression contains an error";
  }
  
  private buildSignificance(): string | undefined {
    const severity = this.verificationResult.llmResult?.severity;
    if (severity === 'critical') {
      return "Critical error that fundamentally undermines the argument or conclusion";
    } else if (severity === 'major') {
      return "Significant error that affects the validity of related claims";
    } else if (severity === 'minor') {
      return "Minor error that should be corrected for accuracy";
    }
    return undefined;
  }

  private findTextOffsetInDocument(text: string): number {
    // Simple text search - could be enhanced with fuzzy matching
    return this.documentText.indexOf(text);
  }

  private generateEnhancedComment(): string {
    const { verificationResult: result, expression } = this;
    
    // Generate comments for both successful and failed verifications
    let comment = '';
    
    if (result.status === 'verified_true') {
      // For successful verifications, just show the explanation
      comment = result.explanation || '✓ Mathematical expression verified as correct';
    } else if (result.status === 'verified_false') {
      // For errors, show the explanation WITHOUT the concise correction (it's in the header)
      comment = result.explanation || 'Mathematical expression contains an error';
      
      // Remove any "Quick Fix:" line if it exists at the start
      if (comment.startsWith('Quick Fix:')) {
        const lines = comment.split('\n');
        comment = lines.slice(1).join('\n').trim();
      }
    } else {
      // For unverifiable expressions
      comment = result.explanation || 'Mathematical expression could not be verified';
    }
    
    // MathJS-specific enhancements
    if (result.verifiedBy === 'mathjs' && result.mathJsResult) {
      const mjResult = result.mathJsResult;
      
      // Copyable expression with link to MathJS
      if (mjResult.mathJsExpression) {
        const encodedExpr = encodeURIComponent(mjResult.mathJsExpression);
        comment += `\n\n**🔗 Try it yourself:**\n`;
        comment += `[\`${mjResult.mathJsExpression}\`](https://mathjs.org/examples/expressions.js.html?expr=${encodedExpr})\n`;
        comment += `*Click to open in MathJS calculator*`;
      }
      
      // Actual result
      if (mjResult.computedValue && result.status === 'verified_false') {
        comment += `\n\n**✅ Correct result:** \`${mjResult.computedValue}\``;
      }
      
      // Step-by-step work in collapsible section
      if (mjResult.steps && mjResult.steps.length > 1) {
        comment += `\n\n<details>\n<summary>📊 Step-by-step verification</summary>\n\n`;
        mjResult.steps.forEach((step: { expression: string; result: string }, i: number) => {
          comment += `${i + 1}. \`${step.expression}\` = \`${step.result}\`\n`;
        });
        comment += `\n</details>`;
      }
      
      // Debug info in collapsible section
      comment += `\n\n<details>\n<summary>🔍 Debug information</summary>\n\n`;
      comment += `\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n\n</details>`;
    } else {
      // For LLM-only errors, still show debug info
      comment += `\n\n<details>\n<summary>🔍 Debug information</summary>\n\n`;
      comment += `\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n\n</details>`;
    }

    return comment;
  }
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

  getChunkId(): string {
    return this.chunk.id;
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
    const location = await this.findLocationInDocument();
    if (!location) return null;

    const message = generateMathComment(this.expression);
    
    // Don't create comment if message is empty
    if (!message) {
      return null;
    }

    // Build tool chain for ExtractedMathExpression (basic expression analysis)
    const toolChain: ToolChainResult[] = [
      {
        toolName: 'extractMath',
        stage: 'extraction',
        timestamp: new Date().toISOString(),
        result: this.expression
      }
    ];
    
    return CommentBuilder.build({
      plugin: 'math',
      location: {
        startOffset: location.startOffset,
        endOffset: location.endOffset,
        quotedText: location.quotedText
      },
      chunkId: this.chunk.id,
      processingStartTime: Date.now(),
      toolChain,
      
      // Custom overrides
      header: this.expression.conciseCorrection || 
              (this.expression.hasError ? `Math Error: ${this.expression.originalText}` : `Math: ${this.expression.originalText}`),
      level: this.expression.hasError ? 'error' as const : 
             (this.expression.verificationStatus === 'verified' ? 'success' as const : 'info' as const),
      description: message,
      importance: this.commentImportanceScore()
    });
  }
}

export class MathAnalyzerJob implements SimpleAnalysisPlugin {
  private documentText: string;
  private chunks: TextChunk[];
  private hasRun = false;
  private comments: Comment[] = [];
  private summary: string = "";
  private analysis: string = "";
  private totalCost: number = 0;
  private extractedExpressions: ExtractedMathExpression[] = [];
  private hybridErrorWrappers: HybridMathErrorWrapper[] = [];
  private processingStartTime: number = 0;

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
    this.processingStartTime = Date.now();
    this.documentText = documentText;
    this.chunks = chunks;
    
    if (this.hasRun) {
      return this.getResults();
    }

    try {
      logger.info("MathAnalyzer: Starting analysis");
      logger.info(`MathAnalyzer: Processing ${chunks.length} chunks`);

      await this.extractMathExpressions();
      await this.runHybridMathCheck();
      
      logger.info(`MathAnalyzer: Extracted ${this.extractedExpressions.length} math expressions and found ${this.hybridErrorWrappers.length} hybrid errors`);
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

  private async runHybridMathCheck(): Promise<void> {
    logger.debug("MathAnalyzer: Running hybrid math check on extracted expressions");

    // Check each extracted expression individually
    for (const extractedExpr of this.extractedExpressions) {
      try {
        const result = await checkMathHybridTool.execute(
          {
            statement: extractedExpr.expression.originalText,
            context: undefined // ExtractedMathExpression doesn't have context
          },
          {
            logger: logger,
          }
        );

        // Create wrapper for ALL verification results (not just errors)
        // This allows us to show successful verifications too
        if (result.status === 'verified_false' || result.status === 'verified_true') {
          const errorWrapper = new HybridMathErrorWrapper(
            result, 
            extractedExpr.expression, 
            this.documentText,
            extractedExpr.getChunkId(),
            this.processingStartTime
          );
          this.hybridErrorWrappers.push(errorWrapper);
        }
      } catch (error) {
        logger.error("MathAnalyzer: Failed to check expression:", { 
          expression: extractedExpr.expression.originalText, 
          error 
        });
        // Continue checking other expressions
      }
    }
    
    logger.debug(
      `MathAnalyzer: Hybrid check found ${this.hybridErrorWrappers.length} verification results`
    );
  }

  private async createComments(): Promise<void> {
    // Create a set of expressions that have hybrid errors to avoid duplicates
    const expressionsWithHybridErrors = new Set(
      this.hybridErrorWrappers.map(wrapper => wrapper.expression.originalText)
    );
    
    // Only create expression comments for expressions that DON'T have hybrid errors
    // This prevents duplicate comments for the same math error
    const expressionsWithoutHybridErrors = this.extractedExpressions.filter(
      expr => !expressionsWithHybridErrors.has(expr.expression.originalText)
    );
    
    // Process both types of comments in parallel
    const [expressionComments, hybridComments] = await Promise.all([
      Promise.all(
        expressionsWithoutHybridErrors.map(extractedExpression => extractedExpression.getComment())
      ),
      Promise.all(
        this.hybridErrorWrappers.map(errorWrapper => errorWrapper.getComment())
      )
    ]);
    
    // Filter out null comments and combine both types
    const validExpressionComments = expressionComments.filter((comment): comment is Comment => comment !== null);
    const validHybridComments = hybridComments.filter((comment): comment is Comment => comment !== null);
    
    this.comments = [...validExpressionComments, ...validHybridComments];

    logger.debug(`MathAnalyzer: Created ${this.comments.length} comments (${validExpressionComments.length} non-error expressions, ${validHybridComments.length} hybrid errors)`);
  }

  private generateAnalysis(): void {
    const totalExpressions = this.extractedExpressions.length;
    const totalHybridErrors = this.hybridErrorWrappers.length;
    const mathJsVerified = this.hybridErrorWrappers.filter(w => w.verificationResult.verifiedBy === 'mathjs').length;
    const llmVerified = this.hybridErrorWrappers.filter(w => w.verificationResult.verifiedBy === 'llm').length;

    if (totalExpressions === 0 && totalHybridErrors === 0) {
      this.summary = "No mathematical content found.";
      this.analysis = "No mathematical calculations, formulas, or errors were identified in this document.";
      return;
    }

    // Use the document summary generator for extracted expressions
    let analysis = "";
    if (totalExpressions > 0) {
      analysis = generateDocumentSummary(this.extractedExpressions);
    }

    // Add hybrid analysis
    if (totalHybridErrors > 0) {
      const verifiedTrue = this.hybridErrorWrappers.filter(w => w.verificationResult.status === 'verified_true').length;
      const verifiedFalse = this.hybridErrorWrappers.filter(w => w.verificationResult.status === 'verified_false').length;
      
      if (analysis) analysis += "\n\n";
      analysis += `**Hybrid Math Verification Results:**\n\n`;
      analysis += `Verified ${totalHybridErrors} mathematical expression${totalHybridErrors !== 1 ? 's' : ''}:\n`;
      
      if (verifiedTrue > 0) {
        analysis += `- ${verifiedTrue} verified as correct ✓\n`;
      }
      if (verifiedFalse > 0) {
        analysis += `- ${verifiedFalse} error${verifiedFalse !== 1 ? 's' : ''} found\n`;
      }
      
      // Break down by verification method
      if (mathJsVerified > 0) {
        analysis += `- ${mathJsVerified} verified computationally (using MathJS)\n`;
      }
      if (llmVerified > 0) {
        analysis += `- ${llmVerified} verified conceptually (using LLM analysis)\n`;
      }
      
      // Add severity breakdown for errors only
      if (verifiedFalse > 0) {
        const critical = this.hybridErrorWrappers.filter(w => w.verificationResult.status === 'verified_false' && w.verificationResult.llmResult?.severity === 'critical').length;
        const major = this.hybridErrorWrappers.filter(w => w.verificationResult.status === 'verified_false' && w.verificationResult.llmResult?.severity === 'major').length;
        const minor = this.hybridErrorWrappers.filter(w => w.verificationResult.status === 'verified_false' && w.verificationResult.llmResult?.severity === 'minor').length;
        
        if (critical > 0 || major > 0 || minor > 0) {
          analysis += `\nError severity: `;
          const severities = [];
          if (critical > 0) severities.push(`${critical} critical`);
          if (major > 0) severities.push(`${major} major`);
          if (minor > 0) severities.push(`${minor} minor`);
          analysis += severities.join(', ');
        }
      }
    }

    this.analysis = analysis;

    // Generate enhanced summary
    const expressionsWithErrors = this.extractedExpressions.filter(
      (ee) => ee.expression.hasError
    ).length;
    const complexExpressions = this.extractedExpressions.filter(
      (ee) => ee.expression.complexityScore > 70
    ).length;

    let summary = "";
    if (totalExpressions > 0) {
      summary = `Found ${totalExpressions} mathematical expression${totalExpressions !== 1 ? "s" : ""}`;
      if (expressionsWithErrors > 0) {
        summary += ` (${expressionsWithErrors} with errors)`;
      }
      if (complexExpressions > 0) {
        summary += `. ${complexExpressions} complex calculations analyzed.`;
      }
    }

    if (totalHybridErrors > 0) {
      const verifiedTrue = this.hybridErrorWrappers.filter(w => w.verificationResult.status === 'verified_true').length;
      const verifiedFalse = this.hybridErrorWrappers.filter(w => w.verificationResult.status === 'verified_false').length;
      
      if (summary) summary += " ";
      summary += `Hybrid verification: ${totalHybridErrors} checked`;
      if (verifiedTrue > 0 && verifiedFalse > 0) {
        summary += ` (${verifiedTrue} correct, ${verifiedFalse} error${verifiedFalse !== 1 ? 's' : ''})`;
      } else if (verifiedTrue > 0) {
        summary += ` (all correct)`;
      } else if (verifiedFalse > 0) {
        summary += ` (${verifiedFalse} error${verifiedFalse !== 1 ? 's' : ''} found)`;
      }
      summary += ".";
    }

    this.summary = summary || "Mathematical analysis complete.";
  }

  getCost(): number {
    return this.totalCost;
  }


  getDebugInfo(): Record<string, unknown> {
    return {
      hasRun: this.hasRun,
      expressionsCount: this.extractedExpressions.length,
      commentsCount: this.comments.length,
      totalCost: this.totalCost,
      llmInteractionsCount: 0,
    };
  }
}

// Export MathAnalyzerJob as MathPlugin for compatibility
export { MathAnalyzerJob as MathPlugin };