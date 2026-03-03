/**
 * @roast/jobs - Job processing package for RoastMyPost
 */

// Core services
export { JobOrchestrator, type JobOrchestratorInterface } from './core/JobOrchestrator';
export { PgBossService } from './core/PgBossService';
export { JobService, type BatchCompletionHandler } from './core/JobService';
export { EmailService, type BatchCompletionEmailData } from './core/EmailService';
export { BatchNotificationHandler } from './core/BatchNotificationHandler';

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

// Error utilities
export {
  isRetryableError,
  sanitizeErrorMessage,
} from './errors/retryableErrors';

// Scheduled tasks
export { JobReconciliationService } from './scheduled-tasks/job-reconciliation';

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
