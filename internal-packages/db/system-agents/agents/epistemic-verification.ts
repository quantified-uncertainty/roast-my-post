import { SystemAgentDefinition } from "../types";

import { PluginType } from '../../../ai/src/analysis-plugins/types/plugin-types';

export const epistemicVerificationAgent: SystemAgentDefinition = {
  id: "system-epistemic-verification",
  name: "Epistemic Verification x3",
  description:
    "Comprehensive epistemic analysis combining fact-checking, mathematical verification, and forecast evaluation",
  providesGrades: false, // Plugin-based agents don't provide grades
  pluginIds: [PluginType.FACT_CHECK, PluginType.MATH, PluginType.FORECAST], // Multiple plugins
  readme: `# Epistemic Verification x3

A comprehensive epistemic analysis agent that combines three critical domains of knowledge verification: factual accuracy, mathematical correctness, and forecasting methodology. Provides holistic assessment of claims, evidence, and reasoning quality.

## How It Works

This agent performs triple-verification by:
1. **Fact-checking**: Verifying factual claims against current knowledge
2. **Mathematical verification**: Checking calculations, formulas, and quantitative reasoning
3. **Forecast analysis**: Evaluating predictions and forward-looking statements

Each domain is analyzed independently, then integrated for an overall epistemic quality assessment.

## Capabilities

### Factual Verification
- Claims verification against reliable sources
- Evidence quality assessment
- Source credibility evaluation
- Contradiction detection

### Mathematical Analysis
- Calculation verification
- Formula and statistical claim checking
- Unit consistency analysis
- Quantitative reasoning assessment

### Forecasting Evaluation
- Prediction methodology assessment
- Uncertainty quantification review
- Bias detection in forecasts
- Evidence-to-conclusion strength analysis

## Integration Approach

The agent provides:
- **Domain-specific analysis** for each verification type
- **Cross-domain consistency** checking for conflicting findings
- **Integrated confidence** assessment across all three domains
- **Prioritized issues** ranking by epistemic significance

## Quality Dimensions

- **Factual accuracy**: Are claims supported by evidence?
- **Mathematical rigor**: Are calculations and formulas correct?
- **Predictive quality**: Are forecasts methodologically sound?
- **Logical consistency**: Do the domains align coherently?
- **Evidence integration**: How well are multiple evidence types combined?`
