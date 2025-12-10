/**
 * Programmatic README generator for Fallacy Check Plugin
 */

import { LIMITS, THRESHOLDS } from './constants';

export function generateReadme(): string {
  return `# Fallacy Check

An agent that identifies misinformation, missing context, and deceptive wording that could mislead readers. It focuses on sophisticated epistemic issues and reasoning quality rather than basic fact-checking.

## Tools Used

- **[Fallacy Extractor](/tools/fallacy-extractor)** - Extract and score potential misinformation, missing context, deceptive wording, and logical fallacies from text
- **[Fallacy Review](/tools/fallacy-review)** - Reviews and filters epistemic critic comments, removing redundant issues and generating comprehensive document summaries
- **[Smart Text Searcher](/tools/smart-text-searcher)** - Find the location of text within documents using multiple search strategies including exact matching, fuzzy matching, quote normalization, partial matching, and LLM fallback for paraphrased or difficult-to-find text

## Configuration

**Processing Limits:**
- Maximum issues to process: **${LIMITS.MAX_ISSUES_TO_PROCESS}**
- Maximum issues per chunk: **${LIMITS.MAX_ISSUES_PER_CHUNK}**

**Severity Scoring (0-100):**
- Critical: **${THRESHOLDS.SEVERITY_CRITICAL}+** (egregious manipulation seriously distorting reality)
- High: **${THRESHOLDS.SEVERITY_HIGH}-${THRESHOLDS.SEVERITY_CRITICAL - 1}** (clear, significant reasoning error affecting core claims)
- Medium: **${THRESHOLDS.SEVERITY_MEDIUM}-${THRESHOLDS.SEVERITY_HIGH - 1}** (moderate issue, usually skipped)
- Low: **Below ${THRESHOLDS.SEVERITY_MEDIUM}** (skipped)

**Confidence Requirements:**
- Critical issues (${THRESHOLDS.SEVERITY_CRITICAL}+): Require **85+** confidence
- High issues (${THRESHOLDS.SEVERITY_HIGH}+): Require **70+** confidence
- Medium issues (${THRESHOLDS.SEVERITY_MEDIUM}+): Require **50+** confidence
- Low issues: Require **30+** confidence

**Importance Thresholds:**
- Nitpick threshold: **Below ${THRESHOLDS.IMPORTANCE_NITPICK}**
- High importance: **75+** (warning level)
- Critical importance: **90+** (error level)

## How It Works

The agent processes documents in three phases:

1. **Extraction Phase** - Analyzes each document chunk to extract epistemic issues with severity, confidence, and importance scores
2. **Comment Generation** - Builds detailed comments with locations for each identified issue
3. **Review Phase** - Filters redundant/weak comments and generates comprehensive document summaries

## Issue Types

- **Misinformation** - Factually incorrect claims presented as true
- **Missing Context** - Claims that omit crucial information changing interpretation
- **Deceptive Wording** - Technically true but framed to mislead
- **Logical Fallacy** - Reasoning errors that undermine arguments
- **Verified Accurate** - Claims confirmed as accurate (positive feedback)

## Logical Fallacies Detected

- **Ad Hominem** - Attacking the person rather than the argument
- **Straw Man** - Misrepresenting opposing views
- **False Dilemma** - Presenting only two options when more exist
- **Slippery Slope** - Assuming one event leads to extreme consequences
- **Appeal to Authority** - Using authority without proper evidence
- **Appeal to Emotion** - Using emotions rather than logic
- **Appeal to Nature** - Assuming natural equals good
- **Hasty Generalization** - Drawing broad conclusions from limited evidence
- **Survivorship Bias** - Only examining success cases
- **Selection Bias** - Drawing conclusions from non-random samples
- **Cherry Picking** - Selecting only favorable data
- **Circular Reasoning** - Using the conclusion as a premise
- **Equivocation** - Using ambiguous terms inconsistently
- **Non Sequitur** - Conclusions that don't follow from premises

## Core Analysis Areas

1. **Statistical Reasoning Errors** - Base rate neglect, survivorship bias, selection bias, framing effects
2. **Sophisticated Logical Fallacies** - False dichotomy, motte-bailey, circular reasoning, hasty generalization
3. **Framing & Rhetorical Manipulation** - Anchoring, denominator neglect, cherry-picked timeframes, false precision
4. **Suspicious Numbers** - False precision, impossibly perfect statistics, suspiciously exact figures
5. **Missing Crucial Context** - Cherry-picked periods, undisclosed conflicts, missing comparison groups
6. **Bad Faith Argumentation** - Strawmanning, moving goalposts, quote mining, whataboutism
7. **Causal Reasoning Errors** - Confounding variables, reverse causation, post hoc fallacies
8. **Temporal & Historical Errors** - Hindsight bias, cherry-picked timeframes
9. **Narrative Content Issues** - Vague claims, uncritical authority appeals, selective self-presentation

## Comment Levels

- **Error** - Critical issues (severity ${THRESHOLDS.SEVERITY_CRITICAL}+) or high-severity misinformation/deception
- **Warning** - Important issues (importance 75-89)
- **Nitpick** - Lower importance issues (importance ${THRESHOLDS.IMPORTANCE_NITPICK}-74)
- **Debug** - Very low importance (below ${THRESHOLDS.IMPORTANCE_NITPICK})
- **Success** - Verified accurate claims

## Important Distinctions

The agent distinguishes between authors **committing** errors versus **discussing** them:

- **Not flagged**: Authors explaining, warning about, or acknowledging reasoning issues (good epistemics)
- **Flagged**: Authors actually making the reasoning error themselves

---
*This documentation is programmatically generated from source code. Do not edit manually.*
`;
}
