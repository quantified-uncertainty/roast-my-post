/**
 * Configuration constants for the epistemic critic plugin
 */

export const THRESHOLDS = {
  /** Critical severity - generates error-level comments */
  SEVERITY_CRITICAL: 80,

  /** High severity - generates warning/error comments, triggers research */
  SEVERITY_HIGH: 60,

  /** Medium severity - generates warning comments */
  SEVERITY_MEDIUM: 40,

  /** Low severity - generates info comments */
  SEVERITY_LOW: 20,

  /** Confidence thresholds for header prefixes */
  CONFIDENCE_CLEAR: 80,
  CONFIDENCE_LIKELY: 60,
  CONFIDENCE_POSSIBLE: 0,

  /** Importance thresholds */
  IMPORTANCE_NITPICK: 30,

  /** Minimum severity score for using Perplexity research */
  MIN_SEVERITY_FOR_RESEARCH: 60,

  /** Minimum researchability score for using Perplexity research */
  MIN_RESEARCHABILITY_FOR_RESEARCH: 50,
} as const;

export const LIMITS = {
  /** Maximum number of issues to process per document */
  MAX_ISSUES_TO_PROCESS: 25,

  /** Maximum number of issues to extract per chunk */
  MAX_ISSUES_PER_CHUNK: 15,

  /** Minimum length for key phrase extraction (for location finding) */
  MIN_KEY_PHRASE_LENGTH: 10,
} as const;

export const ISSUE_TYPES = {
  MISINFORMATION: 'misinformation',
  MISSING_CONTEXT: 'missing-context',
  DECEPTIVE_WORDING: 'deceptive-wording',
  LOGICAL_FALLACY: 'logical-fallacy',
  VERIFIED_ACCURATE: 'verified-accurate',
} as const;

export type IssueType = typeof ISSUE_TYPES[keyof typeof ISSUE_TYPES];
