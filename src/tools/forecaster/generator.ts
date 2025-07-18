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
import { getRandomElement, getPercentile } from "@/utils/safeArrayAccess";
import { sessionContext } from "@/lib/helicone/sessionContext";
import { createHeliconeHeaders } from "@/lib/helicone/sessions";
import { calculateApiCostInDollars } from "@/utils/costCalculator";

interface ForecastResponse {
  probability: number;
  reasoning: string;
}

interface ForecastGeneratorOptions {
  question: string;
  context?: string;
  numForecasts: number;
  usePerplexity: boolean;
  model?: string;
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

  // Random prefix and framing to encourage variation
  const randomPrefixes = [
    "Let me think about this.",
    "Considering the question,",
    "Analyzing the scenario,",
    "Looking at this forecast,",
    "Evaluating the probability,",
    "Assessing this question,",
    "From my perspective,",
    "Based on current trends,",
    "Taking a different angle,",
  ];
  const prefix = getRandomElement(randomPrefixes, "Let me think about this.");
  
  // Add variation in how we ask the question
  const questionVariants = [
    `Please forecast: ${options.question}`,
    `What is the probability that ${options.question}`,
    `Estimate the likelihood: ${options.question}`,
    `What are the chances that ${options.question}`,
    `How likely is it that ${options.question}`,
  ];
  const questionPrompt = getRandomElement(questionVariants, `Please forecast: ${options.question}`);

  const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const systemPrompt = `You are an expert forecaster trained in the methods of superforecasters like those in Philip Tetlock's research. 

When making forecasts, follow these steps:
1. REPHRASE the question to ensure you understand exactly what's being asked
2. IDENTIFY the base rate - what's the historical frequency of similar events?
3. CONSIDER arguments for YES - what evidence supports this outcome?
4. CONSIDER arguments for NO - what evidence opposes this outcome?
5. WEIGH THE EVIDENCE - which arguments are stronger and more reliable?
6. CHECK FOR BIAS - are you being overconfident? Consider the outside view.
7. CALIBRATE - given everything above, what's your probability estimate?

Key principles:
- Use reference classes and base rates
- Consider multiple scenarios
- Be appropriately uncertain about uncertain events
- Avoid round numbers (use precise estimates like 23.7%, not 25%)
- Remember that most events are less likely than they initially seem

Current date: ${currentDate}
Be especially careful about timing - has this event already occurred?

[Session: ${timestamp}-${randomSeed}-${callNumber}]`;

  const userPrompt = `${prefix} ${questionPrompt}
${options.context ? `\nContext: ${options.context}` : ""}

Remember to work through the full forecasting process:
1. Understand what exactly is being asked
2. Find appropriate base rates and reference classes
3. Consider evidence both for and against
4. Calibrate your final probability carefully

Provide your forecast as a precise probability (e.g., 23.7%, not 25%). Random seed: ${Math.random()}`;

  // Get session context if available
  const currentSession = sessionContext.getSession();
  const sessionConfig = currentSession ? 
    sessionContext.withPath(`/plugins/forecast/generate-${callNumber}`) : 
    undefined;
  const heliconeHeaders = sessionConfig ? 
    createHeliconeHeaders(sessionConfig) : 
    undefined;

  const result = await withTimeout(
    callClaudeWithTool<ForecastResponse>({
      model: options.model || MODEL_CONFIG.forecasting,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: 1000,
      temperature: 0.3, // Lower temperature for more consistent reasoning
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
              "Probability estimate (0-100 with one decimal place, e.g. 23.7, not 25)",
          },
          reasoning: {
            type: "string",
            description: "Brief summary of your reasoning process and key considerations",
          },
        },
        required: ["probability", "reasoning"],
      },
      heliconeHeaders
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

  const q1 = getPercentile(sorted, 0.25);
  const q3 = getPercentile(sorted, 0.75);
  
  // If we couldn't calculate quartiles, return all forecasts
  if (isNaN(q1) || isNaN(q3)) {
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
 * More reasonable thresholds for probability forecasts
 */
function determineConsensusLevel(std_dev: number): "low" | "medium" | "high" {
  // Standard deviation thresholds for consensus:
  // - High consensus: forecasts within ~5 percentage points (std dev <= 2.5)
  // - Medium consensus: forecasts within ~10 percentage points (std dev <= 5)
  // - Low consensus: wider spread (std dev > 5)
  if (std_dev > 5) {
    return "low";
  } else if (std_dev > 2.5) {
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
  cost: {
    totalUSD: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    model: string;
  };
}> {
  const modelName = options.model || MODEL_CONFIG.forecasting;
  console.log(`\n🔮 Generating forecast for: ${options.question}`);
  console.log(
    `Making ${options.numForecasts} independent forecasts${options.usePerplexity ? " (with Perplexity research)" : ""}...`
  );
  console.log(`Using model: ${modelName}\n`);

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

  // Calculate total cost from all interactions
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  
  llmInteractions.forEach(interaction => {
    if (interaction.tokensUsed) {
      totalInputTokens += interaction.tokensUsed.prompt || 0;
      totalOutputTokens += interaction.tokensUsed.completion || 0;
    }
  });
  
  const actualModel = options.model || MODEL_CONFIG.forecasting;
  const totalCostUSD = calculateApiCostInDollars(
    { input_tokens: totalInputTokens, output_tokens: totalOutputTokens },
    actualModel as any
  );
  
  console.log(`[Forecast Cost] Tokens: ${totalInputTokens} input, ${totalOutputTokens} output, Cost: $${totalCostUSD}`);

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
    cost: {
      totalUSD: totalCostUSD,
      totalInputTokens,
      totalOutputTokens,
      model: actualModel
    }
  };
}
