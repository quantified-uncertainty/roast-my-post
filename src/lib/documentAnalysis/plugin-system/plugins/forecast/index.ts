/**
 * Forecast Plugin
 * 
 * Analyzes documents for predictions and forecasts, generates our own forecasts,
 * and identifies disagreements between author predictions and our analysis.
 */

import type { Comment } from "@/types/documentSchema";

import { logger } from "../../../../logger";
import { PipelinePlugin } from "../../core/PipelinePlugin";
import { TextChunk } from "../../TextChunk";
import {
  RoutingExample,
  LLMInteraction,
} from "../../types";
import { extractWithTool } from "../../utils/extractionHelper";
import {
  ForecastHelpers,
  generateCommentsFromFindings,
  type GenericLocatedFinding,
} from "../../utils/pluginHelpers";
import { generateFindingId } from "../../utils/findingHelpers";
import { findForecastLocation } from "./locationFinder";
import { ForecastPromptBuilder } from "./promptBuilder";
import { ForecastAnalyzer } from "./forecastAnalyzer";
import {
  getForecastExtractionConfig,
  type ForecastExtractionResult,
  type ForecastFindingStorage,
  type ForecastPotentialFinding,
  type ForecastInvestigatedFinding,
  type ForecastLocatedFinding,
} from "./types";

export class ForecastPlugin extends PipelinePlugin<ForecastFindingStorage> {
  private promptBuilder = new ForecastPromptBuilder();
  private analyzer = new ForecastAnalyzer();

  constructor() {
    super();
  }

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

  override routingExamples(): RoutingExample[] {
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

  protected createInitialFindingStorage(): ForecastFindingStorage {
    return {
      potential: [],
      investigated: [],
      located: [],
    };
  }

  /**
   * Extract predictions from a text chunk
   */
  protected async extractFromChunk(chunk: TextChunk): Promise<void> {
    const extraction = await extractWithTool<{
      items: ForecastExtractionResult[];
    }>(chunk, {
      ...getForecastExtractionConfig(this.name()),
      extractionPrompt: this.promptBuilder.buildExtractionPrompt(chunk)
    });
    
    // Track the interaction and cost using parent method
    if (extraction.interaction) {
      this.analysisInteractions.push(extraction.interaction);
    }
    if (extraction.cost) {
      this.totalCost += extraction.cost;
    }

    // Convert to findings
    const newFindings = ForecastHelpers.convertForecastResults(
      extraction.result.items || [],
      chunk.id,
      this.name(),
      (text, prob, ctx) => this.analyzer.assessAuthorConfidence(text, prob, ctx)
    );

    // Add to our storage
    this.findings.potential.push(...newFindings as ForecastPotentialFinding[]);
  }

  /**
   * Investigate findings and add severity/messages
   * Note: Forecast plugin has a custom investigate stage that includes forecast generation
   */
  protected async investigateFindings(): Promise<void> {
    // First, basic investigation
    this.findings.investigated = ForecastHelpers.investigateForecastFindings(
      this.findings.potential
    ) as ForecastInvestigatedFinding[];
    
    // Then generate our own forecasts for key predictions
    await this.generateForecasts();
  }

  /**
   * Locate findings in document text
   */
  protected locateFindings(documentText: string): void {
    // Use custom location function for forecasts
    const located: GenericLocatedFinding[] = [];
    let dropped = 0;

    for (const finding of this.findings.investigated) {
      const searchText = finding.highlightHint.searchText;
      const location = findForecastLocation(searchText, documentText, {
        allowPartialMatch: true,
        normalizeQuotes: true
      });

      if (location) {
        located.push({
          ...finding,
          locationHint: {
            lineNumber: this.getLineNumberAtPosition(documentText, location.startOffset),
            lineText: this.getLineAtPosition(documentText, location.startOffset),
            matchText: location.quotedText,
          },
          highlight: location
        });
      } else {
        dropped++;
      }
    }

    this.findings.located = located as ForecastLocatedFinding[];

    if (dropped > 0) {
      logger.info(`ForecastPlugin: ${dropped} findings couldn't be located`);
    }
  }

  /**
   * Generate our own forecasts for key predictions
   */
  private async generateForecasts(): Promise<void> {
    // Get predictions that are worth forecasting
    const predictionsToForecast = this.analyzer.selectPredictionsForForecasting(
      this.findings.potential
        .filter(f => f.type === "forecast")
        .map(f => f.data),
      5 // Maximum 5 forecasts to keep costs reasonable
    );

    for (const prediction of predictionsToForecast) {
      const question = this.promptBuilder.convertToForecastQuestion(
        prediction.predictionText,
        prediction.timeframe
      );
      const context = this.promptBuilder.buildForecastContext(prediction);

      const forecast = await this.analyzer.generateForecast(
        prediction,
        question,
        context
      );

      if (forecast) {
        // Track LLM interactions from the forecaster tool
        forecast.llmInteractions.forEach(interaction => {
          this.analysisInteractions.push(interaction);
        });

        // Create comparison finding
        const comparisonData = this.analyzer.createComparisonData(prediction, forecast);
        
        // Only create a finding if there's disagreement
        if (!comparisonData.agreesWithAuthor && prediction.probability) {
          const comparisonFinding: ForecastPotentialFinding = {
            id: generateFindingId(this.name(), "forecast-disagreement"),
            type: "forecast_disagreement",
            data: comparisonData,
            highlightHint: {
              searchText: prediction.predictionText,
              chunkId: "", // Will be filled from original finding
              lineNumber: undefined
            }
          };

          // Find the original finding to get chunk ID
          const originalFinding = this.findings.potential.find(
            f => f.type === "forecast" && f.data.predictionText === prediction.predictionText
          );
          if (originalFinding) {
            comparisonFinding.highlightHint.chunkId = originalFinding.highlightHint.chunkId;
          }

          this.findings.potential.push(comparisonFinding);
        }
      }
    }

    // Re-investigate to include new comparison findings
    if (predictionsToForecast.length > 0) {
      this.investigateFindings();
      // Don't re-locate as we want to keep original locations
    }
  }

  /**
   * Analyze findings and generate summary
   */
  protected analyzeFindingPatterns(): void {
    const analysis = ForecastHelpers.analyzeForecastFindings(
      this.findings.potential,
      this.findings.potential.filter(f => f.type === "forecast_disagreement")
    );

    this.findings.summary = analysis.summary;
    this.findings.analysisSummary = analysis.analysisSummary;
  }

  /**
   * Generate UI comments from located findings
   */
  protected generateCommentsFromFindings(documentText: string): Comment[] {
    const comments = generateCommentsFromFindings(this.findings.located, documentText);
    logger.info(`ForecastPlugin: Generated ${comments.length} comments from ${this.findings.located.length} located findings`);
    return comments;
  }

}