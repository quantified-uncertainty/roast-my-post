/**
 * Forecast Analyzer - Simple class implementation
 *
 * Analyzes documents for predictions and forecasts, generates our own forecasts,
 * and identifies disagreements between author predictions and our analysis.
 */

import type { ExtractedForecast } from "@/tools/extract-forecasting-claims";
import {
  extractForecastingClaimsTool,
} from "@/tools/extract-forecasting-claims";
import type { Comment } from "@/types/documentSchema";

import { logger } from "../../../../logger";
import { TextChunk } from "../../TextChunk";
import {
  AnalysisResult,
  LLMInteraction,
  RoutingExample,
} from "../../types";
import { generateFindingId } from "../../utils/findingHelpers";
import { ForecastAnalyzer } from "./forecastAnalyzer";
import { findForecastLocation } from "./locationFinder";
import { ForecastPromptBuilder } from "./promptBuilder";

interface ForecastComment {
  id: string;
  text: string;
  highlightText: string;
  startOffset: number;
  endOffset: number;
  severity: "low" | "medium" | "high";
  type: "forecast" | "forecast_disagreement";
  importance?: number;
}

interface ForecastData {
  originalText: string;
  rewrittenText: string;
  timeframe?: string;
  probability?: number;
  topic: string;
  reasoning: string;
  predictionPrecisionScore: number;
  verifiabilityScore: number;
  importanceScore: number;
  isFuture: boolean;
  chunkId: string;
  chunkText: string; // Store chunk text for more accurate location finding
}

export class ForecastAnalyzerJob {
  private documentText: string;
  private chunks: TextChunk[];
  private hasRun = false;

  // Results
  private comments: Comment[] = [];
  private summary: string = "";
  private analysis: string = "";
  private llmInteractions: LLMInteraction[] = [];
  private totalCost: number = 0;

  // Internal state
  private forecastingClaims: ForecastData[] = []; // Claims extracted from the document
  private ourForecasts: Map<string, any> = new Map(); // Our own probability estimates
  private promptBuilder = new ForecastPromptBuilder();
  private analyzer = new ForecastAnalyzer();

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

  /**
   * Main analysis method - runs all LLM calls and generates results
   */
  public async analyze(): Promise<AnalysisResult> {
    if (this.hasRun) {
      return this.getResults();
    }

    logger.info("ForecastAnalyzer: Starting analysis");

    // Step 1: Extract forecasting claims from all chunks
    await this.extractForecastingClaims();

    // Step 2: Generate our own probability estimates for key forecasting claims
    await this.generateOurForecasts();

    // Step 3: Create comments for all findings
    this.createComments();

    // Step 4: Generate analysis summary
    this.generateAnalysis();

    this.hasRun = true;
    logger.info(
      `ForecastAnalyzer: Analysis complete - ${this.comments.length} comments generated`
    );

    return this.getResults();
  }

  /**
   * Get the analysis results
   */
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

