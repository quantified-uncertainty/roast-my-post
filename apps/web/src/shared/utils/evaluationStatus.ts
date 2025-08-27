import type { EvaluationStatus } from "@/components/StatusBadge";

interface EvaluationStatusInfo {
  latestEvaluationStatus: EvaluationStatus;
  isRerunning: boolean;
  hasCompletedVersion: boolean;
}

interface EvaluationData {
  jobs?: Array<{ status: string; createdAt: Date }>;
  versions?: Array<{
    job?: { status: string };
    createdAt?: Date;
  }>;
}

/**
 * Determine the evaluation status based on jobs and versions
 * This is shared logic used across the application for consistent status determination
 */
export function getEvaluationStatus(
  evaluation: EvaluationData
): EvaluationStatusInfo {
  const mostRecentJob = evaluation.jobs?.[0];
  const hasCompletedVersion = !!(
    evaluation.versions &&
    evaluation.versions.length > 0 &&
    evaluation.versions[0]?.job?.status === "COMPLETED"
  );

  let status: EvaluationStatus = "not_started";
  let isRerunning = false;

  if (!mostRecentJob && !hasCompletedVersion) {
    status = "not_started";
  } else if (mostRecentJob) {
    if (mostRecentJob.status === "PENDING") {
      status = "pending";
      isRerunning = hasCompletedVersion;
    } else if (mostRecentJob.status === "RUNNING") {
      status = "running";
      isRerunning = hasCompletedVersion;
    } else if (mostRecentJob.status === "FAILED") {
      status = "failed";
    } else if (mostRecentJob.status === "COMPLETED") {
      status = "completed";
    }
  } else if (hasCompletedVersion) {
    status = "completed";
  }

  return {
    latestEvaluationStatus: status,
    isRerunning,
    hasCompletedVersion,
  };
}

/**
 * Get the content to display for an evaluation based on its status
 * This consolidates the duplicate logic from EvaluationCard components
 */
export function getEvaluationStatusContent(
  status: EvaluationStatus,
  isRerunning: boolean,
  summary: string,
  agentDescription?: string
): string {
  // Show summary if rerunning with pending/running status  
  if (isRerunning && (status === "pending" || status === "running")) {
    return summary;
  }

  const statusText = getStatusDisplayText(status, isRerunning, summary);
  
  if (status === "not_started" && !statusText) {
    return agentDescription || "Not yet evaluated";
  }
  
  if (status === "failed") {
    return (statusText || "Evaluation failed") + " • Click to retry";
  }
  
  return statusText || summary;
}

/**
 * Get the display text for a status
 */
export function getStatusDisplayText(
  status: EvaluationStatus,
  isRerunning: boolean,
  defaultText?: string
): string {
  if (isRerunning && (status === "pending" || status === "running")) {
    return defaultText || "";
  }

  switch (status) {
    case "pending":
      return "Queued • Waiting to start...";
    case "running":
      return "Processing • This may take a few moments...";
    case "failed":
      return "Evaluation failed";
    case "not_started":
      return "Not yet evaluated";
    default:
      return defaultText || "";
  }
}

/**
 * Map job status strings to our evaluation status types
 */
export function mapJobStatusToEvaluationStatus(
  jobStatus: string
): EvaluationStatus {
  switch (jobStatus) {
    case "PENDING":
      return "pending";
    case "RUNNING":
      return "running";
    case "FAILED":
      return "failed";
    case "COMPLETED":
      return "completed";
    default:
      return "not_started";
  }
}
