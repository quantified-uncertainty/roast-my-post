/**
 * Meta-evaluation system for judging agent output quality
 *
 * Provides two evaluation modes:
 * - Scoring: Rate a single output on multiple quality dimensions (1-10)
 * - Ranking: Compare N outputs and rank them relatively
 */

export { scoreComments } from "./scoreComments";
export { rankVersions } from "./rankVersions";

export type {
  // Core types
  QualityDimension,
  CollectionDimension,
  Dimension,
  DimensionScore,
  // Scoring
  ScoringInput,
  ScoringResult,
  // Ranking
  RankingCandidate,
  RankingInput,
  CandidateRanking,
  RankingResult,
  // Options
  MetaEvalOptions,
} from "./types";

export {
  QUALITY_DIMENSIONS,
  COLLECTION_DIMENSIONS,
  DIMENSION_DESCRIPTIONS,
  DEFAULT_META_EVAL_OPTIONS,
} from "./types";
