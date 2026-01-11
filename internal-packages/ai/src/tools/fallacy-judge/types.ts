/**
 * Types for the Fallacy Judge Aggregator Tool
 *
 * The judge aggregates issues from multiple extractors,
 * merging duplicates and filtering weak single-source issues.
 */

import type { ExtractedFallacyIssue } from '../fallacy-extractor/types';

/**
 * An issue from a specific extractor
 */
export interface ExtractorIssueInput {
  /** Which extractor found this issue */
  extractorId: string;

  /** The exact text flagged */
  exactText: string;

  /** Issue type */
  issueType: string;

  /** Specific fallacy type (if applicable) */
  fallacyType?: string;

  /** Severity score (0-100) */
  severityScore: number;

  /** Confidence score (0-100) */
  confidenceScore: number;

  /** Importance score (0-100) */
  importanceScore: number;

  /** Reasoning from the extractor */
  reasoning: string;
}

/**
 * Input for the fallacy judge tool
 */
export interface FallacyJudgeInput {
  /** Full document text for context */
  documentText: string;

  /** All issues from all extractors */
  issues: ExtractorIssueInput[];

  /** List of extractor IDs that contributed */
  extractorIds: string[];
}

/**
 * A judge decision on a single issue or group of similar issues
 */
export interface JudgeDecision {
  /** Judge's decision on this issue/group */
  decision: 'accept' | 'merge' | 'reject';

  /** Final merged/accepted issue text */
  finalText: string;

  /** Final issue type */
  finalIssueType: string;

  /** Final fallacy type (if applicable) */
  finalFallacyType?: string;

  /** Final severity (may be adjusted by judge) */
  finalSeverity: number;

  /** Final confidence (may be adjusted by judge) */
  finalConfidence: number;

  /** Final importance (may be adjusted by judge) */
  finalImportance: number;

  /** Best reasoning from sources (or synthesized by judge) */
  finalReasoning: string;

  /** Which extractors found this issue */
  sourceExtractors: string[];

  /** Original issues from each extractor (indices into input.issues) */
  sourceIssueIndices: number[];

  /** Judge's reasoning for this decision */
  judgeReasoning: string;
}

/**
 * Output from the fallacy judge tool
 */
export interface FallacyJudgeOutput {
  /** Decisions for accepted/merged issues */
  acceptedDecisions: JudgeDecision[];

  /** Decisions for rejected issues (for telemetry) */
  rejectedDecisions: JudgeDecision[];

  /** Summary stats */
  summary: {
    totalInputIssues: number;
    uniqueGroups: number;
    acceptedCount: number;
    mergedCount: number;
    rejectedCount: number;
  };
}

/**
 * Convert judge decisions back to ExtractedFallacyIssue format
 */
export function decisionToIssue(decision: JudgeDecision): ExtractedFallacyIssue {
  return {
    exactText: decision.finalText,
    issueType: decision.finalIssueType as ExtractedFallacyIssue['issueType'],
    fallacyType: decision.finalFallacyType as ExtractedFallacyIssue['fallacyType'],
    severityScore: decision.finalSeverity,
    confidenceScore: decision.finalConfidence,
    importanceScore: decision.finalImportance,
    reasoning: decision.finalReasoning,
  };
}
