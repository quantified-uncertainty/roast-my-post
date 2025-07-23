import {
  type ForecastWithPrediction,
  generateDocumentSummary,
  generateForecastComment,
} from "@/lib/documentAnalysis/plugin-system/plugins/forecast/commentGeneration";
import type {
  ExtractedForecast as ExtractedForecastToolType,
} from "@/tools/extract-forecasting-claims";
import {
  extractForecastingClaimsTool,
} from "@/tools/extract-forecasting-claims";
import type { ForecasterOutput } from "@/tools/forecaster";
import forecasterTool from "@/tools/forecaster";
import type { Comment } from "@/types/documentSchema";

import { logger } from "../../../../logger";
import { TextChunk } from "../../TextChunk";
import {
  AnalysisResult,
  LLMInteraction,
  RoutingExample,
} from "../../types";
import { findForecastLocation } from "./locationFinder";

// Keep this for backward compatibility
export interface ForecastToolResult {
  probability: number;
  description: string;
}

class ExtractedForecast {
  public extractedForecast: ExtractedForecastToolType;
  private chunk: TextChunk;
  private ourForecast: ForecasterOutput | null = null;

  constructor(extractedForecast: ExtractedForecastToolType, chunk: TextChunk) {
    this.extractedForecast = extractedForecast;
    this.chunk = chunk;
  }

  get originalText(): string {
    return this.extractedForecast.originalText;
  }

