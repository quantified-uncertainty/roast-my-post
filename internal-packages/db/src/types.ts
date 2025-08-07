// Browser-safe type exports
// This file only exports types and enums that are safe to use in browser environments

// Re-export just the enum values without the rest of Prisma client
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

// Type-only exports from Prisma
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
  Prisma,
} from '../generated';