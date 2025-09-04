/**
 * Constants for the Fact Check Plugin
 */

// Scoring thresholds
export const THRESHOLDS = {
  // Importance score thresholds
  IMPORTANCE_HIGH: 70,
  IMPORTANCE_MEDIUM: 50,

  // Checkability score thresholds
  CHECKABILITY_HIGH: 60,

  // Truth probability thresholds
  TRUTH_PROBABILITY_HIGH: 90,
  TRUTH_PROBABILITY_MEDIUM: 70,
  TRUTH_PROBABILITY_LOW: 50,
  TRUTH_PROBABILITY_VERY_LOW: 40,
  TRUTH_PROBABILITY_LIKELY_FALSE: 30,

  // Quality threshold for extraction
  MIN_QUALITY_THRESHOLD: 40,
} as const;

// Limits and counts
export const LIMITS = {
  // Maximum facts to verify per analysis
  MAX_FACTS_TO_VERIFY: 50,

  // Maximum claims to extract per chunk
  MAX_CLAIMS_PER_CHUNK: 20,

  // Minimum key phrase length for fuzzy matching
  MIN_KEY_PHRASE_LENGTH: 10,
} as const;

// UI formatting
export const FORMATTING = {
  // Maximum score value for display
  MAX_SCORE: 100,
} as const;
