import { logger } from "../../../shared/logger";
import type {
  Comment,
  ToolChainResult,
} from "../../../shared/types";
import type {
  ExtractedForecast as ExtractedForecastToolType,
} from "../../../tools/extract-forecasting-claims";
import {
  extractForecastingClaimsTool,
} from "../../../tools/extract-forecasting-claims";
import type { ForecasterOutput } from "../../../tools/forecaster";
import forecasterTool from "../../../tools/forecaster";
import { TextChunk } from "../../TextChunk";
import {
  AnalysisResult,
  LLMInteraction,
  RoutingExample,
  SimpleAnalysisPlugin,
} from "../../types";
import { CommentBuilder } from "../../utils/CommentBuilder";
import { withErrorBoundaryBatch } from "../../utils/errorBoundary";
import {
  type ForecastWithPrediction,
  generateDocumentSummary,
  generateForecastComment,
} from "./commentGeneration";

// Keep this for backward compatibility
export interface ForecastToolResult {
  probability: number;
  description: string;
}

class ExtractedForecast {
  public extractedForecast: ExtractedForecastToolType;
  private chunk: TextChunk;
  private documentText: string;
  private ourForecast: ForecasterOutput | null = null;
  private processingStartTime: number;

  constructor(
    extractedForecast: ExtractedForecastToolType,
    chunk: TextChunk,
    documentText: string,
    processingStartTime: number
  ) {
    this.extractedForecast = extractedForecast;
    this.chunk = chunk;
    this.documentText = documentText;
    this.processingStartTime = processingStartTime;
  }

  get originalText(): string {
    return this.extractedForecast.originalText;
  }

  get resolutionDate(): string | undefined {
    return this.extractedForecast.resolutionDate;
  }

  getChunk(): TextChunk {
    return this.chunk;
  }

  get averageScore(): number {
    return (
      (this.extractedForecast.importanceScore +
        this.extractedForecast.precisionScore +
        this.extractedForecast.verifiabilityScore +
        this.extractedForecast.robustnessScore) /
      4
    );
  }

  get shouldGetOurForecastScore(): number {
    return (
      (this.extractedForecast.importanceScore +
        this.extractedForecast.precisionScore +
        this.extractedForecast.verifiabilityScore +
        (100 - this.extractedForecast.robustnessScore) * 2) /
      5
    );
  }

  public async generateOurForecast(): Promise<void> {
    try {
      const userId = "forecast-plugin";

      const result = await forecasterTool.execute(
        {
          question: this.extractedForecast.rewrittenPredictionText,
          context: "",
          numForecasts: 2,
          usePerplexity: false,
        },
        {
          userId: userId,
          logger: logger,
        }
      );

      this.ourForecast = result;
    } catch (error) {
      logger.error(`Failed to generate forecast for prediction`, {
        prediction: this.extractedForecast.originalText,
        error,
      });
    }
  }

  public getOurForecast(): ForecasterOutput | null {
    return this.ourForecast;
  }

  public async findLocationInDocument(): Promise<{
    startOffset: number;
    endOffset: number;
    quotedText: string;
  } | null> {
    // Use the chunk's method to find text and convert to absolute position
    return this.chunk.findTextAbsolute(this.extractedForecast.originalText, {
      normalizeQuotes: true, // Handle quote variations
      partialMatch: true, // Forecasts can be long
      useLLMFallback: true, // Enable LLM fallback for paraphrased text
      pluginName: "forecast",
      documentText: this.documentText, // Pass for position verification
    });
  }

  private commentImportanceScore(): number {
    return this.shouldGetOurForecastScore / 10;
  }

  private getHeaderText(): string {
    const prediction =
      this.extractedForecast.rewrittenPredictionText ||
      this.extractedForecast.originalText;
    const truncated =
      prediction.length > 60 ? prediction.substring(0, 57) + "..." : prediction;

    if (this.ourForecast?.probability) {
      return `📊 Forecast (${Math.round(this.ourForecast.probability)}%): ${truncated}`;
    }
    return `📊 Forecast: ${truncated}`;
  }

