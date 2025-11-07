import { IssueType } from '../../analysis-plugins/plugins/epistemic-critic/constants';

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
