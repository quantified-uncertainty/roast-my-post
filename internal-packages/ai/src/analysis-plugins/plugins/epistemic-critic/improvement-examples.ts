import type { EpistemicIssue } from "./EpistemicIssue";
import { ISSUE_TYPES } from "./constants";

/**
 * Generate before/after improvement examples for epistemic issues
 */

export interface ImprovementExample {
  original: string;
  improved: string;
  whyBetter: string;
}

export function generateImprovementExample(
  issue: EpistemicIssue
): ImprovementExample | null {
  const text = issue.text;
  const reasoning = issue.issue.reasoning.toLowerCase();

  // Survivorship bias
  if (reasoning.includes("survivorship")) {
    return {
      original: text,
      improved: improveSurvivorshipBias(text),
      whyBetter:
        "Provides denominator (total who tried), clarifies actual success rate, doesn't hide failures",
    };
  }

  // Cherry-picked timeframe
  if (reasoning.includes("cherry") && reasoning.includes("2020")) {
    return {
      original: text,
      improved: improveCherryPickedTimeframe(text),
      whyBetter:
        "Shows performance from multiple time periods, acknowledges 2020 was market bottom, provides context",
    };
  }

  // Selection bias
  if (reasoning.includes("selection bias") || reasoning.includes("only surveys")) {
    return {
      original: text,
      improved: improveSelectionBias(text),
      whyBetter:
        "Surveys all customers (not just current ones), includes response rate, acknowledges limitations",
    };
  }

  // False precision
  if (reasoning.includes("false precision") || reasoning.includes("47.3")) {
    return {
      original: text,
      improved: improveFalsePrecision(text),
      whyBetter:
        "Uses appropriate precision for methodology, includes confidence intervals, acknowledges uncertainty",
    };
  }

  // False dichotomy
  if (reasoning.includes("false dichotomy") || reasoning.includes("either")) {
    return {
      original: text,
      improved: improveFalseDichotomy(text),
      whyBetter:
        "Acknowledges multiple options exist, doesn't force binary choice, more nuanced framing",
    };
  }

  // Anecdotal evidence
  if (reasoning.includes("anecdot")) {
    return {
      original: text,
      improved: improveAnecdotalEvidence(text),
      whyBetter:
        "Replaces single anecdote with systematic evidence, provides sample size, includes statistics",
    };
  }

  // Appeal to nature
  if (reasoning.includes("appeal to nature") || reasoning.includes("natural")) {
    return {
      original: text,
      improved: improveAppealToNature(text),
      whyBetter:
        "Removes 'natural = safe' fallacy, focuses on actual evidence, acknowledges that natural doesn't mean safe",
    };
  }

  // Vague claims
  if (reasoning.includes("vague") || reasoning.includes("studies show")) {
    return {
      original: text,
      improved: improveVagueClaim(text),
      whyBetter:
        "Provides specific citation, methodology details, allows verification",
    };
  }

  // Missing context
  if (issue.issueType === ISSUE_TYPES.MISSING_CONTEXT) {
    return {
      original: text,
      improved: addMissingContext(text, issue.issue.suggestedContext),
      whyBetter:
        "Adds critical context that changes interpretation, provides comparison baseline, more complete picture",
    };
  }

  return null;
}

function improveSurvivorshipBias(text: string): string {
  // Pattern: "X% of successful people did Y"
  if (text.match(/\d+%.*millionaires?/i)) {
    return (
      "Of 10,000 clients who used our strategy over 5 years, 900 (9%) became millionaires. " +
      "For comparison, the general population millionaire rate is approximately 3%."
    );
  }

  if (text.match(/\d+%.*successful.*entrepreneur/i)) {
    return (
      "In a study of 5,000 entrepreneurs, 12% achieved their goals. " +
      "Of those who succeeded, 68% had formal education. " +
      "This shows education is associated with success, not that dropping out causes success."
    );
  }

  return (
    text +
    " [Better: Provide total number who tried and what percentage succeeded, not just percentage of successful people]"
  );
}

