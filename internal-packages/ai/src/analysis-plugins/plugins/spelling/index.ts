import { logger } from "../../../shared/logger";
import type {
  Comment,
  LanguageConventionOption,
  ToolChainResult,
} from "../../../shared/types";
import type {
  SpellingGrammarError,
} from "../../../tools/check-spelling-grammar";
import {
  checkSpellingGrammarTool,
} from "../../../tools/check-spelling-grammar";
import {
  generateDocumentSummary,
  type SpellingErrorWithLocation as ToolSpellingErrorWithLocation,
} from "../../../tools/check-spelling-grammar/commentGeneration";
import {
  calculateGrade,
  countWords,
} from "../../../tools/check-spelling-grammar/grading";
import {
  detectLanguageConvention,
  getConventionExamples,
} from "../../../tools/detect-language-convention/conventionDetector";
import { TextChunk } from "../../TextChunk";
import {
  AnalysisResult,
  SimpleAnalysisPlugin,
} from "../../types";
import { CommentBuilder } from "../../utils/CommentBuilder";
import {
  MAX_ERRORS_PER_CHUNK,
  MIN_CONFIDENCE_THRESHOLD,
  HIGH_IMPORTANCE_THRESHOLD,
  LOG_TEXT_TRUNCATE_LENGTH,
  CONVENTION_SAMPLE_SIZE,
  LOW_CONFIDENCE_THRESHOLD,
  LOW_CONSISTENCY_THRESHOLD
} from "./constants";

