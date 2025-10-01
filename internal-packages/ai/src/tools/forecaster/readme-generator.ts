/**
 * Programmatic README generator for Forecaster Tool
 */

import {
  generateToolHeader,
  generateToolsUsedSection,
} from "../utils/readme-helpers";
import { forecasterTool } from "./index";
import { MODEL_CONFIG } from "../../claude/wrapper";

export function generateReadme(): string {
  const dependencies = forecasterTool.getToolDependencies?.() ?? [];
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

- Uses multiple independent ${MODEL_CONFIG.forecasting} calls to reduce bias
- Removes statistical outliers before aggregation
- Agreement measured as percentage of forecasts within 10 points of median
- Default 6 forecasts per question (configurable 3-20)
`;
}