  private getLevel(): "error" | "warning" | "info" | "success" | "debug" {
    // Forecasts are informational by nature
    const averageScore = this.averageScore;

    // If we have our forecast, show as info level
    if (this.ourForecast) {
      if (averageScore >= 80) {
        return "success";
      } else if (averageScore >= 50) {
        return "info";
      } else {
        return "warning";
      }
    }

    // For predictions we couldn't analyze:
    // - High quality predictions that failed: 'info' (visible)
    // - Low quality predictions: 'debug' (hidden)
    if (this.shouldGetOurForecastScore >= 60) {
      return "info"; // Important prediction we couldn't analyze
    } else {
      return "debug"; // Low quality prediction
    }
  }

  public async getComment(): Promise<Comment | null> {
    const location = await this.findLocationInDocument();
    if (!location) return null;

    // Build tool chain results
    const toolChain: ToolChainResult[] = [
      {
        toolName: "extractForecastingClaims",
        stage: "extraction",
        timestamp: new Date(this.processingStartTime + 40).toISOString(),
        result: this.extractedForecast,
      },
    ];

    // Add our forecast generation if available
    if (this.ourForecast) {
      toolChain.push({
        toolName: "generateProbabilityForecast",
        stage: "verification",
        timestamp: new Date().toISOString(),
        result: this.ourForecast as unknown as Record<string, unknown>,
      });
    }

    // Build appropriate description based on whether we have a forecast
    const description = this.ourForecast
      ? this.buildVerifiedDescription()
      : this.buildSkipDescription();

    return CommentBuilder.build({
      plugin: "forecast",
      location,
      chunkId: this.chunk.id,
      processingStartTime: this.processingStartTime,
      toolChain,

      // Required fields
      description,
      header: this.buildTitle(),
      level: this.getLevel(),

      // Additional structured content
      observation: this.buildObservation(),
      significance: this.buildSignificance(),
    });
  }

  private buildTitle(): string {
    // Use concise description from comment generation
    const hasAuthorProb =
      this.extractedForecast.authorProbability !== undefined;
    const gap =
      hasAuthorProb && this.ourForecast
        ? Math.abs(
            this.extractedForecast.authorProbability! -
              this.ourForecast.probability
          )
        : 0;

    if (hasAuthorProb && this.ourForecast) {
      // Show the probability change
      let header = `${this.extractedForecast.authorProbability}% → ${this.ourForecast.probability}%`;

      // Add context for large gaps
      if (gap >= 40) {
        header += " (extreme overconfidence)";
      } else if (gap >= 25) {
        header += " (overconfident)";
      }

      return header;
    } else if (this.ourForecast) {
      // No author probability, just show our estimate
      return `Our estimate: ${this.ourForecast.probability}%`;
    } else {
      // No prediction available
      return this.extractedForecast.authorProbability
        ? `${this.extractedForecast.authorProbability}% prediction`
        : "Prediction identified";
    }
  }

  private buildObservation(): string | undefined {
    const issues: string[] = [];

    if (this.extractedForecast.precisionScore < 5) {
      issues.push("vague or imprecise prediction");
    }
    if (this.extractedForecast.verifiabilityScore < 5) {
      issues.push("difficult to verify outcome");
    }
    if (this.extractedForecast.robustnessScore < 5) {
      issues.push("sensitive to interpretation");
    }

    if (issues.length > 0) {
      return `Issues: ${issues.join(", ")}`;
    }

    if (
      this.ourForecast &&
      this.extractedForecast.authorProbability &&
      Math.abs(
        this.ourForecast.probability - this.extractedForecast.authorProbability
      ) > 30
    ) {
      return `Significant disagreement with author's assessment (${this.extractedForecast.authorProbability}% vs our ${this.ourForecast.probability}%)`;
    }

    return undefined;
  }

  private buildSignificance(): string | undefined {
    if (this.extractedForecast.importanceScore >= 8) {
      return "This is a critical prediction that significantly affects the document's conclusions";
    } else if (this.extractedForecast.importanceScore >= 6) {
      return "This forecast impacts key arguments in the document";
    } else if (this.averageScore < 3) {
      return "Poor forecast quality undermines the credibility of predictions";
    }
    return undefined;
  }

  private buildVerifiedDescription(): string {
    // When we have a forecast, use the existing format
    const forecastWithPrediction: ForecastWithPrediction = {
      forecast: this.extractedForecast,
      prediction: this.ourForecast || undefined,
    };
    return generateForecastComment(forecastWithPrediction);
  }

