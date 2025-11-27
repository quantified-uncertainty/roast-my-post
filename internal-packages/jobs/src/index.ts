/**
 * @roast/jobs - Job processing package for RoastMyPost
 */

// Core services
export { JobOrchestrator, type JobOrchestratorInterface } from './core/JobOrchestrator';
export { PgBossService } from './core/PgBossService';

// Job types
export {
  DOCUMENT_EVALUATION_JOB,
  type JobType,
  type DocumentEvaluationJobData,
  type JobData,
} from './types/jobTypes';

// Configuration
export {
  AGENT_TIMEOUT_CONFIG,
  getAgentTimeout,
  formatTimeout,
} from './config/agentTimeouts';

// Types
export type {
  Document,
  TaskResult,
  AnalysisResult,
  WorkflowContext,
  WorkflowFunction,
  WorkflowRegistry,
  Logger,
  JobProcessingResult,
  CompletionData,
} from './types';