// Helper function to escape XML special characters
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

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
  // Property to bypass routing - spelling check should always run on all chunks
  readonly runOnAllChunks = true;

  private documentText: string;
  private chunks: TextChunk[];
  private hasRun = false;
  private comments: Comment[] = [];
  private summary: string = "";
  private analysis: string = "";
  private totalCost: number = 0;
  private errors: SpellingErrorWithLocation[] = [];
  private languageConvention?: ReturnType<typeof detectLanguageConvention>;
  private gradeResult?: ReturnType<typeof calculateGrade>;
  private strictness: "minimal" | "standard" | "thorough" = "standard";
  private processingStartTime: number = 0;
  private llmCallCount: number = 0;

  name(): string {
    return "SPELLING";
  }

  // Routing methods (not used since runOnAllChunks = true)
  promptForWhenToUse(): string {
    return "Spelling and grammar checking automatically runs on all documents";
  }

  routingExamples(): never[] {
    return []; // Not used for always-run plugins
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
      logger.info("SpellingAnalyzer: Starting analysis");

      // Detect conventions and document type
      this.detectConventions();

      // Process chunks and create comments in one pass
      await this.processChunksAndCreateComments();

      // Calculate grade
      const wordCount = countWords(this.documentText);
      this.gradeResult = calculateGrade(
        this.errors.map((e) => e.error),
        wordCount
      );

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
      this.analysis =
        "The spelling and grammar analysis could not be completed due to a technical error.";
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
    logger.debug(`SpellingAnalyzer: Processing ${this.chunks.length} chunks`);

    // Log detected convention once before processing
    if (this.languageConvention) {
      logger.info(
        `SpellingAnalyzer: Using detected ${this.languageConvention.convention} English convention for spell checking (consistency: ${Math.round(this.languageConvention.consistency * 100)}%)`
      );
    }

    // Process chunks sequentially to maintain order and process errors immediately
    for (const chunk of this.chunks) {
      try {
        logger.debug(`SpellingAnalyzer: Checking chunk ${chunk.id}`);

        // Use detected convention if available
        const convention = this.languageConvention
          ? this.languageConvention.convention
          : "auto";

        const result = await checkSpellingGrammarTool.execute(
          {
            text: chunk.text,
            maxErrors: MAX_ERRORS_PER_CHUNK,
            convention: convention as LanguageConventionOption,
            strictness: this.strictness,
          },
          {
            logger: logger,
          }
        );

        // Track that we made an LLM call
        this.llmCallCount++;

        logger.info(
          `SpellingAnalyzer: Chunk ${chunk.id} returned ${result.errors.length} errors`
        );

        // Process each error immediately
        for (const error of result.errors) {
          // Validate error has required fields
          if (
            !error ||
            !error.text ||
            typeof error.text !== "string" ||
            !error.text.trim()
          ) {
            logger.warn("SpellingAnalyzer: Skipping invalid error from LLM", {
              error,
            });
            continue;
          }

          // Skip very low confidence errors
          if (error.confidence && error.confidence < MIN_CONFIDENCE_THRESHOLD) {
            logger.debug(
              `SpellingAnalyzer: Skipping low-confidence error "${error.text.slice(0, LOG_TEXT_TRUNCATE_LENGTH)}..." (${error.confidence}% confidence)`
            );
            continue;
          }

          // Find location in this specific chunk immediately
          const location = await this.findLocationInChunk({ error, chunk });

          if (location) {
            // Create comment immediately
            const comment = this.createComment({ error, chunk, location });
            if (comment) {
              this.comments.push(comment);
              logger.debug(
                `SpellingAnalyzer: Created comment for error "${error.text.slice(0, LOG_TEXT_TRUNCATE_LENGTH)}..." in chunk ${chunk.id}`
              );
            }
          } else {
            logger.warn(
              `SpellingAnalyzer: Could not find location for error "${error.text.slice(0, LOG_TEXT_TRUNCATE_LENGTH)}..." in chunk ${chunk.id}`
            );
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

  private async findLocationInChunk(
    errorWithChunk: SpellingErrorWithLocation
  ): Promise<{
    startOffset: number;
    endOffset: number;
    quotedText: string;
  } | null> {
    const { error, chunk } = errorWithChunk;

    // Safety check for undefined error text
    if (!error.text || typeof error.text !== "string") {
      logger.warn(`SpellingAnalyzer: Invalid error text - skipping`, {
        errorText: error.text,
        correction: error.correction,
        type: error.type,
      });
      return null;
    }

    // Since we're now processing errors immediately after extraction from the same chunk,
    // we can trust that the error exists in this chunk. No need for extensive debugging.

    // Use the chunk's method to find text and convert to absolute position
    const location = await chunk.findTextAbsolute(error.text, {
      normalizeQuotes: true, // Handle apostrophe variations
      partialMatch: true, // For longer errors
      llmContext: error.context, // Use context if provided
      useLLMFallback: true, // Enable LLM fallback for difficult cases
      pluginName: "spelling",
    });

    if (!location) {
      logger.warn(`Could not find location for spelling error: ${error.text}`);
      return null;
    }

    return location;
  }

  private createComment(
    errorWithLocation: SpellingErrorWithLocation
  ): Comment | null {
    const { error, chunk, location } = errorWithLocation;

    if (!location) return null;

    // Build tool chain results
    const toolChain: ToolChainResult[] = [];

    // Add language convention detection if available
    if (this.languageConvention) {
      toolChain.push({
        toolName: "detectLanguageConvention",
        stage: "extraction",
        timestamp: new Date(this.processingStartTime + 10).toISOString(),
        result: this.languageConvention as unknown as Record<string, unknown>,
      });
    }

    // Add spelling/grammar check result
    toolChain.push({
      toolName: "checkSpellingGrammar",
      stage: "verification",
      timestamp: new Date().toISOString(),
      result: error as unknown as Record<string, unknown>,
    });

    // Debug logging to check error type
    logger.debug(`Creating comment for ${error.type} error: "${error.text}"`, {
      errorType: error.type,
      isGrammar: error.type === "grammar",
      isSpelling: error.type === "spelling", 
      level: error.type === "grammar" ? "warning" : "error"
    });

    return CommentBuilder.build({
      plugin: "spelling",
      location,
      chunkId: chunk.id,
      processingStartTime: this.processingStartTime,
      toolChain,

      // Use displayCorrection directly if available, otherwise generate XML format
      header: (() => {
        // Use displayCorrection directly if available
        if (error.displayCorrection) {
          return error.displayCorrection;
        }
        // Fallback to generating from text/correction
        return `<r:replace from="${escapeXml(error.text)}" to="${escapeXml(error.correction || '[suggestion needed]')}"/>`;
      })(),
      level: error.type === "grammar" ? "warning" : "error",
      // Minimal description - required by CommentBuilder but not shown when header exists
      description: error.description || " ",
      significance:
        error.importance >= HIGH_IMPORTANCE_THRESHOLD
          ? "Affects readability and professionalism"
          : undefined,
    });
  }

  private detectConventions(): void {
    logger.info("SpellingAnalyzer: Detecting language conventions");

    // Take a sample from the beginning for analysis
    const sampleSize = Math.min(CONVENTION_SAMPLE_SIZE, this.documentText.length);
    const sample = this.documentText.slice(0, sampleSize);

    this.languageConvention = detectLanguageConvention(sample);

    logger.info("SpellingAnalyzer: Detected conventions", {
      language: this.languageConvention.convention,
      languageConfidence: this.languageConvention.confidence,
      consistency: this.languageConvention.consistency,
    });
  }

  private generateAnalysis(): void {
    const totalErrors = this.errors.length;
    const hasGradeResult = this.gradeResult !== null;
    const grade = this.gradeResult?.grade || 0;

    // User-focused summary (prioritize by severity)
    let summary = "";
    if (totalErrors === 0) {
      summary = "Writing quality verified as excellent";
    } else if (hasGradeResult) {
      if (grade < 60) {
        summary = `Critical writing quality issues found (${this.gradeResult!.category})`;
      } else if (grade < 80) {
        summary = `Significant writing quality issues identified (${this.gradeResult!.category})`;
      } else {
        summary = `Minor writing quality issues detected (${this.gradeResult!.category})`;
      }
    } else {
      summary = `Writing issues identified requiring correction`;
    }

    // Build impact-oriented analysis with template structure
    const analysisLines: string[] = [];

    // Key Findings (prioritize by severity)
    if (totalErrors > 0) {
      analysisLines.push("**Key Findings:**");
      if (hasGradeResult) {
        const stats = this.gradeResult!.statistics;
        const grammarErrors = stats.errorsByType["grammar"] || 0;
        const spellingErrors = stats.errorsByType["spelling"] || 0;

        if (grammarErrors > 0) {
          analysisLines.push(`- ${grammarErrors} grammar error${grammarErrors !== 1 ? "s" : ""} affecting readability`);
        }
        if (spellingErrors > 0) {
          analysisLines.push(`- ${spellingErrors} spelling error${spellingErrors !== 1 ? "s" : ""} requiring correction`);
        }
        if (stats.errorsBySeverity.critical > 0) {
          analysisLines.push(`- ${stats.errorsBySeverity.critical} critical issue${stats.errorsBySeverity.critical !== 1 ? "s" : ""} requiring immediate attention`);
        }
      } else {
        analysisLines.push(`- ${totalErrors} writing issue${totalErrors !== 1 ? "s" : ""} requiring attention`);
      }
      analysisLines.push("");
    }

    // Document Impact
    if (totalErrors > 0) {
      analysisLines.push("**Document Impact:**");
      if (hasGradeResult && grade < 60) {
        analysisLines.push(
          "Critical writing quality issues may significantly impact document professionalism and credibility. Immediate review recommended."
        );
      } else if (hasGradeResult && grade < 80) {
        analysisLines.push(
          "Writing quality issues present but may not affect core comprehension. Review recommended for professional presentation."
        );
      } else {
        analysisLines.push(
          "Minor writing quality issues detected. Overall document integrity maintained but corrections would improve professionalism."
        );
      }
      analysisLines.push("");
    }

    // Specific Issues Found
    if (totalErrors > 0) {
      analysisLines.push("**🔍 Specific Issues Found:**", "");

      // Show top errors by severity
      const sortedErrors = this.errors
        .sort((a, b) => b.error.importance - a.error.importance)
        .slice(0, 5);

      for (const error of sortedErrors) {
        const severityIcon =
          error.error.importance > 75
            ? "🔴"
            : error.error.importance > HIGH_IMPORTANCE_THRESHOLD
              ? "🟡"
              : "🔵";
        analysisLines.push(`- ${severityIcon} **${error.error.type}**: "${error.error.text}"`);
        analysisLines.push(`  - Suggested: "${error.error.correction || "[no suggestion available]"}"`);
      }

      if (this.errors.length > 5) {
        analysisLines.push(`  - ...and ${this.errors.length - 5} more issue${this.errors.length - 5 !== 1 ? "s" : ""}`);
      }
      analysisLines.push("");
    }

    // Technical Details (collapsible)
    analysisLines.push("<details>", "<summary>Technical Details</summary>", "");

    // Quick summary with visual indicators
    analysisLines.push("**📊 Quick Summary:**");
    if (totalErrors > 0 && hasGradeResult) {
      const stats = this.gradeResult!.statistics;
      const indicators = [];
      const grammarErrors = stats.errorsByType["grammar"] || 0;
      const spellingErrors = stats.errorsByType["spelling"] || 0;

      if (stats.errorsBySeverity.critical > 0) {
        indicators.push(`🔴 ${stats.errorsBySeverity.critical} critical`);
      }
      if (grammarErrors > 0) {
        indicators.push(`🟡 ${grammarErrors} grammar`);
      }
      if (spellingErrors > 0) {
        indicators.push(`🔵 ${spellingErrors} spelling`);
      }
      analysisLines.push(
        indicators.join(" • "),
        `📊 Overall grade: ${grade}/100 (${this.gradeResult!.category})`,
        ""
      );
    } else if (totalErrors > 0) {
      analysisLines.push(`🔍 ${totalErrors} issue${totalErrors !== 1 ? "s" : ""} found`, "");
    } else {
      analysisLines.push("✅ No issues found", "");
    }

    // Language convention results
    if (this.languageConvention) {
      analysisLines.push(`**🌍 Language Convention:**`);
      let conventionLine = `- Detected: ${this.languageConvention.convention} English`;
      if (this.languageConvention.confidence < LOW_CONFIDENCE_THRESHOLD) {
        conventionLine += ` (${Math.round(this.languageConvention.confidence * 100)}% confidence)`;
      }
      analysisLines.push(conventionLine);

      if (this.languageConvention.consistency < LOW_CONSISTENCY_THRESHOLD) {
        analysisLines.push(
          `- ⚠️ Mixed conventions detected (${Math.round(this.languageConvention.consistency * 100)}% consistency)`,
          `- Recommendation: Standardize to ${this.languageConvention.convention} English`
        );
      }

      const examples = getConventionExamples(
        this.languageConvention.convention
      );
      if (examples.length > 0) {
        analysisLines.push(`- Examples: ${examples.join(", ")}`);
      }
      analysisLines.push("");
    }

    // Detailed error breakdown
    if (totalErrors > 0) {
      const toolErrors: ToolSpellingErrorWithLocation[] = this.errors.map(
        (e) => ({
          error: e.error,
          location: {
            lineNumber:
              e.chunk.getLineNumber(e.location?.startOffset || 0) || 1,
            columnNumber: 0,
          },
        })
      );
      analysisLines.push(
        `**📝 Detailed Error Analysis:**`,
        generateDocumentSummary(toolErrors)
      );
    }

    analysisLines.push("", "</details>");

    this.analysis = analysisLines.join("\n");
    this.summary = summary;
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
      llmInteractionsCount: this.llmCallCount,
    };
  }
}

// Export SpellingAnalyzerJob as SpellingPlugin for compatibility
export { SpellingAnalyzerJob as SpellingPlugin };