  private buildSkipDescription(): string {
    const shouldAnalyze = this.shouldGetOurForecastScore >= 60;

    let skipReason: string;
    let detailedReason: string;

    if (shouldAnalyze) {
      // High quality but couldn't generate forecast
      skipReason =
        "Technical complexity exceeded automated forecasting capabilities";
      detailedReason = `This prediction was high-quality enough to warrant analysis, but the system couldn't generate a probability estimate. This could be due to:
- Conceptual complexity requiring domain expertise
- Insufficient reference data for calibration  
- Technical limitations in the forecasting tools

**Recommendation:** This prediction would benefit from expert human analysis.`;
    } else {
      // Low quality prediction
      skipReason = "Low quality prediction not suitable for analysis";
      detailedReason =
        "The prediction was too vague or poorly grounded to generate meaningful probability estimates.";
    }

    return `**Prediction Found:**
> "${this.extractedForecast.originalText}"

${
  this.extractedForecast.rewrittenPredictionText
    ? `**Rewritten Version:**
> "${this.extractedForecast.rewrittenPredictionText}"

`
    : ""
}**Skip Reason:** ${skipReason}

**Quality Score:** ${this.averageScore.toFixed(1)}/10

**Scoring Breakdown:**
- Importance: ${this.extractedForecast.importanceScore}/10 (how central to document)
- Precision: ${this.extractedForecast.precisionScore}/10 (how specific/measurable)
- Verifiability: ${this.extractedForecast.verifiabilityScore}/10 (how easy to verify outcome)  
- Robustness: ${this.extractedForecast.robustnessScore}/10 (empirical grounding)

${detailedReason}`;
  }
}

export class ForecastAnalyzerJob implements SimpleAnalysisPlugin {
  private documentText: string;
  private chunks: TextChunk[];
  private hasRun = false;
  private comments: Comment[] = [];
  private summary: string = "";
  private analysis: string = "";
  private llmInteractions: LLMInteraction[] = [];
  private totalCost: number = 0;
  private extractedForecasts: ExtractedForecast[] = [];
  private processingStartTime: number = 0;

  name(): string {
    return "FORECAST";
  }

  promptForWhenToUse(): string {
    return `Call this when there are predictions or forecasts about the future. This includes:
- Explicit predictions (AGI will arrive by 2030)
- Probability estimates (70% chance of recession)
- Trend extrapolations (at this rate, we'll reach X by Y)
- Conditional forecasts (if X happens, then Y will follow)
- Timeline estimates (this will take 5-10 years)
- Future-oriented language (will, shall, by [year], within [timeframe])`;
  }

