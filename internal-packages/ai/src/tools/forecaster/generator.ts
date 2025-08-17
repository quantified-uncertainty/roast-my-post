/**
 * Core forecast generation logic
 * Handles the actual Claude API calls and aggregation
 */

import { withTimeout } from "../../utils/timeout";
import { callClaudeWithTool } from "../../claude/wrapper";
import { MODEL_CONFIG } from "../../claude/wrapper";
import { logger } from "../../shared/logger";
import { getRandomElement, getPercentileNumber } from "../../shared/types";
import { perplexityResearchTool } from "../perplexity-research/index";

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
): Promise<{ forecast: ForecastResponse }> {
  // Add timestamp and random seed to prevent caching
  const timestamp = Date.now();
  const randomSeed = Math.random();
  
  // Use a longer timeout for forecasting (5 minutes per forecast)
  const FORECAST_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  // Random prefix to break cache patterns
  const randomPrefixes = [
    "Let me think about this.",
    "Considering the question,",
    "Analyzing the scenario,",
    "Looking at this forecast,",
    "Evaluating the probability,",
    "Assessing this question,",
  ];
  const prefix = getRandomElement(randomPrefixes, "Let me think about this.");

  const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const systemPrompt = `You are a careful forecaster. Given a question about a future event, provide:
1. A probability estimate (0-100% with one decimal place, e.g., 65.2%)
2. A one-sentence description of your reasoning

Current date: ${currentDate}

Consider base rates, current evidence, and uncertainties. IMPORTANT: Pay attention to the current date when forecasting - if the question asks about an event that should have already occurred, note this in your reasoning.
Important: Give a precise probability with one decimal place (e.g., 37.5%, not 38%).
Keep the reasoning very brief - just one clear sentence.

[Session: ${timestamp}-${randomSeed}-${callNumber}]`;

  const userPrompt = `<task>
  <instruction>${prefix} ${Math.random() < 0.5 ? "Please forecast" : "What is the probability that"}</instruction>
  
  <question>
${options.question}
  </question>
  
  ${options.context ? `<context>\n${options.context}\n  </context>\n  ` : ''}
  <parameters>
    <random_seed>${Math.random()}</random_seed>
    <session_id>${timestamp}-${randomSeed}-${callNumber}</session_id>
  </parameters>
  
  <requirements>
    Think carefully and provide your forecast with a precise probability and brief reasoning.
  </requirements>
</task>`;


  const result = await withTimeout(
    callClaudeWithTool<ForecastResponse>({
      model: MODEL_CONFIG.forecasting,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: 1000,
      temperature: 0.8, // Increased for more variation
      toolName: "provide_forecast",
      toolDescription: "Provide a probability forecast with reasoning",
      enablePromptCaching: true,
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
      }
    }),
    {
      timeoutMs: FORECAST_TIMEOUT,
      errorMessage: `Forecast generation timed out after ${FORECAST_TIMEOUT / 60000} minutes`
    }
  );

  return { 
    forecast: result.toolResult 
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

  const q1 = getPercentileNumber(sorted, 0.25);
  const q3 = getPercentileNumber(sorted, 0.75);
  
  // If we couldn't calculate quartiles, return all forecasts
  if (q1 === undefined || q3 === undefined || isNaN(q1) || isNaN(q3)) {
    return { cleaned: forecasts, outliers: [] };
  }
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
  perplexityResults?: Array<{ title: string; url: string; }>;
}> {
  console.log(`\n🔮 Generating forecast for: ${options.question}`);
  console.log(
    `Making ${options.numForecasts} independent forecasts${options.usePerplexity ? " (with Perplexity research)" : ""}...\n`
  );

  // If using Perplexity, enhance context with research
  let enhancedOptions = options;
  let perplexityResults: Array<{ title: string; url: string; }> | undefined;
  
  if (options.usePerplexity) {
    try {
      console.log("  📚 Researching with Perplexity...");
      
      const research = await perplexityResearchTool.execute({
        query: options.question,
        includeForecastingContext: true
      }, {
        userId: 'forecaster-tool',
        logger: logger
      });
      
      
      // Extract sources for perplexityResults
      perplexityResults = research.sources.map((source: any) => ({
        title: source.title,
        url: source.url
      }));
      
      const additionalContext = research.forecastingContext || 
        `Summary: ${research.summary}\n\nKey findings:\n${research.keyFindings.map((f: any) => `- ${f}`).join('\n')}`;

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

  const forecastPromises = Array.from(
    { length: options.numForecasts },
    (_, i) =>
      generateSingleForecast(enhancedOptions, i)
        .then((result) => {
          console.log(
            `     ✓ Forecast ${i + 1}: ${result.forecast.probability.toFixed(1)}%`
          );
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
    perplexityResults,
  };
}
