import type { EpistemicIssue } from "./EpistemicIssue";

/**
 * Red flag dictionary - contextual information about common manipulation patterns
 */

export interface RedFlagInfo {
  emoji: string;
  title: string;
  whyThisIsARedFlag: string;
  commonIn: string[];
  howToSpotIt: string[];
  relatedIssues?: string;
}

const RED_FLAG_DICTIONARY: Record<string, RedFlagInfo> = {
  "survivorship-bias": {
    emoji: "🎯",
    title: "Survivorship Bias",
    whyThisIsARedFlag:
      "One of the most common tactics in investment scams, success gurus, and MLM schemes. By only showing successes and hiding failures, they make terrible strategies look great.",
    commonIn: [
      "Investment scams ('90% of our millionaire clients...')",
      "Success gurus ('All successful people do X')",
      "Weight loss marketing ('Average user lost 50 lbs')",
      "College dropout narratives",
      "Startup advice",
    ],
    howToSpotIt: [
      "Look for 'X% of successful people did Y'",
      "Ask: 'What about people who tried and failed?'",
      "Missing denominator (total who tried)",
      "Only showing winners, never showing losers",
    ],
    relatedIssues: "Often combined with cherry-picked timeframes and selection bias",
  },

  "cherry-picked-timeframe": {
    emoji: "📅",
    title: "Cherry-Picked Timeframe",
    whyThisIsARedFlag:
      "Starting from March 2020 makes ANY investment look amazing (market bottom). This is like measuring height from the basement floor instead of ground level.",
    commonIn: [
      "Investment marketing (especially starting 2020, 2009)",
      "Company growth claims",
      "Stock performance charts",
      "Economic analysis",
    ],
    howToSpotIt: [
      "Start dates: March 2020 (COVID bottom), March 2009 (crisis bottom)",
      "Suspiciously short time periods (<2 years)",
      "Convenient start/end points that maximize apparent performance",
      "No comparison to longer time periods",
    ],
    relatedIssues: "Often seen with survivorship bias and missing baselines",
  },

  "selection-bias": {
    emoji: "🎭",
    title: "Selection Bias",
    whyThisIsARedFlag:
      "Only asking current users guarantees positive results - it's like a gym only surveying people still showing up. Those who quit (likely dissatisfied) are excluded.",
    commonIn: [
      "Customer satisfaction surveys",
      "Product reviews (only buyers, not those who looked and left)",
      "User testimonials",
      "Success rate claims",
    ],
    howToSpotIt: [
      "'95% of our users are satisfied' (only current users)",
      "Surveys that exclude people who left/quit",
      "No mention of non-responders or dropout rate",
      "Only asking people still engaged with product",
    ],
    relatedIssues: "Special case of survivorship bias for surveys/samples",
  },

  "false-precision": {
    emoji: "🎯",
    title: "False Precision",
    whyThisIsARedFlag:
      "Using excessive decimal places (47.3%) when methodology doesn't support it is a manipulation tactic that creates false impression of rigor and accuracy.",
    commonIn: [
      "Marketing claims ('47.3% more effective')",
      "Internal studies with vague methodology",
      "Success rate claims",
      "Financial projections",
    ],
    howToSpotIt: [
      "Decimal places from 'internal study' or vague source",
      "'Approximately 47.3%' (contradiction)",
      "Exact percentages without confidence intervals",
      "Precision beyond what methodology warrants",
    ],
    relatedIssues:
      "Often combined with vague methodology and cherry-picked samples",
  },

  "false-dichotomy": {
    emoji: "⚖️",
    title: "False Dichotomy",
    whyThisIsARedFlag:
      "Presenting only two options when many exist forces readers into false choice. Classic manipulation to eliminate consideration of alternatives.",
    commonIn: [
      "Political rhetoric ('with us or against us')",
      "Sales pressure ('buy now or miss out')",
      "Ideological arguments",
      "Product positioning",
    ],
    howToSpotIt: [
      "'Either [our way] or [terrible outcome]'",
      "'You must choose: A or B'",
      "Ignoring middle ground or alternatives",
      "Framing as binary when it's not",
    ],
    relatedIssues: "Often used with fear appeals and urgency tactics",
  },

  "anecdotal-evidence": {
    emoji: "📖",
    title: "Anecdotal Evidence",
    whyThisIsARedFlag:
      "Single personal stories are NOT data. 'My uncle smoked and lived to 90' doesn't mean smoking is safe. Testimonials are cherry-picked successes, not evidence.",
    commonIn: [
      "Health claims ('It worked for me!')",
      "Product testimonials",
      "Success stories",
      "Alternative medicine",
    ],
    howToSpotIt: [
      "'My friend tried this and...'",
      "Single case treated as proof",
      "Testimonials without systematic data",
      "'I know someone who...'",
    ],
    relatedIssues:
      "Related to survivorship bias (only successful anecdotes shared)",
  },

  "appeal-to-nature": {
    emoji: "🌿",
    title: "Appeal to Nature",
    whyThisIsARedFlag:
      "'Natural' doesn't mean 'safe' or 'good' - arsenic, cyanide, and deadly nightshade are all natural. This fallacy is used to sell unproven products.",
    commonIn: [
      "Health/wellness marketing",
      "Supplement claims",
      "Alternative medicine",
      "Food marketing ('all natural')",
    ],
    howToSpotIt: [
      "'Natural, so it's safe'",
      "'Chemical-free' (everything is chemicals!)",
      "'Ancient remedy' as justification",
      "Natural vs synthetic false dichotomy",
    ],
    relatedIssues: "Often combined with appeal to tradition and conspiracy thinking",
  },

  "vague-claims": {
    emoji: "🌫️",
    title: "Vague Claims",
    whyThisIsARedFlag:
      "'Studies show' without citation is weasel wording - allows making claims without accountability. If it's true, why not cite the actual study?",
    commonIn: [
      "Marketing copy",
      "Health claims",
      "Product descriptions",
      "Opinion pieces masquerading as fact",
    ],
    howToSpotIt: [
      "'Studies show...' (which studies?)",
      "'Research proves...' (what research?)",
      "'Experts say...' (which experts?)",
      "'Some people believe...' (weasel words)",
    ],
    relatedIssues: "Often hides lack of evidence or cherry-picked studies",
  },

  "strawman": {
    emoji: "🎪",
    title: "Strawman Argument",
    whyThisIsARedFlag:
      "Misrepresenting opposing views to make them easier to attack is bad faith argumentation. It prevents real debate and shows intellectual dishonesty.",
    commonIn: [
      "Political debates",
      "Ideological arguments",
      "Product comparisons",
      "Academic disputes",
    ],
    howToSpotIt: [
      "Opponent's view stated in extreme/absurd way",
      "Nobody actually holds the stated position",
      "Attacking weak version of argument",
      "Ignoring nuanced actual positions",
    ],
    relatedIssues: "Pattern of bad faith argumentation - watch for other tactics",
  },

  "quote-mining": {
    emoji: "⛏️",
    title: "Quote Mining",
    whyThisIsARedFlag:
      "Taking quotes out of context to misrepresent someone's views. 'Shows promise' means 'needs more research', not 'I endorse this'.",
    commonIn: [
      "Marketing (expert endorsements)",
      "Political attack ads",
      "Product reviews",
      "Media misrepresentation",
    ],
    howToSpotIt: [
      "Partial quotes without full context",
      "'Expert says X' where full quote means opposite",
      "Neutral statements presented as endorsements",
      "'Shows promise' treated as proof",
    ],
    relatedIssues: "Form of deceptive wording and selective citation",
  },

  "missing-context": {
    emoji: "🔍",
    title: "Missing Critical Context",
    whyThisIsARedFlag:
      "Context can completely change interpretation. '100 deaths' sounds bad but could be 100 out of 10 million (0.001%) or 100 out of 1,000 (10%).",
    commonIn: [
      "Statistics without baselines",
      "Comparisons without context",
      "Results without methodology",
      "Claims without qualifiers",
    ],
    howToSpotIt: [
      "Numbers without denominators",
      "Results without comparison groups",
      "Claims without timeframes",
      "Statistics without context",
    ],
    relatedIssues: "Enables many other manipulations by hiding relevant info",
  },

  "confounding": {
    emoji: "🔀",
    title: "Confounding Variables",
    whyThisIsARedFlag:
      "Classic example: Ice cream sales don't cause drowning - both are caused by summer heat. Confusing correlation with causation leads to wrong conclusions.",
    commonIn: [
      "Health studies",
      "Social science research",
      "Business case studies",
      "Causal claims from correlations",
    ],
    howToSpotIt: [
      "X correlates with Y → X causes Y",
      "No mention of controlling for other factors",
      "Obvious third variable could explain both",
      "Observational data treated as causal",
    ],
    relatedIssues: "Related to correlation vs causation errors",
  },

  "whataboutism": {
    emoji: "❓",
    title: "Whataboutism",
    whyThisIsARedFlag:
      "Deflecting criticism by pointing elsewhere doesn't address whether the original criticism is valid. Classic bad faith debate tactic.",
    commonIn: [
      "Political defense",
      "Corporate PR responses",
      "Ideological arguments",
      "Online debates",
    ],
    howToSpotIt: [
      "'What about when you did X?'",
      "'But what about [different issue]?'",
      "Deflecting instead of addressing criticism",
      "Tu quoque (you too) responses",
    ],
    relatedIssues: "Pattern of avoiding accountability and real engagement",
  },
};

