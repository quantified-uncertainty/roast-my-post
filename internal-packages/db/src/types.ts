// Browser-safe type exports
// This file only exports types and enums that are safe to use in browser environments

// Define Plan enum directly here since re-exporting from generated causes type issues
export enum Plan {
  REGULAR = 'REGULAR',
  PRO = 'PRO'
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export enum JobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
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
  EvaluationComment,
  Job,
  AgentEvalBatch,
} from '../generated';
