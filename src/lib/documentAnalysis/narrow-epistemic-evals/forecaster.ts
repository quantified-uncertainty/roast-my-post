/**
 * Forecasting module for finding and generating forecasts
 * Uses multiple Claude calls to generate robust predictions
 */

import Anthropic from '@anthropic-ai/sdk';
import { ANALYSIS_MODEL } from '../../../types/openai';

export interface ForecastingQuestion {
  question: string;
  context?: string;
  timeframe?: string;
  numForecasts?: number; // Number of forecasts to generate (default: 6)
  usePerplexity?: boolean; // Whether to use Perplexity for research
}

export interface ForecastResponse {
  probability: number; // 0-100
  reasoning: string;
  confidence: 'low' | 'medium' | 'high';
  key_factors: string[];
}

export interface AggregatedForecast {
  forecast: {
    probability: number;
    confidence: 'low' | 'medium' | 'high';
    description: string;
  };
  individual_forecasts: ForecastResponse[];
  outliers_removed: ForecastResponse[];
  statistics: {
    mean: number;
    median: number;
    std_dev: number;
    range: [number, number];
  };
}

export interface ExtractedForecast {
  text: string;
  probability?: number;
  timeframe?: string;
  topic: string;
}

/**
 * Extract forecast-like statements from text
 */
export async function extractForecasts(text: string): Promise<ExtractedForecast[]> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  const response = await anthropic.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 1000,
    temperature: 0,
    system: `Extract any forecast-like statements from the text. Look for:
- Predictions about future events
- Probability estimates
- Statements about what "will", "might", "could", or "should" happen
- Time-bounded predictions
- Trend extrapolations`,
    messages: [{
      role: "user",
      content: `Extract forecasts from this text:\n\n${text}`
    }],
    tools: [{
      name: "extract_forecasts",
      description: "Extract forecast statements from text",
      input_schema: {
        type: "object",
        properties: {
          forecasts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string", description: "The forecast statement" },
                probability: { type: "number", description: "Probability if stated (0-100)" },
                timeframe: { type: "string", description: "Time period if mentioned" },
                topic: { type: "string", description: "What the forecast is about" }
              },
              required: ["text", "topic"]
            }
          }
        },
        required: ["forecasts"]
      }
    }],
    tool_choice: { type: "tool", name: "extract_forecasts" }
  });

  const toolUse = response.content.find((c: any) => c.type === "tool_use") as any;
  return toolUse?.input?.forecasts || [];
}

/**
 * Generate a single forecast for a question
 */
async function generateSingleForecast(question: ForecastingQuestion, callNumber: number): Promise<ForecastResponse> {
  // Add timestamp and random seed to prevent caching
  const timestamp = Date.now();
  const randomSeed = Math.random();
  
  // Random prefix to break cache patterns
  const randomPrefixes = [
    "Let me think about this.",
    "Considering the question,",
    "Analyzing the scenario,",
    "Looking at this forecast,",
    "Evaluating the probability,",
    "Assessing this question,"
  ];
  const prefix = randomPrefixes[Math.floor(Math.random() * randomPrefixes.length)];
  
  const systemPrompt = `You are a careful forecaster. Given a question about a future event, provide:
1. A probability estimate (0-100% with one decimal place, e.g., 65.2%)
2. Clear reasoning for your estimate
3. Key factors that influence your forecast
4. Your confidence level in this forecast

Consider base rates, current evidence, and uncertainties. Think step by step.
Important: Give a precise probability with one decimal place (e.g., 37.5%, not 38%).

[Session: ${timestamp}-${randomSeed}-${callNumber}]`;

  const userPrompt = `${prefix} ${Math.random() < 0.5 ? 'Please forecast: ' : 'What is the probability that '}${question.question}
${question.context ? `\nContext: ${question.context}` : ''}
${question.timeframe ? `\nTimeframe: ${question.timeframe}` : ''}

Think carefully and provide your forecast. Random seed: ${Math.random()}`;

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  const response = await anthropic.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 1500,
    temperature: 0.8, // Increased for more variation
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    tools: [{
      name: "provide_forecast",
      description: "Provide a probability forecast with reasoning",
      input_schema: {
        type: "object",
        properties: {
          probability: {
            type: "number",
            minimum: 0,
            maximum: 100,
            description: "Probability estimate (0-100 with one decimal place, e.g. 65.2)"
          },
          reasoning: {
            type: "string",
            description: "Detailed reasoning for the forecast"
          },
          confidence: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Confidence in the forecast"
          },
          key_factors: {
            type: "array",
            items: { type: "string" },
            description: "Key factors influencing the forecast"
          }
        },
        required: ["probability", "reasoning", "confidence", "key_factors"]
      }
    }],
    tool_choice: { type: "tool", name: "provide_forecast" }
  });

  const toolUse = response.content.find((c: any) => c.type === "tool_use") as any;
  if (!toolUse?.input) {
    throw new Error("No forecast generated");
  }
  
  return toolUse.input;
}

/**
 * Calculate statistics for a set of probability values
 */
function calculateStatistics(probabilities: number[]): {
  mean: number;
  median: number;
  std_dev: number;
  range: [number, number];
} {
  const sorted = [...probabilities].sort((a, b) => a - b);
  const mean = probabilities.reduce((a, b) => a + b, 0) / probabilities.length;
  
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  
  const variance = probabilities.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / probabilities.length;
  const std_dev = Math.sqrt(variance);
  
  return {
    mean: Math.round(mean * 10) / 10,
    median: Math.round(median * 10) / 10,
    std_dev: Math.round(std_dev * 10) / 10,
    range: [sorted[0], sorted[sorted.length - 1]]
  };
}