  /**
   * Extract forecasting claims from all chunks using the extract-forecasting-claims tool
   */
  private async extractForecastingClaims(): Promise<void> {
    logger.debug(
      `ForecastAnalyzer: Extracting from ${this.chunks.length} chunks`
    );

    for (const chunk of this.chunks) {
      try {
        // Use the extract-forecasting-claims tool
        const result = await extractForecastingClaimsTool.execute(
          {
            text: chunk.text,
            additionalContext: chunk.id ? `Chunk ID: ${chunk.id}` : undefined,
            maxDetailedAnalysis: 10,
            minQualityThreshold: 50, // Only get forecasts with average score >= 50
          },
          {
            logger: logger,
          }
        );

        // Track the interactions
        if (result.llmInteractions) {
          // Convert RichLLMInteraction to LLMInteraction format
          const convertedInteractions = this.convertRichToLLMInteractions(
            result.llmInteractions
          );
          this.llmInteractions.push(...convertedInteractions);

          // Calculate total cost from token usage
          const cost = result.llmInteractions.reduce((sum, interaction) => {
            // Estimate cost based on tokens (rough estimate: $0.003 per 1K input, $0.015 per 1K output for Sonnet)
            const inputCost = (interaction.tokensUsed.prompt / 1000) * 0.003;
            const outputCost =
              (interaction.tokensUsed.completion / 1000) * 0.015;
            return sum + inputCost + outputCost;
          }, 0);
          this.totalCost += cost;
        }

        // Process extracted forecasting claims
        for (const forecastingClaim of result.forecasts) {
          this.forecastingClaims.push({
            originalText: forecastingClaim.originalText,
            rewrittenText: forecastingClaim.rewrittenPredictionText,
            timeframe: forecastingClaim.resolutionDate,
            probability: forecastingClaim.statedProbability,
            topic: this.extractTopicFromForecast(forecastingClaim),
            reasoning: forecastingClaim.thinking,
            predictionPrecisionScore: forecastingClaim.predictionPrecisionScore,
            verifiabilityScore: forecastingClaim.verifiabilityScore,
            importanceScore: forecastingClaim.importanceScore,
            isFuture: forecastingClaim.isFuture,
            chunkId: chunk.id,
            chunkText: chunk.text,
          });
        }
      } catch (error) {
        logger.error(
          `Failed to extract forecasts from chunk ${chunk.id}:`,
          error
        );
      }
    }

    logger.debug(
      `ForecastAnalyzer: Extracted ${this.forecastingClaims.length} forecasting claims from document`
    );
  }

  /**
   * Generate our own probability estimates for the most important forecasting claims
   */
  private async generateOurForecasts(): Promise<void> {
    // Filter and sort forecasting claims by importance and verifiability
    const highQualityClaims = this.forecastingClaims
      .filter((f) => f.isFuture && f.verifiabilityScore > 50)
      .sort((a, b) => {
        // Sort by combined score of importance and verifiability
        const scoreA = (a.importanceScore + a.verifiabilityScore) / 2;
        const scoreB = (b.importanceScore + b.verifiabilityScore) / 2;
        return scoreB - scoreA;
      })
      .slice(0, 5); // Take top 5

    logger.debug(
      `ForecastAnalyzer: Generating our probability estimates for ${highQualityClaims.length} claims`
    );

    for (const forecastClaim of highQualityClaims) {
      // Use the rewritten text for clearer forecasting
      const question = this.promptBuilder.convertToForecastQuestion(
        forecastClaim.rewrittenText,
        forecastClaim.timeframe
      );

      // Convert to ForecastFindingData format for the analyzer
      const findingData = {
        predictionText: forecastClaim.originalText,
        timeframe: forecastClaim.timeframe,
        probability: forecastClaim.probability,
        topic: forecastClaim.topic,
        context: forecastClaim.reasoning,
      };

      const context = this.promptBuilder.buildForecastContext(findingData);

      const forecast = await this.analyzer.generateForecast(
        findingData,
        question,
        context
      );

      if (forecast) {
        // Track LLM interactions
        forecast.llmInteractions.forEach((interaction) => {
          this.llmInteractions.push(interaction);
        });

        // Store our forecast keyed by original text
        this.ourForecasts.set(forecastClaim.originalText, forecast);
      }
    }
  }

