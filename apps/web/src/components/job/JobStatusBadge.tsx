import { getStatusIcon, getStatusStyles, JobStatus } from "@/application/services/job/status";

interface JobStatusBadgeProps {
  status: JobStatus | string;
  showIcon?: boolean;
}

export function JobStatusBadge({ status, showIcon = false }: JobStatusBadgeProps) {
  return (
    <span className={getStatusStyles(status)}>
      {showIcon && <span className="mr-1">{getStatusIcon(status, 'sm')}</span>}
      {status.toLowerCase()}
    </span>
  );
}

export function JobStatusIcon({ status }: { status: JobStatus | string }) {
  return getStatusIcon(status, 'md');
}

// Re-export for backward compatibility
export type { JobStatus };