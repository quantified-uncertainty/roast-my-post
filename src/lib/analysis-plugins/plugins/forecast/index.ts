import {
  type ForecastWithPrediction,
  generateDocumentSummary,
  generateForecastComment,
} from "@/lib/analysis-plugins/plugins/forecast/commentGeneration";
import type {
  ExtractedForecast as ExtractedForecastToolType,
} from "@/tools/extract-forecasting-claims";
import {
  extractForecastingClaimsTool,
} from "@/tools/extract-forecasting-claims";
import type { ForecasterOutput } from "@/tools/forecaster";
import forecasterTool from "@/tools/forecaster";
import type { Comment } from "@/types/documentSchema";

import { logger } from "../../../logger";
import { TextChunk } from "../../TextChunk";
import {
  AnalysisResult,
  LLMInteraction,
  RoutingExample,
  SimpleAnalysisPlugin,
} from "../../types";
import { findForecastLocation } from "@/lib/documentAnalysis/shared/enhancedPluginLocationWrappers";

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

  public async generateOurForecast(): Promise<void> {
    try {
      const result = await forecasterTool.execute(
        {
          question: this.extractedForecast.rewrittenPredictionText,
          context: "",
          numForecasts: 2,
          usePerplexity: false,
        },
        {
          userId: "forecast-plugin",
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
    // Pass session config if available from the chunk
    const sessionConfig = this.chunk.metadata?.sessionConfig;
    
    const chunkLocation = await findForecastLocation(
      this.extractedForecast.originalText,
      this.chunk.text,
      sessionConfig
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

  public async getComment(): Promise<Comment | null> {
    const location = await this.findLocationInDocument();
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

  async analyze(chunks: TextChunk[], documentText: string): Promise<AnalysisResult> {
    // Store the inputs
    this.documentText = documentText;
    this.chunks = chunks;
    if (this.hasRun) {
      return this.getResults();
    }

    try {
      logger.info("ForecastAnalyzer: Starting analysis");
      logger.info(`ForecastAnalyzer: Processing ${chunks.length} chunks`);

      await this.extractForecastingClaims();
      
      logger.info(`ForecastAnalyzer: Extracted ${this.extractedForecasts.length} forecasting claims from document`);
      await this.generateOurForecasts();
      
      logger.info(`ForecastAnalyzer: Generated our probability estimates for ${this.extractedForecasts.filter(f => f.getOurForecast() !== null).length} claims`);
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
      this.analysis = "The forecast analysis could not be completed due to a technical error.";
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

  private async extractForecastingClaims(): Promise<void> {
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

  private async generateOurForecasts(): Promise<void> {
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
        extractedForecast.generateOurForecast()
      )
    );
  }

  private async createComments(): Promise<void> {
    // Process comments in parallel for better performance
    const comments = await Promise.all(
      this.extractedForecasts.map(extractedForecast => extractedForecast.getComment())
    );
    
    // Filter out null comments and add to array
    this.comments = comments.filter((comment): comment is Comment => comment !== null);

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
