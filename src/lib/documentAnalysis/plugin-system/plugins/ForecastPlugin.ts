/**
 * Forecasting plugin - finds predictions and can generate its own forecasts
 */

import { BasePlugin } from '../BasePlugin';
import { ChunkResult, SynthesisResult, Finding, RoutingExample } from '../types';
import { TextChunk } from '../TextChunk';
import Anthropic from '@anthropic-ai/sdk';
import { ANALYSIS_MODEL } from '../../../../types/openai';
import forecasterTool from '../../../../tools/forecaster/index';
import { logger } from '../../../../lib/logger';

interface ForecastState {
  predictions: Array<{
    id: string;
    text: string;
    chunkId: string;
    context: string;
    timeframe?: string;
    probability?: number;
    topic: string;
    authorConfidence?: 'low' | 'medium' | 'high';
  }>;
  ourForecasts: Array<{
    predictionId: string;
    ourProbability: number;
    ourConsensus: 'low' | 'medium' | 'high';
    reasoning: string;
    agreesWithAuthor: boolean;
  }>;
}

export class ForecastPlugin extends BasePlugin<ForecastState> {
  constructor() {
    super({
      predictions: [],
      ourForecasts: []
    });
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
        chunkText: "We expect AI capabilities to improve significantly over the next 5 years",
        shouldProcess: true,
        reason: "Contains future prediction with timeframe"
      },
      {
        chunkText: "The company's revenue was $100M last year",
        shouldProcess: false,
        reason: "Historical fact, not a prediction"
      },
      {
        chunkText: "There's a 60% probability that quantum computers will break RSA encryption by 2035",
        shouldProcess: true,
        reason: "Explicit probability forecast with timeframe"
      }
    ];
  }

  async processChunk(chunk: TextChunk): Promise<ChunkResult> {
    const { result, interaction } = await this.trackLLMCall(
      ANALYSIS_MODEL,
      this.buildExtractionPrompt(chunk),
      () => this.extractPredictions(chunk)
    );

    const findings: Finding[] = [];

    // Store predictions
    result.predictions.forEach(pred => {
      const predId = `${chunk.id}-${this.state.predictions.length}`;
      this.state.predictions.push({
        id: predId,
        text: pred.text,
        chunkId: chunk.id,
        context: chunk.getExpandedContext(150),
        timeframe: pred.timeframe,
        probability: pred.probability,
        topic: pred.topic,
        authorConfidence: this.assessConfidence(pred, chunk)
      });

      findings.push({
        type: 'forecast',
        severity: 'info',
        message: `Prediction: ${pred.text}`,
        metadata: {
          timeframe: pred.timeframe,
          topic: pred.topic,
          probability: pred.probability
        }
      });
    });

    return {
      findings,
      llmCalls: [interaction],
      metadata: {
        tokensUsed: interaction.tokensUsed.total,
        processingTime: interaction.duration
      }
    };
  }

  async synthesize(): Promise<SynthesisResult> {
    // Select most important predictions to generate our own forecasts
    const predictionsToForecast = this.selectPredictionsForForecasting();
    
    const findings: Finding[] = [];
    const llmCalls: any[] = [];

    // Generate our own forecasts
    for (const prediction of predictionsToForecast) {
      try {
        const forecast = await forecasterTool.execute({
          question: this.convertToForecastQuestion(prediction),
          context: prediction.context,
          numForecasts: 4, // Fewer for efficiency in batch processing
          usePerplexity: false // Could enable if needed
        }, {
          userId: 'forecast-plugin',
          logger: logger
        });

        const ourForecast = {
          predictionId: prediction.id,
          ourProbability: forecast.probability,
          ourConsensus: forecast.consensus,
          reasoning: forecast.description,
          agreesWithAuthor: this.checkAgreement(prediction.probability, forecast.probability)
        };

        this.state.ourForecasts.push(ourForecast);

        // Add finding if there's significant disagreement
        if (prediction.probability && !ourForecast.agreesWithAuthor) {
          findings.push({
            type: 'forecast_disagreement',
            severity: 'medium',
            message: `Forecast disagreement on "${prediction.text}": Author says ${prediction.probability}%, our analysis suggests ${ourForecast.ourProbability}%`,
            metadata: {
              authorProbability: prediction.probability,
              ourProbability: ourForecast.ourProbability,
              reasoning: ourForecast.reasoning
            }
          });
        }

        // Track LLM calls from forecast generation
        llmCalls.push(...forecast.llmInteractions);
      } catch (error) {
        console.error(`Failed to forecast for prediction ${prediction.id}:`, error);
      }
    }

    // Analyze forecast patterns
    const analysis = this.analyzeForecastPatterns();
    
    const summary = `Found ${this.state.predictions.length} predictions. Generated forecasts for ${this.state.ourForecasts.length} key predictions. ${analysis.summary}`;

    findings.push(...analysis.findings);

    const recommendations = this.generateRecommendations(analysis);

    return {
      summary,
      findings,
      recommendations,
      llmCalls,
      visualizations: [this.createTimelineVisualization()]
    };
  }

  protected createInitialState(): ForecastState {
    return {
      predictions: [],
      ourForecasts: []
    };
  }

  private buildExtractionPrompt(chunk: TextChunk): string {
    return `Extract all predictions and forecasts about future events from this text.

Text to analyze:
${chunk.text}

For each prediction, identify:
1. The exact prediction text
2. The timeframe (if specified)
3. Any probability or confidence level
4. The topic/domain`;
  }

  private async extractPredictions(chunk: TextChunk): Promise<{
    predictions: Array<{
      text: string;
      timeframe?: string;
      probability?: number;
      topic: string;
    }>;
  }> {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    const response = await anthropic.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 1500,
      temperature: 0,
      system: "You are a prediction extraction system. Extract forecasts and predictions from text.",
      messages: [{
        role: "user",
        content: this.buildExtractionPrompt(chunk)
      }],
      tools: [{
        name: "extract_predictions",
        description: "Extract predictions and forecasts",
        input_schema: {
          type: "object",
          properties: {
            predictions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  text: { type: "string", description: "The prediction text" },
                  timeframe: { type: "string", description: "When this is predicted to happen" },
                  probability: { 
                    type: "number", 
                    minimum: 0,
                    maximum: 100,
                    description: "Probability if stated (0-100)" 
                  },
                  topic: { type: "string", description: "Topic/domain of the prediction" }
                },
                required: ["text", "topic"]
              }
            }
          },
          required: ["predictions"]
        }
      }],
      tool_choice: { type: "tool", name: "extract_predictions" }
    });

    const toolUse = response.content.find((c: any) => c.type === "tool_use") as any;
    return toolUse?.input || { predictions: [] };
  }

  private assessConfidence(prediction: any, chunk: TextChunk): 'low' | 'medium' | 'high' {
    // Simple heuristic - could be enhanced
    const text = prediction.text.toLowerCase();
    const context = chunk.text.toLowerCase();
    
    if (context.includes('certainly') || context.includes('definitely') || prediction.probability > 80) {
      return 'high';
    } else if (context.includes('might') || context.includes('possibly') || prediction.probability < 30) {
      return 'low';
    }
    return 'medium';
  }

  private selectPredictionsForForecasting(): any[] {
    // Select up to 5 most important predictions
    return this.state.predictions
      .filter(p => {
        // Filter for predictions worth forecasting
        return p.timeframe && // Has a timeframe
               p.topic !== 'generic' && // Not too vague
               (!p.probability || p.authorConfidence !== 'low'); // Not already low confidence
      })
      .sort((a, b) => {
        // Prioritize by importance
        const scoreA = this.scorePredictionImportance(a);
        const scoreB = this.scorePredictionImportance(b);
        return scoreB - scoreA;
      })
      .slice(0, 5);
  }

  private scorePredictionImportance(prediction: any): number {
    let score = 0;
    
    // Has specific probability
    if (prediction.probability) score += 2;
    
    // Near-term predictions are often more important
    if (prediction.timeframe?.includes('202') || prediction.timeframe?.includes('1 year')) {
      score += 1;
    }
    
    // High confidence predictions
    if (prediction.authorConfidence === 'high') score += 1;
    
    return score;
  }

  private convertToForecastQuestion(prediction: any): string {
    // Convert the extracted prediction into a forecasting question
    if (prediction.text.includes('?')) {
      return prediction.text;
    }
    
    // Transform statement into question
    return `Will ${prediction.text}?`;
  }

  private checkAgreement(authorProb: number | undefined, ourProb: number): boolean {
    if (!authorProb) return true; // Can't disagree if no author probability
    
    // Consider agreement if within 20 percentage points
    return Math.abs(authorProb - ourProb) <= 20;
  }

  private analyzeForecastPatterns(): {
    summary: string;
    findings: Finding[];
  } {
    const findings: Finding[] = [];
    let summary = '';

    // Analyze timeframe distribution
    const timeframes = new Map<string, number>();
    this.state.predictions.forEach(p => {
      if (p.timeframe) {
        const category = this.categorizeTimeframe(p.timeframe);
        timeframes.set(category, (timeframes.get(category) || 0) + 1);
      }
    });

    if (timeframes.size > 0) {
      const mostCommon = Array.from(timeframes.entries())
        .sort((a, b) => b[1] - a[1])[0];
      summary = `Most predictions focus on ${mostCommon[0]} timeframe.`;
    }

    // Check for overconfidence
    const highConfPredictions = this.state.predictions.filter(p => 
      p.probability && (p.probability > 90 || p.probability < 10)
    );
    
    if (highConfPredictions.length > 3) {
      findings.push({
        type: 'overconfidence',
        severity: 'medium',
        message: `${highConfPredictions.length} predictions show extreme confidence (>90% or <10%)`
      });
    }

    // Check forecast agreement
    const disagreements = this.state.ourForecasts.filter(f => !f.agreesWithAuthor);
    if (disagreements.length > 0) {
      summary += ` We disagree with ${disagreements.length} author predictions.`;
    }

    return { summary, findings };
  }

  private categorizeTimeframe(timeframe: string): string {
    const lower = timeframe.toLowerCase();
    if (lower.includes('week') || lower.includes('month')) return 'short-term';
    if (lower.includes('year') && !lower.includes('years')) return 'medium-term';
    if (lower.includes('decade') || lower.includes('years')) return 'long-term';
    return 'unspecified';
  }

  private createTimelineVisualization(): any {
    // Placeholder for timeline visualization data
    // In production, this would create actual visualization data
    return {
      type: 'timeline',
      predictions: this.state.predictions.map(p => ({
        text: p.text.slice(0, 50) + '...',
        timeframe: p.timeframe,
        probability: p.probability
      }))
    };
  }

  private generateRecommendations(analysis: any): string[] {
    const recommendations: string[] = [];

    const disagreements = this.state.ourForecasts.filter(f => !f.agreesWithAuthor);
    if (disagreements.length > 2) {
      recommendations.push('Review predictions with significant forecast disagreements');
    }

    const vagueTimeframes = this.state.predictions.filter(p => !p.timeframe).length;
    if (vagueTimeframes > 5) {
      recommendations.push('Add specific timeframes to predictions for clarity');
    }

    const noProbability = this.state.predictions.filter(p => !p.probability).length;
    if (noProbability > 5) {
      recommendations.push('Consider adding probability estimates to predictions');
    }

    return recommendations;
  }
}