import { JobData } from "./types";

// Extract document information from job data
export function getDocumentInfo(job: JobData) {
  const documentTitle = job.evaluation?.document.versions[0]?.title || job.document?.title || 'Unknown Document';
  const documentId = job.evaluation?.document.id || job.document?.id;
  
  return {
    id: documentId,
    title: documentTitle
  };
}

// Extract agent information from job data
export function getAgentInfo(job: JobData) {
  const agentName = job.evaluation?.agent.versions[0]?.name || job.agent?.name || 'Unknown Agent';
  const agentId = job.evaluation?.agent.id || job.agent?.id;
  
  return {
    id: agentId,
    name: agentName
  };
}

// Extract batch information from job data
export function getBatchInfo(job: JobData) {
  if (!job.batch) return null;
  
  return {
    id: job.batch.id,
    name: job.batch.name || `#${job.batch.id.slice(0, 8)}`
  };
}

// Check if job is a retry
export function isRetryJob(job: JobData): boolean {
  return Boolean(job.originalJobId);
}

// Get retry display text
export function getRetryText(job: JobData): string | null {
  if (!isRetryJob(job)) return null;
  return `retry #${(job.attempts || 0) + 1}`;
}

// Get total task cost in dollars
export function getTotalTaskCost(job: JobData): number {
  if (!job.tasks) return 0;
  return job.tasks.reduce((sum, task) => sum + task.priceInDollars, 0);
}

// Get total task time in seconds
export function getTotalTaskTime(job: JobData): number {
  if (!job.tasks) return 0;
  return job.tasks.reduce((sum, task) => sum + (task.timeInSeconds || 0), 0);
}

// Check if job has error
export function hasError(job: JobData): boolean {
  return Boolean(job.error);
}

// Check if job is completed
export function isCompleted(job: JobData): boolean {
  return job.status === 'COMPLETED';
}

// Check if job is running
export function isRunning(job: JobData): boolean {
  return job.status === 'RUNNING';
}

// Check if job failed
export function isFailed(job: JobData): boolean {
  return job.status === 'FAILED';
}