/**
 * Remove outliers using IQR method
 */
function removeOutliers(forecasts: ForecastResponse[]): {
  cleaned: ForecastResponse[];
  outliers: ForecastResponse[];
} {
  const probabilities = forecasts.map(f => f.probability);
  const sorted = [...probabilities].sort((a, b) => a - b);
  
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  const cleaned: ForecastResponse[] = [];
  const outliers: ForecastResponse[] = [];
  
  forecasts.forEach(forecast => {
    if (forecast.probability >= lowerBound && forecast.probability <= upperBound) {
      cleaned.push(forecast);
    } else {
      outliers.push(forecast);
    }
  });
  
  return { cleaned, outliers };
}

/**
 * Determine overall confidence based on individual confidences and agreement
 */
function determineOverallConfidence(
  forecasts: ForecastResponse[],
  std_dev: number
): 'low' | 'medium' | 'high' {
  const confidenceScores = {
    'low': 1,
    'medium': 2,
    'high': 3
  };
  
  const avgConfidence = forecasts.reduce((sum, f) => sum + confidenceScores[f.confidence], 0) / forecasts.length;
  
  // High disagreement (std dev > 15) lowers confidence
  if (std_dev > 15) {
    return 'low';
  } else if (std_dev > 10 || avgConfidence < 2) {
    return 'medium';
  } else {
    return 'high';
  }
}

/**
 * Generate aggregated description of the forecast
 */
function generateDescription(
  question: string,
  probability: number,
  forecasts: ForecastResponse[],
  confidence: 'low' | 'medium' | 'high'
): string {
  const keyFactors = new Set<string>();
  forecasts.forEach(f => f.key_factors.forEach(factor => keyFactors.add(factor)));
  
  const topFactors = Array.from(keyFactors).slice(0, 3);
  
  let description = `Based on ${forecasts.length} independent analyses, the estimated probability is ${probability}%. `;
  
  if (confidence === 'high') {
    description += "There is strong agreement among the forecasts. ";
  } else if (confidence === 'low') {
    description += "There is significant disagreement among the forecasts. ";
  }
  
  if (topFactors.length > 0) {
    description += `Key factors include: ${topFactors.join(', ')}.`;
  }
  
  return description;
}

/**
 * Main function: Generate forecast with multiple Claude calls
 */
export async function generateForecast(question: ForecastingQuestion): Promise<AggregatedForecast> {
  const numForecasts = question.numForecasts || 6;
  
  console.log(`\n🔮 Generating forecast for: ${question.question}`);
  console.log(`Making ${numForecasts} independent forecasts${question.usePerplexity ? ' (with Perplexity research)' : ''}...\n`);
  
  // If using Perplexity, enhance context with research
  let enhancedQuestion = question;
  if (question.usePerplexity) {
    try {
      console.log('  📚 Researching with Perplexity...');
      // Dynamic import to avoid circular dependencies
      const { getPerplexityClient } = await import('../../perplexity/client');
      const client = getPerplexityClient();
      
      const additionalContext = await client.getForecastingContext(
        question.question,
        question.context
      );
      
      enhancedQuestion = {
        ...question,
        context: question.context 
          ? `${question.context}\n\nAdditional research:\n${additionalContext}`
          : `Research findings:\n${additionalContext}`
      };
      
      console.log('  ✓ Perplexity research completed');
    } catch (error) {
      console.error('  ✗ Perplexity research failed:', error);
      // Continue without enhanced context
    }
  }
  
  // Generate forecasts in parallel
  console.log(`  🚀 Launching ${numForecasts} parallel forecasts...`);
  const forecastPromises = Array.from({ length: numForecasts }, (_, i) => 
    generateSingleForecast(enhancedQuestion, i)
      .then(forecast => {
        console.log(`     ✓ Forecast ${i + 1}: ${forecast.probability.toFixed(1)}% (${forecast.confidence} confidence)`);
        return forecast;
      })
      .catch(error => {
        console.error(`     ✗ Forecast ${i + 1} failed: ${error}`);
        return null;
      })
  );
  
  const results = await Promise.all(forecastPromises);
  const forecasts = results.filter((f): f is ForecastResponse => f !== null);
  
  if (forecasts.length < Math.min(3, numForecasts)) {
    throw new Error(`Too few successful forecasts generated (${forecasts.length}/${numForecasts})`);
  }
  
  // Remove outliers
  const { cleaned, outliers } = removeOutliers(forecasts);
  
  if (outliers.length > 0) {
    console.log(`\n  Removed ${outliers.length} outlier(s):`);
    outliers.forEach(o => console.log(`    - ${o.probability}%`));
  }
  
  // Calculate statistics on cleaned data
  const cleanedProbabilities = cleaned.map(f => f.probability);
  const stats = calculateStatistics(cleanedProbabilities);
  
  // Determine overall confidence
  const overallConfidence = determineOverallConfidence(cleaned, stats.std_dev);
  
  // Generate description
  const description = generateDescription(
    question.question,
    stats.mean,
    cleaned,
    overallConfidence
  );
  
  console.log(`\n  Final forecast: ${stats.mean.toFixed(1)}% (${overallConfidence} confidence)`);
  
  return {
    forecast: {
      probability: stats.mean,
      confidence: overallConfidence,
      description
    },
    individual_forecasts: forecasts,
    outliers_removed: outliers,
    statistics: stats
  };
}

/**
 * Clean function for simple forecast generation
 */
export async function getForecast(
  question: string,
  context?: string,
  timeframe?: string
): Promise<{ probability: number; description: string }> {
  const result = await generateForecast({ question, context, timeframe });
  return {
    probability: result.forecast.probability,
    description: result.forecast.description
  };
}