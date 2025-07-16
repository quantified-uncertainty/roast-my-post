import { JobStatusBadge } from "./JobStatusBadge";
import { formatCost, formatDuration, formatDate } from "@/lib/job/formatters";
import { CopyButton } from "@/components/CopyButton";

interface JobSummaryProps {
  job: {
    id: string;
    status: string;
    createdAt: string | Date;
    completedAt?: string | Date | null;
    startedAt?: string | Date | null;
    durationInSeconds?: number | null;
    costInCents?: number | null;
    attempts?: number;
    originalJobId?: string | null;
    error?: string | null;
  };
  showError?: boolean;
  compact?: boolean;
}

export function JobSummary({ job, showError = true, compact = false }: JobSummaryProps) {
  return (
    <div className={`${compact ? 'space-y-2' : 'space-y-4'}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Job Details
          {job.originalJobId && (
            <span className="ml-2 text-sm bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-normal">
              Retry #{(job.attempts || 0) + 1}
            </span>
          )}
        </h3>
        <JobStatusBadge status={job.status} showIcon />
      </div>

      <div className={`grid ${compact ? 'grid-cols-1 gap-2' : 'grid-cols-1 md:grid-cols-2 gap-4'}`}>
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-1">Job ID</h4>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-900 font-mono">{job.id}</p>
            <CopyButton text={job.id} />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-1">Status</h4>
          <JobStatusBadge status={job.status} />
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-1">Created</h4>
          <p className="text-sm text-gray-900">{formatDate(job.createdAt)}</p>
        </div>

        {job.startedAt && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Started</h4>
            <p className="text-sm text-gray-900">{formatDate(job.startedAt)}</p>
          </div>
        )}

        {job.completedAt && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Completed</h4>
            <p className="text-sm text-gray-900">{formatDate(job.completedAt)}</p>
          </div>
        )}

        {job.durationInSeconds && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Duration</h4>
            <p className="text-sm text-gray-900">{formatDuration(job.durationInSeconds)}</p>
          </div>
        )}

        {job.costInCents && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Cost</h4>
            <p className="text-sm text-gray-900">{formatCost(job.costInCents)}</p>
          </div>
        )}
      </div>

      {showError && job.error && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Error</h4>
          <div className="p-3 bg-red-50 rounded-md">
            <p className="text-sm text-red-800">{job.error}</p>
          </div>
        </div>
      )}
    </div>
  );
}