  get resolutionDate(): string | undefined {
    return this.extractedForecast.resolutionDate;
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

  public async generateOurForecast(context?: { userId?: string }): Promise<void> {
    try {
      const result = await forecasterTool.execute(
        {
          question: this.extractedForecast.rewrittenPredictionText,
          context: "",
          numForecasts: 2,
          usePerplexity: false,
        },
        {
          userId: context?.userId || "forecast-plugin",
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

  public findLocationInDocument(): {
    startOffset: number;
    endOffset: number;
    quotedText: string;
  } | null {
    const chunkLocation = findForecastLocation(
      this.extractedForecast.originalText,
      this.chunk.text,
      {
        allowPartialMatch: true,
        normalizeQuotes: true,
      }
    );

    if (!chunkLocation || !this.chunk.metadata?.position) {
      logger.warn(
        `Could not find location for forecast: ${this.extractedForecast.originalText}`
      );
      return null;
    }

    return {
      startOffset:
        this.chunk.metadata.position.start + chunkLocation.startOffset,
      endOffset: this.chunk.metadata.position.start + chunkLocation.endOffset,
      quotedText: chunkLocation.quotedText,
    };
  }

  private commentImportanceScore(): number {
    return this.shouldGetOurForecastScore / 10;
  }

  public getComment(): Comment | null {
    const location = this.findLocationInDocument();
    if (!location) return null;

    // Use the new comment generation system
    const forecastWithPrediction: ForecastWithPrediction = {
      forecast: this.extractedForecast,
      prediction: this.ourForecast || undefined,
    };

    const message = generateForecastComment(forecastWithPrediction);

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

  // Removed - now using generateForecastComment from commentGeneration.ts
}

export class ForecastAnalyzerJob {
  private documentText: string;
  private chunks: TextChunk[];
  private hasRun = false;
  private comments: Comment[] = [];
  private summary: string = "";
  private analysis: string = "";
  private llmInteractions: LLMInteraction[] = [];
  private totalCost: number = 0;
  private extractedForecasts: ExtractedForecast[] = [];

  static displayName(): string {
    return "FORECAST";
  }

  static promptForWhenToUse(): string {
    return `Call this when there are predictions or forecasts about the future. This includes:
- Explicit predictions (AGI will arrive by 2030)
- Probability estimates (70% chance of recession)
- Trend extrapolations (at this rate, we'll reach X by Y)
- Conditional forecasts (if X happens, then Y will follow)
- Timeline estimates (this will take 5-10 years)
- Future-oriented language (will, shall, by [year], within [timeframe])`;
  }

  static routingExamples(): RoutingExample[] {
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

  constructor({
    documentText,
    chunks,
  }: {
    documentText: string;
    chunks: TextChunk[];
  }) {
    this.documentText = documentText;
    this.chunks = chunks;
  }

  public async analyze(context?: { userId?: string }): Promise<AnalysisResult> {
    if (this.hasRun) {
      return this.getResults();
    }

    logger.info("ForecastAnalyzer: Starting analysis");

    await this.extractForecastingClaims(context);
    await this.generateOurForecasts(context);
    this.createComments();
    this.generateAnalysis();

    this.hasRun = true;
    logger.info(
      `ForecastAnalyzer: Analysis complete - ${this.comments.length} comments generated`
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

  private async extractForecastingClaims(context?: { userId?: string }): Promise<void> {
    logger.debug(
      `ForecastAnalyzer: Extracting from ${this.chunks.length} chunks in parallel`
    );

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
              userId: context?.userId,
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

    // Process successful results
    for (const chunkResult of chunkResults) {
      if (chunkResult.status === 'fulfilled') {
        const { chunk, result } = chunkResult.value;
        for (const forecastingClaim of result.forecasts) {
          const extractedForecast = new ExtractedForecast(
            forecastingClaim,
            chunk
          );
          this.extractedForecasts.push(extractedForecast);
        }
      }
    }

    logger.debug(
      `ForecastAnalyzer: Extracted ${this.extractedForecasts.length} forecasting claims from document`
    );
  }

  private async generateOurForecasts(context?: { userId?: string }): Promise<void> {
    const forecastsToAnalyze = this.extractedForecasts
      .filter((ef) => ef.shouldGetOurForecastScore > 60)
      .sort((a, b) => b.shouldGetOurForecastScore - a.shouldGetOurForecastScore)
      .slice(0, 5);

    logger.debug(
      `ForecastAnalyzer: Generating our probability estimates for ${forecastsToAnalyze.length} claims in parallel`
    );

    // Run all forecast generations in parallel
    await Promise.all(
      forecastsToAnalyze.map(extractedForecast => 
        extractedForecast.generateOurForecast(context)
      )
    );
  }

  private createComments(): void {
    for (const extractedForecast of this.extractedForecasts) {
      const comment = extractedForecast.getComment();
      if (comment) {
        this.comments.push(comment);
      }
    }

    logger.debug(`ForecastAnalyzer: Created ${this.comments.length} comments`);
  }

  private generateAnalysis(): void {
    if (this.extractedForecasts.length === 0) {
      this.summary = "No forecasting claims found.";
      this.analysis =
        "No predictions or forecasts were identified in this document.";
      return;
    }

    // Convert to ForecastWithPrediction format for the summary generator
    const forecastsWithPredictions: ForecastWithPrediction[] =
      this.extractedForecasts.map((ef) => ({
        forecast: ef.extractedForecast,
        prediction: ef.getOurForecast() || undefined,
      }));

    // Use the new document summary generator
    this.analysis = generateDocumentSummary(forecastsWithPredictions);

    // Generate simple summary for the summary field
    const totalForecasts = this.extractedForecasts.length;
    const forecastsWithProbability = this.extractedForecasts.filter(
      (ef) => ef.extractedForecast.authorProbability !== undefined
    ).length;
    const forecastsWithOurEstimate = this.extractedForecasts.filter(
      (ef) => ef.getOurForecast() !== null
    ).length;

    this.summary = `Found ${totalForecasts} forecasting claim${totalForecasts !== 1 ? "s" : ""}`;
    if (forecastsWithProbability > 0) {
      this.summary += ` (${forecastsWithProbability} with explicit probabilities)`;
    }
    if (forecastsWithOurEstimate > 0) {
      this.summary += `. Generated our own estimates for ${forecastsWithOurEstimate} claims.`;
    }
  }

  public getDebugInfo(): Record<string, unknown> {
    return {
      hasRun: this.hasRun,
      forecastsCount: this.extractedForecasts.length,
      commentsCount: this.comments.length,
      totalCost: this.totalCost,
      llmInteractionsCount: this.llmInteractions.length,
    };
  }
}

export { ForecastPlugin } from "./plugin-wrapper";
