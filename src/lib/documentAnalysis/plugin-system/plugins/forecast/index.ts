/**
 * Forecast Plugin
 * 
 * Analyzes documents for predictions and forecasts, generates our own forecasts,
 * and identifies disagreements between author predictions and our analysis.
 */

import type { Comment } from "@/types/documentSchema";

import { logger } from "../../../../logger";
import { BasePlugin } from "../../core/BasePlugin";
import { TextChunk } from "../../TextChunk";
import {
  RoutingExample,
  SimpleAnalysisPlugin,
  AnalysisResult,
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

export class ForecastPlugin extends BasePlugin<{}> implements SimpleAnalysisPlugin {
  private findings: ForecastFindingStorage = {
    potential: [],
    investigated: [],
    located: [],
  };
  private analysisInteractions: LLMInteraction[] = [];
  private promptBuilder = new ForecastPromptBuilder();
  private analyzer = new ForecastAnalyzer();

  constructor() {
    super({});
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

  /**
   * Main analysis method - processes all chunks and returns complete results
   */
  async analyze(chunks: TextChunk[], documentText: string): Promise<AnalysisResult> {
    // Clear any previous state
    this.clearState();
    
    // Stage 1: Extract predictions from all chunks
    for (const chunk of chunks) {
      await this.extractPredictions(chunk);
    }
    
    // Stage 2: Investigate findings (add severity/messages)
    this.investigateFindings();
    
    // Stage 3: Locate findings in document
    this.locateFindings(documentText);
    
    // Stage 4: Generate our own forecasts for key predictions
    await this.generateForecasts();
    
    // Stage 5: Analyze patterns
    this.analyzeFindingPatterns();
    
    // Stage 6: Generate comments
    const comments = this.getComments(documentText);
    
    return {
      summary: this.findings.summary || "",
      analysis: this.findings.analysisSummary || "",
      comments,
      llmInteractions: this.analysisInteractions,
      cost: this.getTotalCost()
    };
  }

  getCost(): number {
    return this.getTotalCost();
  }

  /**
   * Get debug information for testing and introspection
   */
  getDebugInfo() {
    return {
      findings: this.findings,
      stats: {
        potentialCount: this.findings.potential.length,
        investigatedCount: this.findings.investigated.length,
        locatedCount: this.findings.located.length,
        predictions: this.findings.potential.filter(f => f.type === "forecast").length,
        disagreements: this.findings.potential.filter(f => f.type === "forecast_disagreement").length,
      }
    };
  }

  /**
   * Extract predictions from a text chunk
   */
  private async extractPredictions(chunk: TextChunk): Promise<void> {
    const extraction = await extractWithTool<{
      items: ForecastExtractionResult[];
    }>(chunk, {
      ...getForecastExtractionConfig(this.name()),
      extractionPrompt: this.promptBuilder.buildExtractionPrompt(chunk)
    });
    
    // Track the interaction and cost
    this.analysisInteractions.push(extraction.interaction);
    this.totalCost += extraction.cost;

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
   */
  private investigateFindings(): void {
    this.findings.investigated = ForecastHelpers.investigateForecastFindings(
      this.findings.potential
    ) as ForecastInvestigatedFinding[];
  }

  /**
   * Locate findings in document text
   */
  private locateFindings(documentText: string): void {
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
        this.analysisInteractions.push(...forecast.llmInteractions);

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
  private analyzeFindingPatterns(): void {
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
  private getComments(documentText: string): Comment[] {
    const comments = generateCommentsFromFindings(this.findings.located, documentText);
    logger.info(`ForecastPlugin: Generated ${comments.length} comments from ${this.findings.located.length} located findings`);
    return comments;
  }

  /**
   * Helper methods
   */
  private getLineNumberAtPosition(text: string, position: number): number {
    return text.slice(0, position).split('\n').length;
  }

  private getLineAtPosition(text: string, position: number): string {
    const lines = text.split('\n');
    const lineNumber = this.getLineNumberAtPosition(text, position);
    return lines[lineNumber - 1] || '';
  }

  protected createInitialState(): {} {
    return {};
  }

  // Required by BasePlugin but not used in new API
  async processChunk(_chunk: TextChunk): Promise<{ findings?: never[]; llmCalls: never[] }> {
    throw new Error("Use analyze() method instead of processChunk()");
  }

  async synthesize(): Promise<{ summary: string; analysisSummary: string; llmCalls: never[] }> {
    throw new Error("Use analyze() method instead of synthesize()");
  }

  override clearState(): void {
    super.clearState();
    this.findings = {
      potential: [],
      investigated: [],
      located: [],
    };
    this.analysisInteractions = [];
  }
}