  /**
   * Create comments from forecasts and disagreements
   */
  private createComments(): void {
    const tempComments: ForecastComment[] = [];

    // Create comments for all forecasting claims found in the document
    for (const forecastClaim of this.forecastingClaims) {
      // First find location within the chunk
      const chunkLocation = findForecastLocation(
        forecastClaim.originalText,
        forecastClaim.chunkText,
        {
          allowPartialMatch: true,
          normalizeQuotes: true,
        }
      );

      if (chunkLocation) {
        // Get the chunk's position in the document
        const chunk = this.chunks.find((c) => c.id === forecastClaim.chunkId);
        if (!chunk || !chunk.metadata?.position) {
          logger.warn(
            `Could not find chunk position for forecast: ${forecastClaim.originalText}`
          );
          continue;
        }

        // Convert chunk-relative position to document-relative position
        const documentLocation = {
          startOffset:
            chunk.metadata.position.start + chunkLocation.startOffset,
          endOffset: chunk.metadata.position.start + chunkLocation.endOffset,
          quotedText: chunkLocation.quotedText,
        };

        const severity = this.determineSeverity(forecastClaim);
        const message = this.createForecastMessage(forecastClaim);

        tempComments.push({
          id: generateFindingId("FORECAST", "forecast"),
          text: message,
          highlightText: documentLocation.quotedText,
          startOffset: documentLocation.startOffset,
          endOffset: documentLocation.endOffset,
          severity,
          type: "forecast",
          importance: severity === "high" ? 8 : severity === "medium" ? 5 : 3,
        });
      }
    }

    // Create comments for disagreements
    for (const [originalText, ourForecast] of this.ourForecasts) {
      const originalForecast = this.forecastingClaims.find(
        (f) => f.originalText === originalText
      );
      if (!originalForecast || !originalForecast.probability) continue;

      // Convert to ForecastFindingData format
      const findingData = {
        predictionText: originalForecast.originalText,
        timeframe: originalForecast.timeframe,
        probability: originalForecast.probability,
        topic: originalForecast.topic,
      };

      const comparison = this.analyzer.createComparisonData(
        findingData,
        ourForecast
      );

      if (!comparison.agreesWithAuthor) {
        // Find location within the chunk first
        const chunkLocation = findForecastLocation(
          originalText,
          originalForecast.chunkText,
          {
            allowPartialMatch: true,
            normalizeQuotes: true,
          }
        );

        if (chunkLocation) {
          // Get the chunk's position in the document
          const chunk = this.chunks.find(
            (c) => c.id === originalForecast.chunkId
          );
          if (!chunk || !chunk.metadata?.position) {
            logger.warn(
              `Could not find chunk position for disagreement: ${originalText}`
            );
            continue;
          }

          // Convert chunk-relative position to document-relative position
          const documentLocation = {
            startOffset:
              chunk.metadata.position.start + chunkLocation.startOffset,
            endOffset: chunk.metadata.position.start + chunkLocation.endOffset,
            quotedText: chunkLocation.quotedText,
          };

          const message = this.createDisagreementMessage(comparison);

          tempComments.push({
            id: generateFindingId("FORECAST", "disagreement"),
            text: message,
            highlightText: documentLocation.quotedText,
            startOffset: documentLocation.startOffset,
            endOffset: documentLocation.endOffset,
            severity: "high",
            type: "forecast_disagreement",
            importance: 8,
          });
        }
      }
    }

    // Convert to Comment format
    this.comments = tempComments.map((tc) => ({
      description: tc.text,
      isValid: true,
      highlight: {
        startOffset: tc.startOffset,
        endOffset: tc.endOffset,
        quotedText: tc.highlightText,
        isValid: true,
      },
      importance:
        tc.importance ||
        (tc.severity === "high" ? 8 : tc.severity === "medium" ? 5 : 3),
    }));

    logger.debug(`ForecastAnalyzer: Created ${this.comments.length} comments`);
  }

  /**
   * Convert RichLLMInteraction to LLMInteraction format
   */
  private convertRichToLLMInteractions(
    richInteractions: Array<any>
  ): LLMInteraction[] {
    return richInteractions.map((rich) => ({
      messages: [
        {
          role: "system" as const,
          content: rich.prompt.split("\n\n")[0] || "",
        },
        {
          role: "user" as const,
          content: rich.prompt.split("\n\n")[1] || rich.prompt,
        },
        { role: "assistant" as const, content: rich.response },
      ],
      usage: {
        input_tokens: rich.tokensUsed.prompt,
        output_tokens: rich.tokensUsed.completion,
      },
    }));
  }

