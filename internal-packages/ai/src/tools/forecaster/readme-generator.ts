/**
 * Programmatic README generator for Forecaster Tool
 */

import { forecasterTool } from './index';
import { generateToolHeader, getToolDependencies, generateToolsUsedSection } from '../utils/readme-helpers';

export function generateReadme(): string {
  const dependencies = getToolDependencies(forecasterTool);
  const header = generateToolHeader(forecasterTool);
  const toolsSection = generateToolsUsedSection(dependencies);

  return `${header}

${toolsSection}## How It Works

Asks Claude to make multiple independent probability assessments of a given question, then aggregates them using statistical methods to produce a final forecast with confidence levels.

The tool generates multiple independent forecasts (default: 6), removes statistical outliers, and aggregates results with confidence scoring based on forecast agreement.

## Parameters

- **question**: The question to forecast (1-500 characters)
- **context**: Optional additional context (max 1000 characters)
- **numForecasts**: Number of forecasts to generate (3-20, default: 6)
- **usePerplexity**: Whether to use Perplexity for research (default: false)

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

## Cost

Approximately $0.05 per forecast (6 Claude calls with default settings).

## Technical Details

- Uses multiple independent Claude calls to reduce bias
- Removes statistical outliers before aggregation
- Agreement measured as percentage of forecasts within 10 points of median
- Location: Implementation in \`/internal-packages/ai/src/tools/forecaster/\`
`;
}