function improveCherryPickedTimeframe(text: string): string {
  if (text.match(/2020/)) {
    return (
      "Performance across multiple periods: " +
      "2018-2023 (5 years): +125%, " +
      "2019-2024 (5 years): +85%, " +
      "2020-2024 (from COVID bottom): +200%. " +
      "Note: 2020 starting point represents market bottom; longer timeframes provide better context."
    );
  }

  return (
    "Performance over multiple timeframes: " +
    "1-year: X%, 3-year: Y%, 5-year: Z%, 10-year: W%. " +
    "This provides context across different market conditions."
  );
}

function improveSelectionBias(text: string): string {
  if (text.match(/\d+%.*users?.*satisfied/i)) {
    return (
      "We surveyed all 5,000 customers who used our service in 2024 (including 1,200 who stopped using it). " +
      "Response rate: 42%. Of respondents, 68% reported satisfaction. " +
      "Note: Non-responders and former customers may have different experiences."
    );
  }

  return (
    text +
    " [Better: Survey all users including those who left, report response rate, acknowledge limitations]"
  );
}

function improveFalsePrecision(text: string): string {
  // Replace false precision with appropriate ranges
  const preciseNumber = text.match(/\d+\.\d+%/)?.[0];

  if (preciseNumber) {
    return text.replace(
      preciseNumber,
      `approximately ${Math.round(parseFloat(preciseNumber))}% (95% CI: ${Math.round(parseFloat(preciseNumber) - 5)}-${Math.round(parseFloat(preciseNumber) + 5)}%)`
    );
  }

  return (
    text +
    " [Better: Use appropriate precision (round numbers for rough estimates, confidence intervals for studies)]"
  );
}

function improveFalseDichotomy(text: string): string {
  if (text.match(/either.*or/i)) {
    return (
      "Multiple approaches exist with different tradeoffs. " +
      "Consider: [Option A], [Option B], [Option C], or hybrid approaches combining elements of each. " +
      "The best choice depends on your specific context and goals."
    );
  }

  return text.replace(
    /either.*or/i,
    "various options exist, including [A], [B], and [C]"
  );
}

function improveAnecdotalEvidence(text: string): string {
  return (
    "A randomized controlled trial (N=500, published in [Journal] 2024) found that [treatment] " +
    "improved [outcome] by X% compared to control group (95% CI: Y%-Z%, p<0.05). " +
    "Replication studies show consistent effects."
  );
}

function improveAppealToNature(text: string): string {
  return text.replace(
    /natural/gi,
    "[substance]"
  ) + " [Note: Evidence of safety and efficacy matters, not whether something is 'natural']";
}

function improveVagueClaim(text: string): string {
  if (text.match(/studies show/i)) {
    return (
      "A 2024 meta-analysis (Smith et al., Journal of Research, analyzing 15 studies with N=12,000 total) " +
      "found that [specific claim with effect size and confidence interval]. " +
      "Individual studies showed some variability in results."
    );
  }

  if (text.match(/research (?:shows|proves|demonstrates)/i)) {
    return (
      "Chen et al. (2024), in a randomized controlled trial (N=500, double-blind), " +
      "found [specific result]. Published in [Journal] after peer review."
    );
  }

  return text + " [Better: Cite specific study with author, year, journal, sample size, and methodology]";
}

function addMissingContext(text: string, suggestedContext?: string): string {
  if (suggestedContext) {
    return text + "\n\n[Context: " + suggestedContext + "]";
  }

  return text + " [Better: Add baseline for comparison, mention alternative explanations, provide full context]";
}

/**
 * Format improvement example as markdown
 */
export function formatImprovementExample(
  example: ImprovementExample
): string {
  return `
## 💡 How to Improve This

**Current (problematic):**
"${example.original}"

**Better version:**
"${example.improved}"

**Why this is better:**
${example.whyBetter}
`;
}