  routingExamples(): RoutingExample[] {
    return [
      {
        chunkText:
          "We expect AI capabilities to improve significantly over the next 5 years",
        shouldProcess: true,
        reason: "Contains future prediction with timeframe",
      },
      {
        chunkText: "The company's revenue was $100M last year",
        shouldProcess: false,
        reason: "Historical fact, not a prediction",
      },
      {
        chunkText:
          "There's a 60% probability that quantum computers will break RSA encryption by 2035",
        shouldProcess: true,
        reason: "Explicit probability forecast with timeframe",
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
      logger.info("ForecastAnalyzer: Starting analysis");
      logger.info(`ForecastAnalyzer: Processing ${chunks.length} chunks`);

      await this.extractForecastingClaims();

      logger.info(
        `ForecastAnalyzer: Extracted ${this.extractedForecasts.length} forecasting claims from document`
      );
      await this.generateOurForecasts();

      logger.info(
        `ForecastAnalyzer: Generated our probability estimates for ${this.extractedForecasts.filter((f) => f.getOurForecast() !== null).length} claims`
      );
      await this.createComments();

      logger.info(`ForecastAnalyzer: Created ${this.comments.length} comments`);
      this.generateAnalysis();

      this.hasRun = true;
      logger.info(
        `ForecastAnalyzer: Analysis complete - ${this.comments.length} comments generated`
      );

      return this.getResults();
    } catch (error) {
      logger.error("ForecastAnalyzer: Fatal error during analysis", error);
      // Return a partial result instead of throwing
      this.hasRun = true;
      this.summary = "Analysis failed due to an error";
      this.analysis =
        "The forecast analysis could not be completed due to a technical error.";
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

  private async extractForecastingClaims(): Promise<void> {
    logger.debug(
      `ForecastAnalyzer: Extracting from ${this.chunks.length} chunks in parallel`
    );

    const userId = "forecast-plugin";

    // Process all chunks in parallel
    const chunkResults = await Promise.allSettled(
      this.chunks.map(async (chunk) => {
        try {
          const result = await extractForecastingClaimsTool.execute(
            {
              text: chunk.text,
              additionalContext: "",
              maxDetailedAnalysis: 10,
              minQualityThreshold: 70,
            },
            {
              userId: userId,
              logger: logger,
            }
          );

          return { chunk, result };
        } catch (error) {
          logger.error(
            `Failed to extract forecasts from chunk ${chunk.id}:`,
            error
          );
          throw error;
        }
      })
    );

    // Process successful results and log failures
    for (const chunkResult of chunkResults) {
      if (chunkResult.status === "fulfilled") {
        const { chunk, result } = chunkResult.value;
        for (const forecastingClaim of result.forecasts) {
          const extractedForecast = new ExtractedForecast(
            forecastingClaim,
            chunk,
            this.documentText,
            this.processingStartTime
          );
          this.extractedForecasts.push(extractedForecast);
        }
      } else {
        logger.warn(
          `Failed to process chunk for forecasting claims: ${chunkResult.reason}`
        );
      }
    }

    logger.debug(
      `ForecastAnalyzer: Extracted ${this.extractedForecasts.length} forecasting claims from document`
    );
  }

  private async generateOurForecasts(): Promise<void> {
    const forecastsToAnalyze = this.extractedForecasts
      .filter((ef) => ef.shouldGetOurForecastScore > 60)
      .sort((a, b) => b.shouldGetOurForecastScore - a.shouldGetOurForecastScore)
      .slice(0, 5);

    logger.debug(
      `ForecastAnalyzer: Generating our probability estimates for ${forecastsToAnalyze.length} claims in parallel`
    );

    // Run all forecast generations in parallel with error boundaries
    const operations = forecastsToAnalyze.map((extractedForecast, index) => ({
      name: `forecast-${index}-${extractedForecast.originalText.slice(0, 30)}`,
      operation: () => extractedForecast.generateOurForecast(),
      timeout: 30000, // 30 seconds per forecast
    }));

    const results = await withErrorBoundaryBatch(operations);

    // Log any failures
    const failures = results.filter((r) => !r.result.success);
    if (failures.length > 0) {
      logger.warn(
        `ForecastAnalyzer: ${failures.length} forecasts failed to generate`,
        failures.map((f) => ({ name: f.name, error: f.result.error?.message }))
      );
    }
  }

  private async createComments(): Promise<void> {
    // Process regular comments in parallel for better performance
    const comments = await Promise.all(
      this.extractedForecasts.map((extractedForecast) =>
        extractedForecast.getComment()
      )
    );

    // Generate debug comments for forecasts that were not investigated
    const debugComments = await this.generateDebugComments();

    // Filter out null comments and combine regular and debug comments
    const regularComments = comments.filter(
      (comment): comment is Comment => comment !== null
    );
    const validDebugComments = debugComments.filter(
      (comment): comment is Comment => comment !== null
    );

    this.comments = [...regularComments, ...validDebugComments];

    logger.debug(
      `ForecastAnalyzer: Created ${this.comments.length} comments (${regularComments.length} regular, ${validDebugComments.length} debug)`
    );
  }

  private async generateDebugComments(): Promise<(Comment | null)[]> {
    const debugComments: (Comment | null)[] = [];

    // IMPORTANT: We now handle skipped forecasts in the regular comment flow,
    // so we only need debug comments for forecasts that couldn't be located.
    // This avoids creating duplicate comments.

    // Debug comments ONLY for forecasts that couldn't be located
    for (const forecast of this.extractedForecasts) {
      const location = await forecast.findLocationInDocument();
      if (!location) {
        const debugComment = await this.createLocationDebugComment(forecast);
        if (debugComment) {
          debugComments.push(debugComment);
        }
      }
    }

    return debugComments;
  }

  // DEPRECATED: These methods are no longer used as we handle skipped forecasts in regular comments
  // Keeping them commented for reference
  /*
  private async createEstimateFailedDebugComment(forecast: ExtractedForecast): Promise<Comment | null> {
    // This functionality is now handled in buildSkipDescription()
    return null;
  }

  private async createLowQualityDebugComment(forecast: ExtractedForecast): Promise<Comment | null> {
    // This functionality is now handled in buildSkipDescription()
    return null;
  }
  */

  private async createLocationDebugComment(
    forecast: ExtractedForecast
  ): Promise<Comment | null> {
    const toolChain: ToolChainResult[] = [
      {
        toolName: "extractForecastingClaims",
        stage: "extraction",
        timestamp: new Date(this.processingStartTime + 40).toISOString(),
        result: forecast.extractedForecast,
      },
      {
        toolName: "findLocation",
        stage: "enhancement",
        timestamp: new Date().toISOString(),
        result: { status: "failed", reason: "text_not_found" },
      },
    ];

    // Use a default position since we can't locate the text
    const location = {
      startOffset: 0,
      endOffset: forecast.extractedForecast.originalText.length,
      quotedText: forecast.extractedForecast.originalText,
    };

    return CommentBuilder.build({
      plugin: "forecast",
      location,
      chunkId: forecast.getChunk().id,
      processingStartTime: this.processingStartTime,
      toolChain,

      header: `Prediction Detected, Location Unknown`,
      level: "debug" as const,
      description: `**Prediction Found:**
> "${forecast.extractedForecast.originalText}"

${
  forecast.extractedForecast.rewrittenPredictionText
    ? `**Rewritten Version:**
> "${forecast.extractedForecast.rewrittenPredictionText}"

`
    : ""
}**Skip Reason:** Unable to locate prediction precisely in document

This prediction was extracted but couldn't be positioned accurately. This might be due to:
- Text reformatting during document processing
- Prediction spanning multiple paragraphs
- Paraphrasing during the extraction process

The analysis may still be valid, but the highlighting won't be precise.`,
    });
  }

  private generateAnalysis(): void {
    const totalForecasts = this.extractedForecasts.length;

    if (totalForecasts === 0) {
      this.summary = "No forecasting claims found.";
      this.analysis =
        "No predictions or forecasts were identified in this document.";
      return;
    }

    const forecastsWithProbability = this.extractedForecasts.filter(
      (ef) => ef.extractedForecast.authorProbability !== undefined
    ).length;
    const forecastsWithOurEstimate = this.extractedForecasts.filter(
      (ef) => ef.getOurForecast() !== null
    ).length;

    // Assess forecast quality
    const hasExplicitProbabilities = forecastsWithProbability > 0;
    const mostHaveEstimates = forecastsWithOurEstimate > totalForecasts * 0.7;

    // User-focused summary (prioritize by assessment quality)
    let summary = "";
    if (hasExplicitProbabilities && mostHaveEstimates) {
      summary = "Forecasting claims identified with quantified predictions";
    } else if (hasExplicitProbabilities) {
      summary = "Mixed forecasting quality: some claims lack quantification";
    } else if (forecastsWithOurEstimate > 0) {
      summary = "Forecasting claims identified requiring probability estimates";
    } else {
      summary = "Forecasting claims identified but difficult to quantify";
    }

    // Build impact-oriented analysis with template structure
    let analysis = "";

    // Key Findings
    if (totalForecasts > 0) {
      analysis += "**Key Findings:**\n";
      analysis += `- ${totalForecasts} forecasting claim${totalForecasts !== 1 ? "s" : ""} identified\n`;
      if (forecastsWithProbability > 0) {
        analysis += `- ${forecastsWithProbability} include${forecastsWithProbability === 1 ? "s" : ""} explicit probability estimates\n`;
      }
      if (forecastsWithOurEstimate > 0) {
        analysis += `- Generated probability estimates for ${forecastsWithOurEstimate} additional claim${forecastsWithOurEstimate !== 1 ? "s" : ""}\n`;
      }
      analysis += "\n";
    }

    // Document Impact
    analysis += "**Document Impact:**\n";
    if (hasExplicitProbabilities && mostHaveEstimates) {
      analysis +=
        "Strong forecasting methodology with quantified predictions enhances document credibility for future evaluation.\n";
    } else if (hasExplicitProbabilities) {
      analysis +=
        "Mixed forecasting quality. Some claims well-quantified while others lack precision for future verification.\n";
    } else {
      analysis +=
        "Forecasting claims present but lack quantification. Adding probability estimates would improve predictive value.\n";
    }
    analysis += "\n";

    // Specific Claims Found
    if (totalForecasts > 0) {
      analysis += "**🔍 Specific Claims Found:**\n\n";

      // Show top forecasts (prioritize those with explicit probabilities)
      const sortedForecasts = this.extractedForecasts
        .sort((a, b) => {
          const aHasProb = a.extractedForecast.authorProbability !== undefined;
          const bHasProb = b.extractedForecast.authorProbability !== undefined;
          if (aHasProb && !bHasProb) return -1;
          if (!aHasProb && bHasProb) return 1;
          return (
            (b.extractedForecast.importanceScore || 0) -
            (a.extractedForecast.importanceScore || 0)
          );
        })
        .slice(0, 3);

      for (const ef of sortedForecasts) {
        const forecast = ef.extractedForecast;
        const hasProb = forecast.authorProbability !== undefined;
        const ourEstimate = ef.getOurForecast();
        const icon = hasProb ? "📊" : ourEstimate ? "🤖" : "❓";

        analysis += `- ${icon} "${forecast.originalText}"\n`;
        if (hasProb) {
          analysis += `  - Author probability: ${forecast.authorProbability}%\n`;
        }
        if (ourEstimate && !hasProb) {
          analysis += `  - Our estimate: ${Math.round(ourEstimate.probability * 100)}%\n`;
        }
      }

      if (this.extractedForecasts.length > 3) {
        analysis += `  - ...and ${this.extractedForecasts.length - 3} more forecast${this.extractedForecasts.length - 3 !== 1 ? "s" : ""}\n`;
      }
      analysis += "\n";
    }

    // Technical Details (collapsible)
    analysis += "<details>\n<summary>Technical Details</summary>\n\n";

    // Quick summary with visual indicators
    analysis += "**📊 Quick Summary:**\n";
    const indicators = [];
    if (forecastsWithProbability > 0) {
      indicators.push(
        `📊 ${forecastsWithProbability} explicit probability${forecastsWithProbability !== 1 ? "ies" : "y"}`
      );
    }
    if (forecastsWithOurEstimate > 0) {
      indicators.push(`🤖 ${forecastsWithOurEstimate} estimated`);
    }
    const unquantified =
      totalForecasts - forecastsWithProbability - forecastsWithOurEstimate;
    if (unquantified > 0) {
      indicators.push(`❓ ${unquantified} unquantified`);
    }

    if (indicators.length > 0) {
      analysis += indicators.join(" • ") + "\n\n";
    }

    analysis += `**🎯 Forecasting Quality:**\n`;
    if (forecastsWithProbability > 0) {
      analysis += `- ${Math.round((forecastsWithProbability / totalForecasts) * 100)}% of claims include explicit probabilities\n`;
    }
    if (forecastsWithOurEstimate > 0) {
      analysis += `- Generated estimates for ${Math.round((forecastsWithOurEstimate / totalForecasts) * 100)}% of remaining claims\n`;
    }
    const quantificationRate =
      (forecastsWithProbability + forecastsWithOurEstimate) / totalForecasts;
    analysis += `- Overall quantification rate: ${Math.round(quantificationRate * 100)}%\n\n`;

    // Convert to ForecastWithPrediction format for the detailed summary generator
    const forecastsWithPredictions: ForecastWithPrediction[] =
      this.extractedForecasts.map((ef) => ({
        forecast: ef.extractedForecast,
        prediction: ef.getOurForecast() || undefined,
      }));

    analysis += `**📝 Detailed Forecast Analysis:**\n`;
    analysis += generateDocumentSummary(forecastsWithPredictions);
    analysis += "\n</details>";

    this.analysis = analysis;
    this.summary = summary;
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
      forecastsCount: this.extractedForecasts.length,
      commentsCount: this.comments.length,
      totalCost: this.totalCost,
      llmInteractionsCount: this.llmInteractions.length,
    };
  }
}

// Export ForecastAnalyzerJob as ForecastPlugin for compatibility
export { ForecastAnalyzerJob as ForecastPlugin };
