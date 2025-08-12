export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export enum JobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum AgentPurpose {
  ASSESSOR = 'ASSESSOR',
  ADVISOR = 'ADVISOR',
  ENRICHER = 'ENRICHER',
  EXPLAINER = 'EXPLAINER'
}

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
  Prisma,
  PrismaClient,
} from '../generated';