/**
 * Programmatic README generator for Forecaster Tool
 */

import {
  generateToolHeader,
  generateToolsUsedSection,
  getToolDependencies,
} from "../utils/readme-helpers";
import { forecasterTool, DEFAULT_NUM_FORECASTS, MIN_NUM_FORECASTS, MAX_NUM_FORECASTS } from "./index";
import { MODEL_CONFIG } from "../../claude/wrapper";
import { getModelDisplayName } from "../../types";

export function generateReadme(): string {
  const dependencies = getToolDependencies(forecasterTool);
  const header = generateToolHeader(forecasterTool);
  const toolsSection = generateToolsUsedSection(dependencies);

  return `${header}

${toolsSection}## How It Works

Asks Claude to make multiple independent probability assessments of a given question, then aggregates them by taking the mean to produce a final forecast.

## Output

- **probability**: Aggregated probability (0-100)
- **description**: Description of the forecast and reasoning
- **confidence**: 'low' | 'medium' | 'high' based on forecast agreement
- **individualForecasts**: Array of individual probability assessments with reasoning
- **statistics**: Mean, median, standard deviation, and agreement metrics

## Confidence Levels

- **High**: >66% of forecasts within 10 points of median
- **Medium**: 33-66% agreement
- **Low**: <33% agreement

## Technical Details

- Uses multiple independent ${getModelDisplayName(MODEL_CONFIG.forecasting)} calls to reduce bias
- Removes statistical outliers before aggregation
- Agreement measured as percentage of forecasts within 10 points of median
- Default ${DEFAULT_NUM_FORECASTS} forecasts per question (configurable ${MIN_NUM_FORECASTS}-${MAX_NUM_FORECASTS})
`;
}