/**
 * Get red flag information for an epistemic issue
 */
export function getRedFlagInfo(issue: EpistemicIssue): RedFlagInfo | null {
  const reasoning = issue.issue.reasoning.toLowerCase();

  // Match by reasoning text
  if (reasoning.includes("survivorship")) {
    return RED_FLAG_DICTIONARY["survivorship-bias"];
  }
  if (reasoning.includes("cherry") && reasoning.includes("2020")) {
    return RED_FLAG_DICTIONARY["cherry-picked-timeframe"];
  }
  if (reasoning.includes("selection bias")) {
    return RED_FLAG_DICTIONARY["selection-bias"];
  }
  if (reasoning.includes("false precision")) {
    return RED_FLAG_DICTIONARY["false-precision"];
  }
  if (reasoning.includes("false dichotomy")) {
    return RED_FLAG_DICTIONARY["false-dichotomy"];
  }
  if (reasoning.includes("anecdot")) {
    return RED_FLAG_DICTIONARY["anecdotal-evidence"];
  }
  if (reasoning.includes("appeal to nature")) {
    return RED_FLAG_DICTIONARY["appeal-to-nature"];
  }
  if (reasoning.includes("vague") || reasoning.includes("studies show")) {
    return RED_FLAG_DICTIONARY["vague-claims"];
  }
  if (reasoning.includes("strawman")) {
    return RED_FLAG_DICTIONARY["strawman"];
  }
  if (reasoning.includes("quote mining")) {
    return RED_FLAG_DICTIONARY["quote-mining"];
  }
  if (reasoning.includes("confound")) {
    return RED_FLAG_DICTIONARY["confounding"];
  }
  if (reasoning.includes("whatabout")) {
    return RED_FLAG_DICTIONARY["whataboutism"];
  }
  if (issue.issueType === "missing-context") {
    return RED_FLAG_DICTIONARY["missing-context"];
  }

  return null;
}

/**
 * Format red flag info as markdown
 */
export function formatRedFlagInfo(info: RedFlagInfo): string {
  let markdown = `\n## ${info.emoji} Red Flag: ${info.title}\n\n`;

  markdown += `**Why this is a red flag:**\n${info.whyThisIsARedFlag}\n\n`;

  markdown += `**Commonly seen in:**\n`;
  info.commonIn.forEach((item) => {
    markdown += `- ${item}\n`;
  });

  markdown += `\n**How to spot it:**\n`;
  info.howToSpotIt.forEach((item) => {
    markdown += `- ${item}\n`;
  });

  if (info.relatedIssues) {
    markdown += `\n**Watch out:** ${info.relatedIssues}\n`;
  }

  return markdown;
}
