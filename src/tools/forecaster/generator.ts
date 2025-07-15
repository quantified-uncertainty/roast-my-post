/**
 * Core forecast generation logic
 * Handles the actual Claude API calls and aggregation
 */

import {
  RichLLMInteraction,
} from "@/types/llm";
import {
  DEFAULT_TIMEOUT,
  withTimeout,
} from "@/types/openai";
import { callClaudeWithTool, MODEL_CONFIG } from "@/lib/claude/wrapper";
import { logger } from "@/lib/logger";

interface ForecastResponse {
  probability: number;
  reasoning: string;
}

interface ForecastGeneratorOptions {
  question: string;
  context?: string;
  numForecasts: number;
  usePerplexity: boolean;
}

/**
 * Generate a single forecast for a question
 */
async function generateSingleForecast(
  options: ForecastGeneratorOptions,
  callNumber: number
): Promise<{ forecast: ForecastResponse; interaction: RichLLMInteraction }> {
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
    "Assessing this question,",
  ];
  const prefix =
    randomPrefixes[Math.floor(Math.random() * randomPrefixes.length)];

  const systemPrompt = `You are a careful forecaster. Given a question about a future event, provide:
1. A probability estimate (0-100% with one decimal place, e.g., 65.2%)
2. A one-sentence description of your reasoning

Consider base rates, current evidence, and uncertainties.
Important: Give a precise probability with one decimal place (e.g., 37.5%, not 38%).
Keep the reasoning very brief - just one clear sentence.

[Session: ${timestamp}-${randomSeed}-${callNumber}]`;

  const userPrompt = `${prefix} ${Math.random() < 0.5 ? "Please forecast: " : "What is the probability that "}${options.question}
${options.context ? `\nContext: ${options.context}` : ""}

Think carefully and provide your forecast. Random seed: ${Math.random()}`;

  const result = await withTimeout(
    callClaudeWithTool<ForecastResponse>({
      model: MODEL_CONFIG.forecasting,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: 1000,
      temperature: 0.8, // Increased for more variation
      toolName: "provide_forecast",
      toolDescription: "Provide a probability forecast with reasoning",
      toolSchema: {
        type: "object",
        properties: {
          probability: {
            type: "number",
            minimum: 0,
            maximum: 100,
            description:
              "Probability estimate (0-100 with one decimal place, e.g. 65.2)",
          },
          reasoning: {
            type: "string",
            description: "One-sentence description of your reasoning",
          },
        },
        required: ["probability", "reasoning"],
      },
    }),
    DEFAULT_TIMEOUT,
    `Forecast generation timed out after ${DEFAULT_TIMEOUT / 60000} minutes`
  );

  return { 
    forecast: result.toolResult, 
    interaction: result.interaction 
  };
}

/**
 * Calculate statistics for a set of probability values
 */
function calculateStatistics(probabilities: number[]): {
  mean: number;
  std_dev: number;
} {
  const mean = probabilities.reduce((a, b) => a + b, 0) / probabilities.length;

  const variance =
    probabilities.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) /
    probabilities.length;
  const std_dev = Math.sqrt(variance);

  return {
    mean: Math.round(mean * 10) / 10,
    std_dev: Math.round(std_dev * 10) / 10,
  };
}

/**
 * Remove outliers using IQR method
 */
function removeOutliers(forecasts: ForecastResponse[]): {
  cleaned: ForecastResponse[];
  outliers: ForecastResponse[];
} {
  // For 3 or fewer forecasts, don't remove any outliers
  if (forecasts.length <= 3) {
    return { cleaned: forecasts, outliers: [] };
  }

  const probabilities = forecasts.map((f) => f.probability);
  const sorted = [...probabilities].sort((a, b) => a - b);

  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;

  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const cleaned: ForecastResponse[] = [];
  const outliers: ForecastResponse[] = [];

  forecasts.forEach((forecast) => {
    if (
      forecast.probability >= lowerBound &&
      forecast.probability <= upperBound
    ) {
      cleaned.push(forecast);
    } else {
      outliers.push(forecast);
    }
  });

  return { cleaned, outliers };
}

/**
 * Determine consensus level based on standard deviation
 */
function determineConsensusLevel(std_dev: number): "low" | "medium" | "high" {
  // High disagreement (std dev > 15) means low consensus
  if (std_dev > 15) {
    return "low";
  } else if (std_dev > 10) {
    return "medium";
  } else {
    return "high";
  }
}

/**
 * Generate aggregated description of the forecast
 */