  /**
   * Extract topic from forecast - uses the rewritten text or original text
   */
  private extractTopicFromForecast(forecastingClaim: ExtractedForecast): string {
    // Try to extract topic from the rewritten question
    const rewritten = forecastingClaim.rewrittenPredictionText;
    if (
      rewritten.includes("AI") ||
      rewritten.toLowerCase().includes("artificial intelligence")
    ) {
      return "AI";
    } else if (
      rewritten.toLowerCase().includes("climate") ||
      rewritten.toLowerCase().includes("temperature")
    ) {
      return "climate";
    } else if (
      rewritten.toLowerCase().includes("economy") ||
      rewritten.toLowerCase().includes("gdp") ||
      rewritten.toLowerCase().includes("recession")
    ) {
      return "economy";
    } else if (
      rewritten.toLowerCase().includes("technology") ||
      rewritten.toLowerCase().includes("quantum")
    ) {
      return "technology";
    } else {
      return "general";
    }
  }

  /**
   * Generate analysis summary
   */
  private generateAnalysis(): void {
    const totalForecasts = this.forecastingClaims.length;
    const forecastsWithProbability = this.forecastingClaims.filter(
      (f) => f.probability !== undefined
    ).length;
    const disagreements = Array.from(this.ourForecasts.entries()).filter(
      ([originalText, forecast]) => {
        const originalForecast = this.forecastingClaims.find(
          (f) => f.originalText === originalText
        );
        if (!originalForecast) return false;

        const findingData = {
          predictionText: originalForecast.originalText,
          timeframe: originalForecast.timeframe,
          probability: originalForecast.probability,
          topic: originalForecast.topic,
        };

        return !this.analyzer.createComparisonData(findingData, forecast)
          .agreesWithAuthor;
      }
    ).length;

    // Generate summary
    if (totalForecasts === 0) {
      this.summary = "No forecasting claims found.";
    } else {
      this.summary = `Found ${totalForecasts} forecasting claim${totalForecasts !== 1 ? "s" : ""}`;
      if (forecastsWithProbability > 0) {
        this.summary += ` (${forecastsWithProbability} with explicit probabilities)`;
      }
      if (disagreements > 0) {
        this.summary += `. We disagree with ${disagreements} claim${disagreements !== 1 ? "s" : ""}.`;
      }
    }

    // Generate detailed analysis
    let analysisText = `## Forecast Analysis\n\n`;

    if (totalForecasts === 0) {
      analysisText +=
        "No predictions or forecasts were identified in this document.\n";
    } else {
      analysisText += `### Summary\n`;
      analysisText += `- Total predictions found: ${totalForecasts}\n`;
      analysisText += `- Predictions with explicit probabilities: ${forecastsWithProbability}\n`;
      analysisText += `- Predictions we analyzed in detail: ${this.ourForecasts.size}\n`;

      if (disagreements > 0) {
        analysisText += `- Predictions where we disagree: ${disagreements}\n`;
      }

      // Quality analysis
      const avgImportance =
        this.forecastingClaims.reduce((sum, f) => sum + f.importanceScore, 0) /
        totalForecasts;
      const avgVerifiability =
        this.forecastingClaims.reduce((sum, f) => sum + f.verifiabilityScore, 0) /
        totalForecasts;
      const avgPrecision =
        this.forecastingClaims.reduce((sum, f) => sum + f.predictionPrecisionScore, 0) /
        totalForecasts;

      analysisText += `\n### Quality Metrics\n`;
      analysisText += `- Average importance score: ${avgImportance.toFixed(0)}/100\n`;
      analysisText += `- Average verifiability: ${avgVerifiability.toFixed(0)}/100\n`;
      analysisText += `- Average precision: ${avgPrecision.toFixed(0)}/100\n`;

      // Group by topic
      const byTopic = new Map<string, ForecastData[]>();
      for (const forecastClaim of this.forecastingClaims) {
        const topic = forecastClaim.topic || "General";
        if (!byTopic.has(topic)) {
          byTopic.set(topic, []);
        }
        byTopic.get(topic)!.push(forecastClaim);
      }

      if (byTopic.size > 1) {
        analysisText += `\n### Predictions by Topic\n`;
        for (const [topic, forecasts] of byTopic) {
          analysisText += `- ${topic}: ${forecasts.length} prediction${forecasts.length !== 1 ? "s" : ""}\n`;
        }
      }

      // Timeframe analysis
      const timeframes = this.forecastingClaims
        .filter((f) => f.timeframe)
        .map((f) => f.timeframe!);

      if (timeframes.length > 0) {
        analysisText += `\n### Timeframe Distribution\n`;
        const timeframeGroups = this.groupTimeframes(timeframes);
        for (const [group, count] of Object.entries(timeframeGroups)) {
          analysisText += `- ${group}: ${count} prediction${count !== 1 ? "s" : ""}\n`;
        }
      }
    }

    this.analysis = analysisText;
  }

