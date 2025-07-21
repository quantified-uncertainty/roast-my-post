/**
 * Forecast analyzer - integrates with the forecaster tool
 */

import { logger } from "../../../../logger";
import forecasterTool from "../../../../../tools/forecaster/index";
import type { 
  ForecastFindingData, 
  ForecastComparisonData,
  ForecastToolResult 
} from "./types";

export class ForecastAnalyzer {
  /**
   * Generate our own forecast for a prediction using the forecaster tool
   */
  async generateForecast(
    prediction: ForecastFindingData,
    question: string,
    context: string
  ): Promise<ForecastToolResult | null> {
    try {
      const result = await forecasterTool.execute(
        {
          question,
          context,
          numForecasts: 1, // Single forecast for efficiency
          usePerplexity: false, // Could be enabled if needed
        },
        {
          userId: "forecast-plugin",
          logger: logger,
        }
      );

      return {
        probability: result.probability,
        consensus: result.consensus,
        description: result.description,
        llmInteractions: result.llmInteractions || []
      };
    } catch (error) {
      logger.error(`Failed to generate forecast for prediction`, { 
        prediction: prediction.predictionText,
        error 
      });
      return null;
    }
  }

  /**
   * Check if our forecast agrees with the author's prediction
   */
  checkAgreement(authorProbability: number | undefined, ourProbability: number): boolean {
    if (!authorProbability) return true; // Can't disagree if no author probability
    
    // Consider agreement if within 20 percentage points
    return Math.abs(authorProbability - ourProbability) <= 20;
  }

  /**
   * Score prediction importance for deciding which to forecast
   */
  scorePredictionImportance(prediction: ForecastFindingData): number {
    let score = 0;

    // Has specific probability
    if (prediction.probability) score += 2;

    // Near-term predictions are often more important
    if (prediction.timeframe) {
      const timeframeLower = prediction.timeframe.toLowerCase();
      if (
        timeframeLower.includes("202") || 
        timeframeLower.includes("1 year") ||
        timeframeLower.includes("next year")
      ) {
        score += 1;
      }
    }

    // High confidence predictions
    if (prediction.authorConfidence === "high") score += 1;

    // Specific topics are more important than generic
    if (prediction.topic !== "generic" && prediction.topic !== "general") score += 1;

    return score;
  }

  /**
   * Select the most important predictions to forecast
   */
  selectPredictionsForForecasting(
    predictions: ForecastFindingData[],
    maxCount: number = 5
  ): ForecastFindingData[] {
    return predictions
      .filter((p) => {
        // Filter for predictions worth forecasting
        return (
          p.timeframe && // Has a timeframe
          p.topic !== "generic" && // Not too vague
          (!p.probability || p.authorConfidence !== "low") // Not already low confidence
        );
      })
      .sort((a, b) => {
        // Sort by importance score
        return this.scorePredictionImportance(b) - this.scorePredictionImportance(a);
      })
      .slice(0, maxCount);
  }

  /**
   * Create comparison data from prediction and forecast
   */
  createComparisonData(
    prediction: ForecastFindingData,
    forecast: ForecastToolResult
  ): ForecastComparisonData {
    return {
      ...prediction,
      ourProbability: forecast.probability,
      ourConsensus: forecast.consensus,
      reasoning: forecast.description,
      agreesWithAuthor: this.checkAgreement(prediction.probability, forecast.probability)
    };
  }

  /**
   * Assess author's confidence based on language and probability
   */
  assessAuthorConfidence(
    predictionText: string,
    probability?: number,
    context?: string
  ): "low" | "medium" | "high" {
    const fullText = (predictionText + " " + (context || "")).toLowerCase();

    // Check for high confidence indicators
    if (
      fullText.includes("certainly") ||
      fullText.includes("definitely") ||
      fullText.includes("will certainly") ||
      fullText.includes("undoubtedly") ||
      (probability && probability > 80)
    ) {
      return "high";
    }

    // Check for low confidence indicators
    if (
      fullText.includes("might") ||
      fullText.includes("possibly") ||
      fullText.includes("perhaps") ||
      fullText.includes("could") ||
      fullText.includes("may") ||
      (probability && probability < 30)
    ) {
      return "low";
    }

    return "medium";
  }
}