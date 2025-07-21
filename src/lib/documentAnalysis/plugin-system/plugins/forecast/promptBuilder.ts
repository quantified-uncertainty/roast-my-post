/**
 * Prompt builder for the Forecast plugin
 */

import { TextChunk } from "../../TextChunk";

export class ForecastPromptBuilder {
  /**
   * Build extraction prompt for finding predictions in a chunk
   */
  buildExtractionPrompt(chunk: TextChunk, additionalInstructions?: string): string {
    const basePrompt = `Extract all predictions and forecasts about future events from this text.

Text to analyze:
${chunk.text}

For each prediction, identify:
1. The exact prediction text as it appears in the document
2. The timeframe (if specified) - e.g., "2030", "next 5 years", "by the end of the decade"
3. Any probability or confidence level (0-100 if percentage given)
4. The topic/domain (e.g., AI, climate, economy, technology)
5. Brief surrounding context

Focus on:
- Explicit predictions ("AGI will arrive by 2030")
- Probability estimates ("70% chance of recession")
- Trend extrapolations ("at this rate, we'll reach X by Y")
- Conditional forecasts ("if X happens, then Y will follow")
- Timeline estimates ("this will take 5-10 years")
- Future-oriented language (will, shall, by [year], within [timeframe])

Do NOT include:
- Historical facts or past events
- Current state descriptions
- Hypothetical scenarios without time bounds
- General statements about change without specific predictions`;

    if (additionalInstructions) {
      return `${basePrompt}\n\nAdditional instructions:\n${additionalInstructions}`;
    }

    return basePrompt;
  }

  /**
   * Convert a prediction into a forecasting question for the forecaster tool
   */
  convertToForecastQuestion(predictionText: string, timeframe?: string): string {
    // If already a question, return as-is
    if (predictionText.includes("?")) {
      return predictionText;
    }

    // Transform statement into question
    let question = `Will ${predictionText}?`;
    
    // Add timeframe context if available
    if (timeframe) {
      question = question.replace("?", ` by ${timeframe}?`);
    }

    return question;
  }

  /**
   * Build context for the forecaster tool
   */
  buildForecastContext(prediction: {
    text: string;
    context?: string;
    topic: string;
  }): string {
    let context = `This prediction is about ${prediction.topic}.`;
    
    if (prediction.context) {
      context += `\n\nContext: ${prediction.context}`;
    }

    return context;
  }
}