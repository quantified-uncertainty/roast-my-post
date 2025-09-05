import { logger } from "../../../shared/logger";
import type {
  Comment,
  ToolChainResult,
} from "../../../shared/types";
import { checkMathHybridTool } from "../../../tools/check-math-hybrid";
import type {
  CheckMathHybridOutput,
} from "../../../tools/check-math-hybrid/types";
import type {
  ExtractedMathExpression as ExtractedMathExpressionToolType,
} from "../../../tools/extract-math-expressions";
import {
  extractMathExpressionsTool,
} from "../../../tools/extract-math-expressions";
import { TextChunk } from "../../TextChunk";
import {
  AnalysisResult,
  RoutingExample,
  SimpleAnalysisPlugin,
} from "../../types";
import { CommentBuilder } from "../../utils/CommentBuilder";
import {
  generateDocumentSummary,
  generateMathComment,
} from "./commentGeneration";

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
    if (this.verificationResult.status === "verified_false") {
      const severity = this.verificationResult.llmResult?.severity || "minor";
      const severityScore =
        severity === "critical" ? 10 : severity === "major" ? 7 : 4;
      return severityScore;
    }
    return 0;
  }

  getChunkId(): string {
    return this.chunkId;
  }

  private commentImportanceScore(): number {
    if (this.verificationResult.status === "verified_false") {
      const baseScore = this.verificationResult.verifiedBy === "mathjs" ? 9 : 6; // MathJS verified errors are more important
      const severity = this.verificationResult.llmResult?.severity || "minor";
      const severityBonus =
        severity === "critical" ? 2 : severity === "major" ? 1 : 0;
      return Math.min(10, baseScore + severityBonus);
    } else if (this.verificationResult.status === "verified_true") {
      // Lower importance for successful verifications
      return 3;
    }
    return 0;
  }

  public async getComment(): Promise<Comment | null> {
    // Generate comments for all verification results
    // (We can filter later if we only want errors)

    // Use the expression text to find location
    const startOffset = this.findTextOffsetInDocument(
      this.expression.originalText
    );
    if (startOffset === -1) {
      logger.warn(
        `Math expression text not found: "${this.expression.originalText}"`
      );
      return null;
    }

    const endOffset = startOffset + this.expression.originalText.length;

    // Build tool chain results
    const toolChain: ToolChainResult[] = [
      {
        toolName: "extractMath",
        stage: "extraction",
        timestamp: new Date(this.processingStartTime + 20).toISOString(),
        result: this.expression as unknown as Record<string, unknown>,
      },
      {
        toolName: "check-math-hybrid",
        stage: "verification",
        timestamp: new Date().toISOString(),
        result: this.verificationResult as unknown as Record<string, unknown>,
      },
    ];

    // Keep formatted description for backwards compatibility
    const formattedDescription = this.generateEnhancedComment();

    return CommentBuilder.build({
      plugin: "math",
      location: {
        startOffset,
        endOffset,
        quotedText: this.expression.originalText,
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
      significance: this.buildSignificance(),
    });
  }

  private buildHeader(): string {
    if (this.verificationResult.status === "verified_true") {
      return `✓ Verified correct`;
    } else if (
      this.verificationResult.status === "verified_false" &&
      this.verificationResult.displayCorrection
    ) {
      return this.verificationResult.displayCorrection;
    } else if (this.verificationResult.status === "verified_false") {
      return `Math error: ${this.expression.originalText}`;
    } else {
      return `Cannot verify: ${this.expression.originalText}`;
    }
  }

  private getLevel(): "error" | "warning" | "info" | "success" {
    if (this.verificationResult.status === "verified_true") {
      return "success";
    } else if (this.verificationResult.status === "verified_false") {
      return "error";
    } else {
      return "info";
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
    if (severity === "critical") {
      return "Critical error that fundamentally undermines the argument or conclusion";
    } else if (severity === "major") {
      return "Significant error that affects the validity of related claims";
    } else if (severity === "minor") {
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

    // Use structured format similar to fact-check plugin
    let comment = `**Expression Found:**\n> "${expression.originalText}"\n\n`;

    if (result.status === "verified_true") {
      // For successful verifications
      comment += `**Verification Result:** Correct\n\n`;
      comment +=
        result.explanation || "Mathematical expression verified as correct";
    } else if (result.status === "verified_false") {
      // For errors
      comment += `**Verification Result:** Incorrect\n\n`;

      let explanation =
        result.explanation || "Mathematical expression contains an error";
      // Remove any "Quick Fix:" line if it exists at the start
      if (explanation.startsWith("Quick Fix:")) {
        const lines = explanation.split("\n");
        explanation = lines.slice(1).join("\n").trim();
      }
      comment += explanation;
    } else {
      // For unverifiable expressions
      comment += `**Verification Result:** Unable to verify\n\n`;
      comment += `**Skip Reason:** Expression too complex for automated verification\n\n`;
      comment +=
        result.explanation ||
        "This mathematical expression could not be verified automatically. This might be due to:\n- Complex mathematical concepts requiring domain expertise\n- Non-standard notation or formatting\n- Insufficient context for verification\n\n**Recommendation:** This expression would benefit from manual review by a subject matter expert.";
    }

    // MathJS-specific enhancements
    if (result.verifiedBy === "mathjs" && result.mathJsResult) {
      const mjResult = result.mathJsResult;

      // Actual result for incorrect expressions
      if (mjResult.computedValue && result.status === "verified_false") {
        comment += `\n\n**Correct Result:** \`${mjResult.computedValue}\``;
      }

      // Copyable expression with link to MathJS
      if (mjResult.mathJsExpression) {
        const encodedExpr = encodeURIComponent(mjResult.mathJsExpression);
        comment += `\n\n**Try it yourself:**\n`;
        comment += `[\`${mjResult.mathJsExpression}\`](https://mathjs.org/examples/expressions.js.html?expr=${encodedExpr})\n`;
        comment += `*Click to open in MathJS calculator*`;
      }

      // Step-by-step work in collapsible section
      if (mjResult.steps && mjResult.steps.length > 1) {
        comment += `\n\n<details>\n<summary>Step-by-step verification</summary>\n\n`;
        mjResult.steps.forEach(
          (step: { expression: string; result: string }, i: number) => {
            comment += `${i + 1}. \`${step.expression}\` = \`${step.result}\`\n`;
          }
        );
        comment += `\n</details>`;
      }

      // Debug info in collapsible section
      comment += `\n\n<details>\n<summary>Debug information</summary>\n\n`;
      comment += `\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n\n</details>`;
    } else {
      // For LLM-only errors, still show debug info
      comment += `\n\n<details>\n<summary>Debug information</summary>\n\n`;
      comment += `\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n\n</details>`;
    }

    return comment;
  }
}

export class ExtractedMathExpression {
  public expression: ExtractedMathExpressionToolType;
  private chunk: TextChunk;
  private documentText: string;

  constructor(
    expression: ExtractedMathExpressionToolType,
    chunk: TextChunk,
    documentText: string
  ) {
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
        normalizeQuotes: true, // Math might have quote variations
        useLLMFallback: true, // Enable LLM fallback for complex expressions
        pluginName: "math",
        documentText: this.documentText, // Pass for position verification
      }
    );

    if (!location) {
      logger.warn(
        `Math expression not found in chunk: "${this.expression.originalText}"`,
        {
          chunkId: this.chunk.id,
          chunkTextPreview: this.chunk.text.slice(0, 200) + "...",
          searchedFor: this.expression.originalText,
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
        toolName: "extractMath",
        stage: "extraction",
        timestamp: new Date().toISOString(),
        result: this.expression as unknown as Record<string, unknown>,
      },
    ];

    return CommentBuilder.build({
      plugin: "math",
      location: {
        startOffset: location.startOffset,
        endOffset: location.endOffset,
        quotedText: location.quotedText,
      },
      chunkId: this.chunk.id,
      processingStartTime: Date.now(),
      toolChain,

      // Custom overrides
      header:
        this.expression.displayCorrection ||
        (this.expression.hasError
          ? `Math Error: ${this.expression.originalText}`
          : `Math: ${this.expression.originalText}`),
      level: this.expression.hasError
        ? ("error" as const)
        : this.expression.verificationStatus === "verified"
          ? ("success" as const)
          : ("info" as const),
      description: message,
      importance: this.commentImportanceScore(),
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

  async analyze(
    chunks: TextChunk[],
    documentText: string
  ): Promise<AnalysisResult> {
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

      logger.info(
        `MathAnalyzer: Extracted ${this.extractedExpressions.length} math expressions and found ${this.hybridErrorWrappers.length} hybrid errors`
      );
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
      this.analysis =
        "The mathematical analysis could not be completed due to a technical error.";
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
          logger.error(`Failed to extract math from chunk ${chunk.id}:`, error);
          throw error;
        }
      })
    );

    // Process successful results
    for (const chunkResult of chunkResults) {
      if (chunkResult.status === "fulfilled") {
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
    logger.debug(
      "MathAnalyzer: Running hybrid math check on extracted expressions"
    );

    // Check all extracted expressions in parallel
    const checkPromises = this.extractedExpressions.map(
      async (extractedExpr) => {
        try {
          const result = await checkMathHybridTool.execute(
            {
              statement: extractedExpr.expression.originalText,
              context: undefined, // ExtractedMathExpression doesn't have context
            },
            {
              logger: logger,
            }
          );

          // Create wrapper for ALL verification results (not just errors)
          // This allows us to show successful verifications too
          if (
            result.status === "verified_false" ||
            result.status === "verified_true"
          ) {
            return new HybridMathErrorWrapper(
              result,
              extractedExpr.expression,
              this.documentText,
              extractedExpr.getChunkId(),
              this.processingStartTime
            );
          }
          return null;
        } catch (error) {
          logger.error("MathAnalyzer: Failed to check expression:", {
            expression: extractedExpr.expression.originalText,
            error,
          });
          // Return null for failed checks
          return null;
        }
      }
    );

    // Wait for all checks to complete
    const results = await Promise.allSettled(checkPromises);

    // Collect successful results
    for (const result of results) {
      if (result.status === "fulfilled" && result.value !== null) {
        this.hybridErrorWrappers.push(result.value);
      }
    }

    logger.debug(
      `MathAnalyzer: Hybrid check found ${this.hybridErrorWrappers.length} verification results`
    );
  }

  private async createComments(): Promise<void> {
    // Create a set of expressions that have hybrid errors to avoid duplicates
    const expressionsWithHybridErrors = new Set(
      this.hybridErrorWrappers.map((wrapper) => wrapper.expression.originalText)
    );

    // Only create expression comments for expressions that DON'T have hybrid errors
    // This prevents duplicate comments for the same math error
    const expressionsWithoutHybridErrors = this.extractedExpressions.filter(
      (expr) => !expressionsWithHybridErrors.has(expr.expression.originalText)
    );

    // Process both types of comments in parallel
    const [expressionComments, hybridComments, debugComments] =
      await Promise.all([
        Promise.all(
          expressionsWithoutHybridErrors.map((extractedExpression) =>
            extractedExpression.getComment()
          )
        ),
        Promise.all(
          this.hybridErrorWrappers.map((errorWrapper) =>
            errorWrapper.getComment()
          )
        ),
        this.generateDebugComments(),
      ]);

    // Filter out null comments and combine all types
    const validExpressionComments = expressionComments.filter(
      (comment): comment is Comment => comment !== null
    );
    const validHybridComments = hybridComments.filter(
      (comment): comment is Comment => comment !== null
    );
    const validDebugComments = debugComments.filter(
      (comment): comment is Comment => comment !== null
    );

    this.comments = [
      ...validExpressionComments,
      ...validHybridComments,
      ...validDebugComments,
    ];

    logger.debug(
      `MathAnalyzer: Created ${this.comments.length} comments (${validExpressionComments.length} expressions, ${validHybridComments.length} hybrid, ${validDebugComments.length} debug)`
    );
  }

  private async generateDebugComments(): Promise<(Comment | null)[]> {
    const debugComments: (Comment | null)[] = [];

    // Track processed expressions to avoid duplicates
    const processedExpressions = new Set([
      ...this.extractedExpressions.map((e) => e.expression.originalText),
      ...this.hybridErrorWrappers.map((w) => w.expression.originalText),
    ]);

    // Debug comments for expressions that couldn't be located
    for (const extractedExpression of this.extractedExpressions) {
      const location = await extractedExpression.findLocationInDocument();
      if (!location) {
        // This expression couldn't be located - create a debug comment
        const debugComment =
          await this.createLocationDebugComment(extractedExpression);
        if (debugComment) {
          debugComments.push(debugComment);
        }
      }
    }

    // Debug comments for hybrid errors that couldn't be verified
    for (const hybridWrapper of this.hybridErrorWrappers) {
      if (hybridWrapper.verificationResult.status === "cannot_verify") {
        const debugComment =
          await this.createUnverifiableDebugComment(hybridWrapper);
        if (debugComment) {
          debugComments.push(debugComment);
        }
      }
    }

    // Debug comments for low-importance expressions that were skipped
    // Only for expressions that don't already have hybrid verification
    const expressionsWithHybrid = new Set(
      this.hybridErrorWrappers.map((w) => w.expression.originalText)
    );

    for (const extractedExpression of this.extractedExpressions) {
      // Skip if already has hybrid verification
      if (
        expressionsWithHybrid.has(extractedExpression.expression.originalText)
      ) {
        continue;
      }

      // Skip if expression has low importance scores and no error
      if (
        !extractedExpression.expression.hasError &&
        extractedExpression.expression.complexityScore < 30 &&
        extractedExpression.expression.contextImportanceScore < 40 &&
        extractedExpression.expression.errorSeverityScore < 20
      ) {
        const debugComment =
          await this.createSkippedExpressionDebugComment(extractedExpression);
        if (debugComment) {
          debugComments.push(debugComment);
        }
      }
    }

    return debugComments;
  }

  private async createLocationDebugComment(
    extractedExpression: ExtractedMathExpression
  ): Promise<Comment | null> {
    // Create a debug comment explaining why this expression couldn't be located
    const toolChain: ToolChainResult[] = [
      {
        toolName: "extractMath",
        stage: "extraction",
        timestamp: new Date().toISOString(),
        result: extractedExpression.expression as unknown as Record<string, unknown>,
      },
      {
        toolName: "findLocation",
        stage: "enhancement",
        timestamp: new Date().toISOString(),
        result: { status: "failed", reason: "text_not_found" },
      },
    ];

    // Use a default position (start of chunk)
    const startOffset = 0; // This is not ideal but needed for debug purposes
    const endOffset = extractedExpression.expression.originalText.length;

    return CommentBuilder.build({
      plugin: "math",
      location: {
        startOffset,
        endOffset,
        quotedText: extractedExpression.expression.originalText,
      },
      chunkId: extractedExpression.getChunkId(),
      processingStartTime: this.processingStartTime,
      toolChain,

      header: `Math Expression Detected, Location Unknown`,
      level: "debug" as const,
      description: `**Expression Found:**
> "${extractedExpression.expression.originalText}"

**Skip Reason:** Unable to locate expression precisely in document

This mathematical expression was extracted but couldn't be positioned accurately. This might be due to:
- Text formatting differences during processing
- Expression being part of a larger formula
- Mathematical notation rendering issues

The analysis may still be valid, but the highlighting won't be precise.`,
    });
  }

  private async createUnverifiableDebugComment(
    hybridWrapper: HybridMathErrorWrapper
  ): Promise<Comment | null> {
    // Use the expression text to find location
    const startOffset = this.documentText.indexOf(
      hybridWrapper.expression.originalText
    );
    if (startOffset === -1) {
      // Can't locate the text, use default position
      return null;
    }
    const endOffset =
      startOffset + hybridWrapper.expression.originalText.length;

    const toolChain: ToolChainResult[] = [
      {
        toolName: "extractMath",
        stage: "extraction",
        timestamp: new Date(this.processingStartTime + 20).toISOString(),
        result: hybridWrapper.expression as unknown as Record<string, unknown>,
      },
      {
        toolName: "check-math-hybrid",
        stage: "verification",
        timestamp: new Date().toISOString(),
        result: hybridWrapper.verificationResult as unknown as Record<string, unknown>,
      },
    ];

    return CommentBuilder.build({
      plugin: "math",
      location: {
        startOffset,
        endOffset,
        quotedText: hybridWrapper.expression.originalText,
      },
      chunkId: hybridWrapper.getChunkId(),
      processingStartTime: this.processingStartTime,
      toolChain,

      header: `Math Expression Detected, Unverifiable`,
      level: "debug" as const,
      description: `**Expression Found:**
> "${hybridWrapper.expression.originalText}"

**Skip Reason:** Mathematical verification not possible

This expression was detected but couldn't be verified automatically. This could be due to:
- Conceptual complexity requiring domain expertise
- Insufficient mathematical context
- Limitations in automated verification tools
- Abstract or theoretical mathematics beyond computational verification

**Recommendation:** Manual review may be needed for complex mathematical content.`,
    });
  }

  private async createSkippedExpressionDebugComment(
    extractedExpression: ExtractedMathExpression
  ): Promise<Comment | null> {
    const location = await extractedExpression.findLocationInDocument();
    if (!location) return null; // Already handled by location debug comment

    const toolChain: ToolChainResult[] = [
      {
        toolName: "extractMath",
        stage: "extraction",
        timestamp: new Date().toISOString(),
        result: extractedExpression.expression as unknown as Record<string, unknown>,
      },
      {
        toolName: "skipDecision",
        stage: "enhancement",
        timestamp: new Date().toISOString(),
        result: {
          reason: "low_importance",
          complexityScore: extractedExpression.expression.complexityScore,
          contextImportanceScore:
            extractedExpression.expression.contextImportanceScore,
          errorSeverityScore: extractedExpression.expression.errorSeverityScore,
        },
      },
    ];

    return CommentBuilder.build({
      plugin: "math",
      location: {
        startOffset: location.startOffset,
        endOffset: location.endOffset,
        quotedText: location.quotedText,
      },
      chunkId: extractedExpression.getChunkId(),
      processingStartTime: this.processingStartTime,
      toolChain,

      header: `Math Expression Detected, Skipped`,
      level: "debug" as const,
      description: `**Expression Found:**
> "${extractedExpression.expression.originalText}"

**Skip Reason:** Low priority for mathematical verification

**Scoring Breakdown:**
- Complexity: ${extractedExpression.expression.complexityScore}/100 (threshold: ≥50)
- Context Importance: ${extractedExpression.expression.contextImportanceScore}/100 (threshold: ≥40)  
- Error Likelihood: ${extractedExpression.expression.errorSeverityScore}/100 (threshold: ≥30)

This expression was skipped because it's ${extractedExpression.expression.complexityScore < 50 ? "relatively simple" : "complex enough"}, has ${extractedExpression.expression.contextImportanceScore < 40 ? "low importance" : "reasonable importance"} to the document, and ${extractedExpression.expression.errorSeverityScore < 30 ? "low error risk" : "significant error risk"}.`,
    });
  }

  private generateAnalysis(): void {
    const totalExpressions = this.extractedExpressions.length;
    const totalHybridErrors = this.hybridErrorWrappers.length;

    if (totalExpressions === 0 && totalHybridErrors === 0) {
      this.summary = "No mathematical content found.";
      this.analysis =
        "No mathematical calculations, formulas, or errors were identified in this document.";
      return;
    }

    // Get error counts and severity breakdown from both systems
    const verifiedFalse = this.hybridErrorWrappers.filter(
      (w) => w.verificationResult.status === "verified_false"
    ).length;
    const critical = this.hybridErrorWrappers.filter(
      (w) =>
        w.verificationResult.status === "verified_false" &&
        w.verificationResult.llmResult?.severity === "critical"
    ).length;
    const major = this.hybridErrorWrappers.filter(
      (w) =>
        w.verificationResult.status === "verified_false" &&
        w.verificationResult.llmResult?.severity === "major"
    ).length;
    const minor = this.hybridErrorWrappers.filter(
      (w) =>
        w.verificationResult.status === "verified_false" &&
        w.verificationResult.llmResult?.severity === "minor"
    ).length;

    // Also check old expression system for severe errors (errorSeverityScore >= 80)
    const severeErrors = this.extractedExpressions.filter(
      (e) => e.expression.hasError && e.expression.errorSeverityScore >= 80
    ).length;
    const totalExpressionErrors = this.extractedExpressions.filter(
      (e) => e.expression.hasError
    ).length;

    // Build user-focused summary (Improvement #1: User-Focused Language)
    let summary = "";
    if (critical > 0 || severeErrors > 0) {
      const totalCritical = Math.max(critical, severeErrors);
      summary = `Critical mathematical error${totalCritical !== 1 ? "s" : ""} found affecting key claims`;
    } else if (major > 0) {
      summary = `Significant mathematical error${major !== 1 ? "s" : ""} found`;
    } else if (minor > 0 || totalExpressionErrors > 0) {
      const totalMinor = Math.max(minor, totalExpressionErrors);
      summary = `Minor mathematical error${totalMinor !== 1 ? "s" : ""} identified for correction`;
    } else if (totalHybridErrors > 0) {
      summary = "Mathematical calculations verified as accurate";
    } else {
      summary = `Mathematical content reviewed (${totalExpressions} expression${totalExpressions !== 1 ? "s" : ""})`;
    }

    // Build impact-oriented analysis (Improvements #2 & #3: Impact-Oriented + Template Structure)
    let analysis = "";

    // Key Findings (prioritize by severity - Improvement #5)
    if (verifiedFalse > 0 || totalExpressionErrors > 0) {
      analysis += "**Key Findings:**\n";
      if (critical > 0 || severeErrors > 0) {
        const totalCritical = Math.max(critical, severeErrors);
        analysis += `- ${totalCritical} critical error${totalCritical !== 1 ? "s" : ""} that could undermine main conclusions\n`;
      }
      if (major > 0) {
        analysis += `- ${major} significant error${major !== 1 ? "s" : ""} affecting supporting calculations\n`;
      }
      if (minor > 0 || (totalExpressionErrors > 0 && severeErrors === 0)) {
        const totalMinor =
          totalExpressionErrors > severeErrors
            ? totalExpressionErrors - severeErrors
            : minor;
        if (totalMinor > 0) {
          analysis += `- ${totalMinor} minor error${totalMinor !== 1 ? "s" : ""} requiring correction for accuracy\n`;
        }
      }
      analysis += "\n";
    }

    // Document Impact
    if (verifiedFalse > 0 || totalExpressionErrors > 0) {
      analysis += "**Document Impact:**\n";
      if (critical > 0 || severeErrors > 0) {
        analysis +=
          "Critical mathematical errors may significantly impact document credibility and conclusions. Immediate review recommended.\n";
      } else if (major > 0) {
        analysis +=
          "Mathematical errors present but may not affect core arguments. Review recommended for accuracy.\n";
      } else {
        analysis +=
          "Minor mathematical errors detected. Overall document integrity maintained but corrections would improve precision.\n";
      }
      analysis += "\n";
    }

    // Technical Details (collapsible in UI)
    if (totalHybridErrors > 0 || totalExpressions > 0) {
      analysis += "<details>\n<summary>Technical Details</summary>\n\n";

      // Quick summary with visual indicators
      analysis += "**📊 Quick Summary:**\n";
      const indicators = [];
      if (critical > 0 || severeErrors > 0) {
        indicators.push(`🔴 ${Math.max(critical, severeErrors)} critical`);
      }
      if (major > 0) {
        indicators.push(`🟡 ${major} major`);
      }
      if (minor > 0 || totalExpressionErrors > severeErrors) {
        const minorCount =
          totalExpressionErrors > severeErrors
            ? totalExpressionErrors - severeErrors
            : minor;
        if (minorCount > 0) {
          indicators.push(`🔵 ${minorCount} minor`);
        }
      }
      const verifiedTrue = this.hybridErrorWrappers.filter(
        (w) => w.verificationResult.status === "verified_true"
      ).length;
      if (verifiedTrue > 0) {
        indicators.push(`✅ ${verifiedTrue} verified correct`);
      }

      if (indicators.length > 0) {
        analysis += indicators.join(" • ") + "\n\n";
      } else {
        analysis += `📝 ${totalExpressions} expression${totalExpressions !== 1 ? "s" : ""} reviewed\n\n`;
      }

      if (totalHybridErrors > 0) {
        const mathJsVerified = this.hybridErrorWrappers.filter(
          (w) => w.verificationResult.verifiedBy === "mathjs"
        ).length;
        const llmVerified = this.hybridErrorWrappers.filter(
          (w) => w.verificationResult.verifiedBy === "llm"
        ).length;

        analysis += `**🔍 Verification Summary:**\n`;
        analysis += `- ${totalHybridErrors} mathematical expression${totalHybridErrors !== 1 ? "s" : ""} verified\n`;
        if (verifiedTrue > 0) {
          analysis += `- ✅ ${verifiedTrue} verified as correct\n`;
        }
        if (verifiedFalse > 0) {
          analysis += `- ❌ ${verifiedFalse} error${verifiedFalse !== 1 ? "s" : ""} found\n`;
        }
        analysis += `\n**⚙️ Verification Methods:**\n`;
        if (mathJsVerified > 0) {
          analysis += `- 🧮 ${mathJsVerified} computationally verified (MathJS)\n`;
        }
        if (llmVerified > 0) {
          analysis += `- 🤖 ${llmVerified} conceptually verified (LLM analysis)\n`;
        }
      }

      // Add original document summary for expressions if available
      if (totalExpressions > 0) {
        const documentSummary = generateDocumentSummary(
          this.extractedExpressions
        );
        if (documentSummary) {
          analysis += `\n**Expression Analysis:**\n${documentSummary}`;
        }
      }

      analysis += "\n</details>";
    }

    this.analysis = analysis;
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
