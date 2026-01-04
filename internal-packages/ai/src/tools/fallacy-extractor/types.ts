import { IssueType } from '../../analysis-plugins/plugins/fallacy-check/constants';

/**
 * Specific types of fallacies (for logical-fallacy issue type)
 */
export type FallacyType =
  | 'ad-hominem'
  | 'straw-man'
  | 'false-dilemma'
  | 'slippery-slope'
  | 'appeal-to-authority'
  | 'appeal-to-emotion'
  | 'appeal-to-nature'
  | 'hasty-generalization'
  | 'survivorship-bias'
  | 'selection-bias'
  | 'cherry-picking'
  | 'circular-reasoning'
  | 'equivocation'
  | 'non-sequitur'
  | 'other';

/**
 * Raw epistemic issue extracted from a text chunk by the LLM
 */
export interface ExtractedFallacyIssue {
  /** The exact text from the document that has the epistemic issue */
  exactText: string;

  /** Type of epistemic issue identified */
  issueType: IssueType;

  /** Specific fallacy type (only for logical-fallacy issues) */
  fallacyType?: FallacyType;

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
export interface FallacyExtractorInput {
  /** Text chunk to analyze (optional if documentText provided) */
  text?: string;

  /** Full document text - used for analysis in single-pass mode, or for location finding in chunk mode */
  documentText?: string;

  /** Absolute offset where this chunk starts in the full document (optimization) */
  chunkStartOffset?: number;

  /**
   * Optional model to use for extraction.
   * Can be a Claude model (default) or an OpenRouter model ID.
   * Examples: "claude-sonnet-4-20250514", "google/gemini-3-flash-preview"
   */
  model?: string;
}

/**
 * Output from the epistemic issues extractor tool
 */
export interface FallacyExtractorOutput {
  /** Array of extracted epistemic issues */
  issues: ExtractedFallacyIssue[];

  /** Total number of potential issues found (before filtering) */
  totalIssuesFound: number;

  /** Whether the analysis was complete or truncated */
  wasComplete: boolean;
}
