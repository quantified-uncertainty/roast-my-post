/**
 * Programmatic README generator for Fact Check Plugin
 * Generates documentation from actual plugin configuration
 */

import { FactCheckPlugin } from './index';
import { generateToolsUsedSection } from '../../utils/readme-helpers';
import { LIMITS, THRESHOLDS } from './constants';

export function generateReadme(): string {
  const plugin = new FactCheckPlugin();
  const tools = plugin.getToolDependencies();
  const toolsSection = generateToolsUsedSection(tools);

  return `# Fact Checker

An agent that identifies and verifies factual claims in documents, checking them against current knowledge and reliable sources. Provides detailed verdicts on claim accuracy with evidence-based reasoning.

${toolsSection}

## Configuration

**Processing Limits:**
- Maximum facts to process: **${LIMITS.MAX_FACTS_TO_PROCESS}**
- Maximum claims per chunk: **${LIMITS.MAX_CLAIMS_PER_CHUNK}**

**Quality Thresholds:**
- Minimum quality threshold: **${THRESHOLDS.MIN_QUALITY_THRESHOLD}**

**Importance Scoring:**
- High importance: **${THRESHOLDS.IMPORTANCE_HIGH}+**
- Medium importance: **${THRESHOLDS.IMPORTANCE_MEDIUM}+**

**Checkability Scoring:**
- High checkability: **${THRESHOLDS.CHECKABILITY_HIGH}+**

**Truth Probability Ranges:**
- High: **${THRESHOLDS.TRUTH_PROBABILITY_HIGH}+**
- Medium: **${THRESHOLDS.TRUTH_PROBABILITY_MEDIUM}-${THRESHOLDS.TRUTH_PROBABILITY_HIGH}**
- Low: **${THRESHOLDS.TRUTH_PROBABILITY_LOW}-${THRESHOLDS.TRUTH_PROBABILITY_MEDIUM}**
- Very Low: **≤${THRESHOLDS.TRUTH_PROBABILITY_VERY_LOW}**
- Likely False: **≤${THRESHOLDS.TRUTH_PROBABILITY_LIKELY_FALSE}**

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
- **Misleading**: Technically true but presented in a deceptive way

---
*This documentation is programmatically generated from source code. Do not edit manually.*
`;
}
