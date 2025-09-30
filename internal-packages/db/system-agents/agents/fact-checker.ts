import {
  PluginType,
  SystemAgentDefinition,
} from "../types";

export const factCheckerAgent: SystemAgentDefinition = {
  id: "system-fact-checker",
  name: "Fact Checker",
  description:
    "Verifies factual claims and statements for accuracy using available knowledge",
  providesGrades: false, // Plugin-based agents don't provide grades
  pluginIds: [PluginType.FACT_CHECK],
  isRecommended: true,
  readme: `# Fact Checker

An agent that identifies and verifies factual claims in documents, checking them against current knowledge and reliable sources. Provides detailed verdicts on claim accuracy with evidence-based reasoning.

## How It Works

The agent processes documents by:
1. Extracting factual claims and statements
2. Categorizing claims by type (statistical, historical, scientific, etc.)
3. Verifying each claim against current knowledge
4. Providing verdicts with supporting evidence
5. Suggesting corrections for inaccurate claims

## Verification Categories

- **Factual claims**: General statements about events, people, or things
- **Statistical data**: Numbers, percentages, measurements, trends
- **Historical facts**: Dates, events, historical figures and contexts
- **Scientific facts**: Research findings, natural phenomena, technical data
- **Geographic facts**: Locations, distances, demographic information
- **Current events**: Recent developments, ongoing situations

## Verdict Types

- **True**: Claim is accurate and well-supported
- **False**: Claim is demonstrably incorrect
- **Partially True**: Contains accurate elements but is misleading or incomplete
- **Outdated**: Was true but no longer current
- **Unverifiable**: Cannot be verified with available information
- **Misleading**: Technically true but presented in a deceptive way`,
};
