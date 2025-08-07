// Browser-safe exports only
// This file should be used for any imports that might end up in browser bundles

// Re-export just the enums - these are safe as they compile to plain objects
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum AgentPurpose {
  ASSESSOR = 'ASSESSOR',
  ADVISOR = 'ADVISOR',
  ENRICHER = 'ENRICHER',
  EXPLAINER = 'EXPLAINER'
}

// Type-only exports - these are removed at compile time
export type {
  User,
  Document,
  DocumentVersion,
  Agent,
  AgentVersion,
  Evaluation,
  EvaluationVersion,
  Comment,
  Job,
  JobTask,
  EphemeralBatch,
  EvaluationUpdate,
  AgentEvalBatch,
} from './generated';