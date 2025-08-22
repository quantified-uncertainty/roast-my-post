import {
  PluginType,
} from "../../../ai/src/analysis-plugins/types/plugin-types";
import { SystemAgentDefinition } from "../types";

export const comprehensiveCheckerAgent: SystemAgentDefinition = {
  id: "system-epistemic-verification",
  name: "Comprehensive Checker",
  description:
    "Combines all verification tools except Spelling & Grammar: Link Checker, Fact Checker, Math Checker, and Forecast Checker for thorough content validation",
  providesGrades: false, // Plugin-based agents don't provide grades
  pluginIds: [
    PluginType.LINK_ANALYSIS,
    PluginType.FACT_CHECK,
    PluginType.MATH,
    PluginType.FORECAST,
  ], // Multiple plugins
  readme: `# Comprehensive Checker

A thorough content validation agent that combines all verification tools except Spelling & Grammar checking. Runs Link Checker, Fact Checker, Math Checker, and Forecast Checker in parallel to provide complete content verification in a single pass.

## How It Works

This agent performs multi-domain verification by running four specialized checkers simultaneously:
1. **Link Checker**: Validates all external URLs for accessibility and validity
2. **Fact Checker**: Verifies factual claims against current knowledge
3. **Math Checker**: Checks calculations, formulas, and quantitative reasoning
4. **Forecast Checker**: Evaluates predictions and forward-looking statements

All checks run in parallel for efficiency, with results aggregated into a comprehensive report.

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
- **Evidence integration**: How well are multiple evidence types combined?`,
};
