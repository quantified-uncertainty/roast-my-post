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

  /** Importance score from 0-100 (higher = more important to address) */
  importanceScore: number;

  /** Approximate line number where this text appears (helps with location finding) */
  approximateLineNumber?: number;

  /** Exact location in the document (populated by tool during location finding) */
  location?: {
    startOffset: number;
    endOffset: number;
    quotedText: string;
    strategy?: string;
    confidence?: number;
  };

  /** Allow additional properties for ToolResult compatibility */
  [key: string]: unknown;
}

/**
 * Input for the epistemic issues extractor tool
 */
export interface EpistemicIssuesExtractorInput {
  /** Text chunk to analyze */
  text: string;

  /** Full document text (for accurate location finding in full doc) */
  documentText?: string;

  /** Absolute offset where this chunk starts in the full document (optimization) */
  chunkStartOffset?: number;

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
