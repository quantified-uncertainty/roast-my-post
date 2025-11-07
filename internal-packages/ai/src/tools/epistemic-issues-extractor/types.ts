import { IssueType } from '../../analysis-plugins/plugins/epistemic-critic/constants';

/**
 * Claim type classification for context-aware severity adjustment
 */
export enum ClaimType {
  /** Empirical/descriptive claims about the world: "Studies show...", "The rate increased..." */
  DESCRIPTIVE = 'DESCRIPTIVE',

  /** Normative/evaluative claims: "Only viable justifications...", "Should...", moral reasoning */
  NORMATIVE = 'NORMATIVE',

  /** Personal beliefs/introspection: "I believe...", "My intuition...", personal experiences */
  PERSONAL = 'PERSONAL',

  /** Rhetorical emphasis: Vivid phrasing, emphatic language, persuasive framing */
  RHETORICAL = 'RHETORICAL',
}

/**
 * Document genre for context-aware standards
 */
export enum DocumentGenre {
  /** Personal blog post or informal writing */
  BLOG_POST = 'BLOG_POST',

  /** EA Forum post or similar community writing */
  FORUM_POST = 'FORUM_POST',

  /** Research report or white paper */
  RESEARCH_REPORT = 'RESEARCH_REPORT',

  /** Policy brief or professional document */
  POLICY_BRIEF = 'POLICY_BRIEF',

  /** Academic paper */
  ACADEMIC_PAPER = 'ACADEMIC_PAPER',
}

/**
 * Raw epistemic issue extracted from a text chunk by the LLM
 */
export interface ExtractedEpistemicIssue {
  /** The exact text from the document that has the epistemic issue */
  exactText: string;

  /** Type of epistemic issue identified */
  issueType: IssueType;

  /** Severity score from 0-100 (higher = more severe) */
  severityScore: number;

  /** Confidence score from 0-100 (higher = more confident this is the fallacy) */
  confidenceScore: number;

  /** Detailed reasoning for why this is an issue */
  reasoning: string;

  /** Suggested context or correction (optional) */
  suggestedContext?: string;

  /** Importance score from 0-100 (higher = more important to address) */
  importanceScore: number;

  /** How researchable is this claim? 0-100 (higher = easier to fact-check) */
  researchableScore: number;

  /** Specific research query if this issue should be researched */
  researchQuery?: string;

  /** Claim type classification for context-aware adjustment */
  claimType?: ClaimType;

  /** Centrality score: how important is this to the document's core argument (0-100) */
  centralityScore?: number;

  /** Whether the claim has explicit hedging ("I think", "probably", "might") */
  hasHedging?: boolean;

  /** Adversarial confidence: how confident we are this is deliberate manipulation (0-100) */
  adversarialConfidence?: number;

  /** Adjusted severity after context-aware calibration (0-100) */
  adjustedSeverity?: number;

  /** Priority score for ranking issues, combines adjusted severity and centrality (0-100) */
  priorityScore?: number;

  /** Allow additional properties for ToolResult compatibility */
  [key: string]: unknown;
}

/**
 * Input for the epistemic issues extractor tool
 */
export interface EpistemicIssuesExtractorInput {
  /** Text chunk to analyze */
  text: string;

  /** Which types of issues to focus on */
  focusAreas?: IssueType[];

  /** Minimum severity threshold (0-100) */
  minSeverityThreshold?: number;

  /** Maximum number of issues to return */
  maxIssues?: number;

  /** Document genre for context-aware standards */
  genre?: DocumentGenre;
}

/**
 * Output from the epistemic issues extractor tool
 */
export interface EpistemicIssuesExtractorOutput {
  /** Array of extracted epistemic issues */
  issues: ExtractedEpistemicIssue[];

  /** Total number of potential issues found (before filtering) */
  totalIssuesFound: number;

  /** Whether the analysis was complete or truncated */
  wasComplete: boolean;
}
