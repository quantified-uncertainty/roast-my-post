import { JobStatusBadge } from "./JobStatusBadge";
import { LogsViewer } from "./LogsViewer";
import { formatCostFromDollars, formatDuration, formatDate } from "@/lib/job/formatters";
import { JobData } from "@/lib/job/types";
import { getRetryText } from "@/lib/job/transformers";
import { CopyButton } from "@/components/CopyButton";

interface JobSummaryProps {
  job: JobData & { logs?: string };
  showError?: boolean;
  showLogs?: boolean;
  compact?: boolean;
}

export function JobSummary({ job, showError = true, showLogs = true, compact = false }: JobSummaryProps) {
  const retryText = getRetryText(job);
  
  return (
    <div className={`${compact ? 'space-y-2' : 'space-y-4'}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Job Details
          {retryText && (
            <span className="ml-2 text-sm bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-normal">
              {retryText}
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

        {job.priceInDollars && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Cost</h4>
            <p className="text-sm text-gray-900">{formatCostFromDollars(job.priceInDollars)}</p>
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

      {showLogs && job.logs && (
        <div className="mt-4">
          <LogsViewer 
            logs={job.logs} 
            defaultExpanded={false}
            title="Job Logs"
          />
        </div>
      )}
    </div>
  );
}