/**
 * Type definitions for the Forecast plugin
 */

import type { ExtractionConfig } from "../../utils/extractionHelper";
import type { 
  GenericPotentialFinding, 
  GenericInvestigatedFinding, 
  GenericLocatedFinding 
} from "../../utils/pluginHelpers";

// Extraction result from LLM
export interface ForecastExtractionResult {
  text: string;
  timeframe?: string;
  probability?: number;
  topic: string;
  context?: string;
}

// Finding data structures
export interface ForecastFindingData {
  predictionText: string;
  timeframe?: string;
  probability?: number;
  topic: string;
  authorConfidence?: "low" | "medium" | "high";
  context?: string;
}

export interface ForecastComparisonData extends ForecastFindingData {
  ourProbability: number;
  ourConsensus: "low" | "medium" | "high";
  reasoning: string;
  agreesWithAuthor: boolean;
}

// Finding types
export type ForecastPotentialFinding = GenericPotentialFinding & {
  type: "forecast" | "forecast_disagreement";
  data: ForecastFindingData | ForecastComparisonData;
};

export type ForecastInvestigatedFinding = GenericInvestigatedFinding & {
  type: "forecast" | "forecast_disagreement";
  data: ForecastFindingData | ForecastComparisonData;
};

export type ForecastLocatedFinding = GenericLocatedFinding & {
  type: "forecast" | "forecast_disagreement";
  data: ForecastFindingData | ForecastComparisonData;
};

// Storage for findings at different stages
export interface ForecastFindingStorage {
  potential: ForecastPotentialFinding[];
  investigated: ForecastInvestigatedFinding[];
  located: ForecastLocatedFinding[];
  summary?: string;
  analysisSummary?: string;
}

// Forecast generation result from forecaster tool
export interface ForecastToolResult {
  probability: number;
  consensus: "low" | "medium" | "high";
  description: string;
  llmInteractions: any[];
}

// Configuration for extraction
export function getForecastExtractionConfig(pluginName: string): ExtractionConfig {
  return {
    toolName: "extract_forecasts",
    toolDescription: "Extract predictions and forecasts from text",
    toolSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { 
                type: "string", 
                description: "The exact prediction text as it appears in the document" 
              },
              timeframe: {
                type: "string",
                description: "When this is predicted to happen (e.g., '2030', 'next 5 years')"
              },
              probability: {
                type: "number",
                minimum: 0,
                maximum: 100,
                description: "Probability if explicitly stated (0-100)"
              },
              topic: {
                type: "string",
                description: "Topic/domain of the prediction (e.g., 'AI', 'climate', 'economy')"
              },
              context: {
                type: "string",
                description: "Brief surrounding context for the prediction"
              }
            },
            required: ["text", "topic"]
          }
        }
      },
      required: ["items"]
    },
    pluginName
  };
}