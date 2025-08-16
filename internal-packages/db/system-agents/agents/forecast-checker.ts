import { SystemAgentDefinition } from '../types';
import { PluginType } from '../../../ai/src/analysis-plugins/types/plugin-types';

export const forecastCheckerAgent: SystemAgentDefinition = {
  id: 'system-forecast-checker',
  name: 'Forecast Analysis Verifier',
  description: 'Analyzes predictions and forecasts for methodological soundness and logical consistency',
  providesGrades: false, // Plugin-based agents don't provide grades
  pluginIds: [PluginType.FORECAST],
  readme: `# Forecast Analysis Verifier

An agent that evaluates predictions, forecasts, and future-oriented claims for methodological soundness, evidence quality, and logical consistency. Assesses both quantitative and qualitative forecasting approaches.

## How It Works

The agent analyzes forecasting content by:
1. Identifying predictions and forward-looking statements
2. Evaluating the evidence and reasoning supporting forecasts
3. Assessing methodological approaches and assumptions
4. Checking for logical consistency and bias
5. Reviewing uncertainty quantification and confidence intervals

## Capabilities

- **Prediction extraction** - Identifies explicit and implicit forecasts
- **Method evaluation** - Assesses forecasting models and approaches
- **Evidence analysis** - Reviews supporting data and assumptions
- **Uncertainty assessment** - Evaluates confidence levels and ranges
- **Bias detection** - Identifies overconfidence and systematic errors
- **Logical consistency** - Checks internal coherence of predictions

## Analysis Categories

- **Base rate neglect**: Ignoring historical frequencies
- **Anchoring bias**: Over-reliance on initial estimates
- **Overconfidence**: Unrealistic precision or certainty
- **Poor calibration**: Misaligned confidence and accuracy
- **Insufficient evidence**: Predictions without adequate support
- **Methodology flaws**: Inappropriate forecasting techniques`
