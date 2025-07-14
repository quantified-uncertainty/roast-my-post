/**
 * Configuration constants for spelling/grammar analysis
 */

// Chunk processing
export const DEFAULT_CHUNK_SIZE = 3000;
export const MAX_CHUNK_SIZE = 5000;
export const MIN_CHUNK_SIZE = 500;

// Retry configuration
export const MAX_RETRIES = 3;
export const RETRY_BASE_DELAY_MS = 2000; // Exponential backoff: 2s, 4s, 8s

// API rate limiting
export const CONCURRENT_CHUNK_LIMIT = 5;
export const API_STAGGER_DELAY_MS = 500;

// Analysis thresholds
export const GRADE_THRESHOLDS = {
  EXCELLENT: 95,
  GOOD: 85,
  NEEDS_IMPROVEMENT: 75,
  SIGNIFICANT_ISSUES: 65
} as const;

// Error density calculation
export const ERROR_DENSITY_WORD_BASE = 100; // errors per X words

// Empty document response
export const EMPTY_DOCUMENT_RESPONSE = {
  thinking: "",
  analysis: "## Spelling & Grammar Analysis\n\nThe document is empty.",
  summary: "No spelling or grammar errors detected.",
  grade: 100,
  selfCritique: undefined,
  highlights: [],
  tasks: []
} as const;

// Importance and grade mapping based on severity
export const SEVERITY_TO_IMPORTANCE = {
  high: 8,
  medium: 5,
  low: 3
} as const;

export const SEVERITY_TO_GRADE = {
  high: 20,
  medium: 40,
  low: 60
} as const;

// Error type classifications
export const ERROR_TYPE_PATTERNS = {
  spelling: /spelling|misspell|typo/i,
  grammar: /grammar|subject-verb|tense|syntax/i,
  punctuation: /punctuation|comma|period|semicolon|colon|apostrophe/i,
  capitalization: /capital|uppercase|lowercase|case/i,
  word_choice: /word choice|wrong word|confused word/i,
  consistency: /consistency|inconsistent|mixed/i
} as const;

// Logging prefixes for consistency
export const LOG_PREFIXES = {
  CHUNK_ANALYSIS: '[SpellingGrammar:Chunk]',
  WORKFLOW: '[SpellingGrammar:Workflow]',
  POST_PROCESSING: '[SpellingGrammar:PostProcess]',
  ERROR: '[SpellingGrammar:Error]'
} as const;