function generateDescription(
  question: string,
  probability: number,
  forecasts: ForecastResponse[],
  consensus: "low" | "medium" | "high"
): string {
  let description = `Based on ${forecasts.length} independent analyses, the estimated probability is ${probability}%. `;

  if (consensus === "high") {
    description += "There is high consensus among the forecasts.";
  } else if (consensus === "low") {
    description += "There is low consensus among the forecasts.";
  } else {
    description += "There is moderate consensus among the forecasts.";
  }

  return description;
}

/**
 * Main forecast generation with aggregation
 */
export async function generateForecastWithAggregation(
  options: ForecastGeneratorOptions
): Promise<{
  forecast: {
    probability: number;
    description: string;
    consensus: "low" | "medium" | "high";
  };
  individual_forecasts: ForecastResponse[];
  statistics: {
    mean: number;
    std_dev: number;
  };
  outliers_removed: ForecastResponse[];
  llmInteractions: RichLLMInteraction[];
}> {
  console.log(`\n🔮 Generating forecast for: ${options.question}`);
  console.log(
    `Making ${options.numForecasts} independent forecasts${options.usePerplexity ? " (with Perplexity research)" : ""}...\n`
  );

  // If using Perplexity, enhance context with research
  let enhancedOptions = options;
  let perplexityInteraction: RichLLMInteraction | null = null;
  
  if (options.usePerplexity) {
    try {
      console.log("  📚 Researching with Perplexity...");
      // Dynamic import to avoid circular dependencies
      const { default: perplexityTool } = await import("../perplexity-research");
      
      const research = await perplexityTool.execute({
        query: options.question,
        includeForecastingContext: true
      }, {
        userId: 'forecaster-tool',
        logger: logger
      });
      
      perplexityInteraction = research.llmInteraction;
      
      const additionalContext = research.forecastingContext || 
        `Summary: ${research.summary}\n\nKey findings:\n${research.keyFindings.map(f => `- ${f}`).join('\n')}`;

      enhancedOptions = {
        ...options,
        context: options.context
          ? `${options.context}\n\nAdditional research:\n${additionalContext}`
          : `Research findings:\n${additionalContext}`,
      };

      console.log("  ✓ Perplexity research completed");
    } catch (error) {
      console.error("  ✗ Perplexity research failed:", error);
      // Continue without enhanced context
    }
  }

  // Generate forecasts in parallel
  console.log(`  🚀 Launching ${options.numForecasts} parallel forecasts...`);
  const llmInteractions: RichLLMInteraction[] = [];
  
  // Add Perplexity interaction if we used it
  if (perplexityInteraction) {
    llmInteractions.push(perplexityInteraction);
  }

  const forecastPromises = Array.from(
    { length: options.numForecasts },
    (_, i) =>
      generateSingleForecast(enhancedOptions, i)
        .then((result) => {
          console.log(
            `     ✓ Forecast ${i + 1}: ${result.forecast.probability.toFixed(1)}%`
          );
          llmInteractions.push(result.interaction);
          return result.forecast;
        })
        .catch((error) => {
          console.error(`     ✗ Forecast ${i + 1} failed: ${error}`);
          return null;
        })
  );

  const results = await Promise.all(forecastPromises);
  const forecasts = results.filter((f): f is ForecastResponse => f !== null);

  if (forecasts.length < Math.min(3, options.numForecasts)) {
    throw new Error(
      `Too few successful forecasts generated (${forecasts.length}/${options.numForecasts})`
    );
  }

  // Remove outliers
  const { cleaned, outliers } = removeOutliers(forecasts);

  if (outliers.length > 0) {
    console.log(`\n  Removed ${outliers.length} outlier(s):`);
    outliers.forEach((o) => console.log(`    - ${o.probability}%`));
  }

  // Calculate statistics on cleaned data
  const cleanedProbabilities = cleaned.map((f) => f.probability);
  const stats = calculateStatistics(cleanedProbabilities);

  // Determine overall consensus
  const overallConsensus = determineConsensusLevel(stats.std_dev);

  // Generate description
  const description = generateDescription(
    options.question,
    stats.mean,
    cleaned,
    overallConsensus
  );

  console.log(
    `\n  Final forecast: ${stats.mean.toFixed(1)}% (${overallConsensus} consensus)`
  );

  return {
    forecast: {
      probability: stats.mean,
      consensus: overallConsensus,
      description,
    },
    individual_forecasts: forecasts,
    outliers_removed: outliers,
    statistics: stats,
    llmInteractions,
  };
}
