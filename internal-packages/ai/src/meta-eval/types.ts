/**
 * Types for the meta-evaluation system
 * Used for scoring and ranking agent outputs
 */

import type { Comment } from "../shared/types";

/**
 * Quality dimensions for evaluating comments
 * Based on Ozzie's criteria for what makes a good comment
 */
export const QUALITY_DIMENSIONS = [
  "accuracy",
  "importance",
  "clarity",
  "surprise",
  "verifiability",
  "tone",
] as const;

export type QualityDimension = (typeof QUALITY_DIMENSIONS)[number];

/**
 * Collection-level dimensions (for evaluating a set of comments)
 */
export const COLLECTION_DIMENSIONS = ["coverage", "redundancy"] as const;

export type CollectionDimension = (typeof COLLECTION_DIMENSIONS)[number];

/**
 * All dimensions combined
 */
export type Dimension = QualityDimension | CollectionDimension;

/**
 * Dimension descriptions for prompts
 */
export const DIMENSION_DESCRIPTIONS: Record<Dimension, string> = {
  accuracy:
    "Are the identified issues real? Not hallucinated? Based on actual content?",
  importance:
    "Worth the reader's attention? Not trivial or pedantic? Addresses significant issues?",
  clarity:
    "Punchy, easy to understand, unambiguous? Gets to the point quickly?",
  surprise:
    "Non-obvious? Adds value beyond what the reader would notice on their own?",
  verifiability:
    "Can the reader check if it's correct? Provides sources or reasoning?",
  tone: "Constructive? Professional? Unlikely to upset people unnecessarily?",
  coverage:
    "Did the comments catch the important issues in the document? Nothing major missed?",
  redundancy:
    "Minimal overlap between comments? Each comment adds unique value? (higher = less redundant)",
};

/**
 * Score for a single dimension
 */
export interface DimensionScore {
  score: number; // 1-10
  explanation: string;
}

/**
 * Input for scoring a single evaluation output
 */
export interface ScoringInput {
  sourceText: string;
  comments: Comment[];
  agentName?: string;
}

/**
 * Result of scoring a single evaluation output
 */
export interface ScoringResult {
  overallScore: number; // 1-10, weighted average
  dimensions: Record<Dimension, DimensionScore>;
  reasoning: string;
}

/**
 * A candidate evaluation for ranking
 */
export interface RankingCandidate {
  versionId: string;
  comments: Comment[];
  agentName?: string;
}

/**
 * Input for ranking multiple evaluation outputs
 */
export interface RankingInput {
  sourceText: string;
  candidates: RankingCandidate[];
}

/**
 * Individual ranking result for one candidate
 */
export interface CandidateRanking {
  versionId: string;
  rank: number; // 1 = best
  relativeScore: number; // 0-100 normalized
}

/**
 * Result of ranking multiple evaluation outputs
 */
export interface RankingResult {
  rankings: CandidateRanking[];
  reasoning: string;
  sessionId: string; // Groups rankings from same comparison
}

/**
 * Options for meta-evaluation
 */
export interface MetaEvalOptions {
  model?: string; // LLM model to use for judging
  temperature?: number;
  maxTokens?: number;
}

/**
 * Default options
 */
export const DEFAULT_META_EVAL_OPTIONS: Required<MetaEvalOptions> = {
  model: "claude-sonnet-4-20250514",
  temperature: 0.3,
  maxTokens: 4096,
};
