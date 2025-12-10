/**
 * Programmatic README generator for Fallacy Extractor Tool
 */

import {
  generateToolHeader,
  generateToolsUsedSection,
} from "../utils/readme-helpers";
import { fallacyExtractorTool } from "./index";

export function generateReadme(): string {
  const dependencies = fallacyExtractorTool.getToolDependencies?.() ?? [];
  const header = generateToolHeader(fallacyExtractorTool);
  const toolsSection = generateToolsUsedSection(dependencies);

  return `${header}

${toolsSection}## How It Works

Analyzes text chunks using Claude to identify sophisticated epistemic issues. The tool focuses on reasoning quality and argumentation rather than basic fact-checking. It extracts issues with severity, confidence, and importance scores, then uses the Smart Text Searcher to find exact locations in the source document.

## Issue Types

- **Misinformation** - Factually incorrect claims presented as true
- **Missing Context** - Claims that omit crucial information
- **Deceptive Wording** - Technically true but framed to mislead
- **Logical Fallacy** - Reasoning errors (ad hominem, straw man, false dilemma, etc.)
- **Verified Accurate** - Claims confirmed as accurate (positive feedback)

## Fallacy Types Detected

The tool identifies 14 specific logical fallacies:
- Ad Hominem, Straw Man, False Dilemma, Slippery Slope
- Appeal to Authority, Appeal to Emotion, Appeal to Nature
- Hasty Generalization, Survivorship Bias, Selection Bias
- Cherry Picking, Circular Reasoning, Equivocation, Non Sequitur

## Core Analysis Areas

1. **Statistical Reasoning Errors** - Base rate neglect, survivorship bias, framing effects
2. **Sophisticated Logical Fallacies** - False dichotomy, motte-bailey, circular reasoning
3. **Framing & Rhetorical Manipulation** - Anchoring, denominator neglect, cherry-picked timeframes
4. **Suspicious Numbers** - False precision, impossibly perfect statistics
5. **Bad Faith Argumentation** - Strawmanning, moving goalposts, quote mining

## Scoring

Each issue is scored on three dimensions (0-100):
- **Severity** - How serious is the issue? (80+ = critical, 60+ = high)
- **Confidence** - How certain is this classification? (Higher severity requires higher confidence)
- **Importance** - How central to the document's argument?

## Configuration

- Minimum severity threshold: **60** (only significant issues reported)
- Maximum issues per analysis: **15**
- Confidence requirements scale with severity (85+ for critical issues)

## Important Distinction

The tool distinguishes between authors **committing** errors versus **discussing** them:
- **Not flagged**: Authors explaining, warning about, or acknowledging reasoning issues
- **Flagged**: Authors actually making the reasoning error themselves

## Technical Details

- Uses Claude Sonnet for analysis
- Integrates with Smart Text Searcher for location finding
- Supports chunk-based analysis with offset tracking for optimization
- Returns exact text locations with start/end offsets
`;
}