  /**
   * Helper methods
   */
  private determineSeverity(forecastClaim: ForecastData): "low" | "medium" | "high" {
    // Use importance score as primary factor
    if (forecastClaim.importanceScore >= 80) {
      return "high";
    } else if (forecastClaim.importanceScore >= 50) {
      return "medium";
    }

    // Also consider if it has a strong probability claim
    if (forecastClaim.probability !== undefined) {
      if (forecastClaim.probability >= 80 || forecastClaim.probability <= 20) {
        return "high";
      }
    }

    return "low";
  }

  private createForecastMessage(forecastClaim: ForecastData): string {
    // Use the cleaner rewritten text in the message
    let message = `Forecast: "${forecastClaim.rewrittenText}"`;

    if (forecastClaim.timeframe) {
      message += ` (${forecastClaim.timeframe})`;
    }

    if (forecastClaim.probability !== undefined) {
      message += ` - ${forecastClaim.probability}% probability`;
    }

    // Add quality indicators
    const scores = [];
    if (forecastClaim.importanceScore >= 70) {
      scores.push("important");
    }
    if (forecastClaim.verifiabilityScore >= 70) {
      scores.push("verifiable");
    }
    if (forecastClaim.predictionPrecisionScore >= 70) {
      scores.push("precise");
    }

    if (scores.length > 0) {
      message += ` [${scores.join(", ")}]`;
    }

    return message;
  }

  private createDisagreementMessage(comparison: any): string {
    const diff = Math.abs(
      (comparison.authorProbability - comparison.ourProbability) * 100
    );
    return (
      `We disagree with this prediction. Author: ${(comparison.authorProbability * 100).toFixed(0)}%, ` +
      `Our estimate: ${(comparison.ourProbability * 100).toFixed(0)}% ` +
      `(${diff.toFixed(0)} percentage point difference). ` +
      `${comparison.disagreementReason}`
    );
  }

  private groupTimeframes(timeframes: string[]): Record<string, number> {
    const groups: Record<string, number> = {
      "Near-term (< 2 years)": 0,
      "Medium-term (2-5 years)": 0,
      "Long-term (5-10 years)": 0,
      "Far future (> 10 years)": 0,
      Unspecified: 0,
    };

    // Simple grouping logic - would be more sophisticated in production
    for (const timeframe of timeframes) {
      if (timeframe.match(/months?|year|2024|2025/i)) {
        groups["Near-term (< 2 years)"]++;
      } else if (timeframe.match(/202[6-9]|2-5 years/i)) {
        groups["Medium-term (2-5 years)"]++;
      } else if (timeframe.match(/203\d|5-10 years/i)) {
        groups["Long-term (5-10 years)"]++;
      } else if (timeframe.match(/20[4-9]\d|century/i)) {
        groups["Far future (> 10 years)"]++;
      } else {
        groups["Unspecified"]++;
      }
    }

    return groups;
  }

  /**
   * Debug information for testing
   */
  public getDebugInfo(): Record<string, unknown> {
    return {
      hasRun: this.hasRun,
      forecastsCount: this.forecastingClaims.length,
      ourPredictionsCount: this.ourForecasts.size,
      commentsCount: this.comments.length,
      totalCost: this.totalCost,
      llmInteractionsCount: this.llmInteractions.length,
    };
  }
}

// Export the plugin wrapper for backward compatibility
export { ForecastPlugin } from "./plugin-wrapper";
