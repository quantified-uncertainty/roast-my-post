/**
 * Programmatic README generator for Forecast Plugin
 * Generates documentation from actual plugin configuration
 */

import { ForecastPlugin } from './index';
import { generateToolsUsedSection } from '../../utils/readme-helpers';

export function generateReadme(): string {
  const plugin = new ForecastPlugin();
  const tools = plugin.getToolDependencies();
  const toolsSection = generateToolsUsedSection(tools);

  return `# Forecast Checker

An agent that evaluates predictions, forecasts, and future-oriented claims for methodological soundness, evidence quality, and logical consistency. Assesses both quantitative and qualitative forecasting approaches.

${toolsSection}

## Configuration

**Forecast Generation:**
- Number of forecasts per claim: **2** (for consensus)
- Uses Perplexity for research: **false** (disabled by default)

**Quality Scoring Dimensions (0-100):**
- **Precision Score**: How specific and well-defined is the prediction?
- **Verifiability Score**: How easily can the prediction be verified?
- **Importance Score**: Significance and impact of the prediction
- **Robustness Score**: How well-supported is the prediction?

**Forecast Decision Threshold:**
- Average quality score must be **high** across all dimensions for detailed analysis
- Lower robustness increases likelihood of generating our own forecast (to check author's work)

## How It Works

The agent analyzes forecasting content by:
1. Identifying predictions and forward-looking statements
2. Evaluating the evidence and reasoning supporting forecasts
3. Assessing methodological approaches and assumptions
4. Checking for logical consistency and bias
5. Reviewing uncertainty quantification and confidence intervals
6. Optionally generating independent forecasts to compare with author's predictions

## Capabilities

- **Prediction extraction** - Identifies explicit and implicit forecasts
- **Method evaluation** - Assesses forecasting models and approaches
- **Evidence analysis** - Reviews supporting data and assumptions
- **Uncertainty assessment** - Evaluates confidence levels and ranges
- **Bias detection** - Identifies overconfidence and systematic errors
- **Logical consistency** - Checks internal coherence of predictions
- **Comparative forecasting** - Generates independent predictions for validation

## Analysis Categories

- **Base rate neglect**: Ignoring historical frequencies
- **Anchoring bias**: Over-reliance on initial estimates
- **Overconfidence**: Unrealistic precision or certainty
- **Poor calibration**: Misaligned confidence and accuracy
- **Insufficient evidence**: Predictions without adequate support
- **Methodology flaws**: Inappropriate forecasting techniques

---
*This documentation is programmatically generated from source code. Do not edit manually.*
`;
}
