import type { ExtractedForecast as ExtractedForecastToolType } from "@/tools/extract-forecasting-claims";
import { extractForecastingClaimsTool } from "@/tools/extract-forecasting-claims";
import forecasterTool from "@/tools/forecaster";
import type { Comment } from "@/types/documentSchema";
import { logger } from "../../../../logger";
import { TextChunk } from "../../TextChunk";
import { AnalysisResult, LLMInteraction, RoutingExample } from "../../types";
import { findForecastLocation } from "./locationFinder";

export interface ForecastToolResult {
  probability: number;
  description: string;
}

class ExtractedForecast {
  public extractedForecast: ExtractedForecastToolType;
  private chunk: TextChunk;
  private ourForecast: ForecastToolResult | null = null;

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
          numForecasts: 1,
          usePerplexity: false,
        },
        {
          userId: "forecast-plugin", // TODO: use actual user ID
          logger: logger,
        }
      );

      this.ourForecast = {
        probability: result.probability,
        description: result.description,
      };
    } catch (error) {
      logger.error(`Failed to generate forecast for prediction`, {
        prediction: this.extractedForecast.originalText,
        error,
      });
    }
  }

  public getOurForecast(): ForecastToolResult | null {
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
      startOffset: this.chunk.metadata.position.start + chunkLocation.startOffset,
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

    const message = this.createForecastMessage();

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

  private createForecastMessage(): string {
    let message = `Forecast: "${this.extractedForecast.rewrittenPredictionText}"`;

    if (this.extractedForecast.resolutionDate) {
      message += ` (${this.extractedForecast.resolutionDate})`;
    }

    if (this.extractedForecast.authorProbability !== undefined) {
      message += ` - Author: ${this.extractedForecast.authorProbability}%`;
    }

    const scores = [];
    if (this.extractedForecast.importanceScore >= 70) scores.push("important");
    if (this.extractedForecast.verifiabilityScore >= 70) scores.push("verifiable");
    if (this.extractedForecast.precisionScore >= 70) scores.push("precise");
    if (this.extractedForecast.robustnessScore >= 70) scores.push("robust");

    if (scores.length > 0) {
      message += ` [${scores.join(", ")}]`;
    }

    return message;
  }
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

  public async analyze(): Promise<AnalysisResult> {
    if (this.hasRun) {
      return this.getResults();
    }

    logger.info("ForecastAnalyzer: Starting analysis");

    await this.extractForecastingClaims();
    await this.generateOurForecasts();
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

  private async extractForecastingClaims(): Promise<void> {
    logger.debug(
      `ForecastAnalyzer: Extracting from ${this.chunks.length} chunks`
    );

    for (const chunk of this.chunks) {
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

        for (const forecastingClaim of result.forecasts) {
          const extractedForecast = new ExtractedForecast(
            forecastingClaim,
            chunk
          );
          this.extractedForecasts.push(extractedForecast);
        }
      } catch (error) {
        logger.error(
          `Failed to extract forecasts from chunk ${chunk.id}:`,
          error
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
      `ForecastAnalyzer: Generating our probability estimates for ${forecastsToAnalyze.length} claims`
    );

    for (const extractedForecast of forecastsToAnalyze) {
      await extractedForecast.generateOurForecast();
    }
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
    this.analysis = "TODO: Implement analysis";
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
