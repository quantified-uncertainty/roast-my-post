/**
 * Job Type Constants
 *
 * Defines all job types supported by the system.
 * Each job type has its own handler and data structure.
 */

/**
 * Job type for document evaluation
 * Analyzes a document with an AI agent and generates highlights, grade, critique
 */
export const DOCUMENT_EVALUATION_JOB = 'document-evaluation';

/**
 * All supported job types
 * Add new job types here as they're implemented
 */
export type JobType = typeof DOCUMENT_EVALUATION_JOB;

/**
 * Job data for document evaluation
 */
export interface DocumentEvaluationJobData {
  jobId: string; // Reference to Job table record
  evaluationId: string;
  agentEvalBatchId?: string | null;
}

/**
 * Union type for all job data structures
 * Add new job data types here
 */
export type JobData = DocumentEvaluationJobData;
