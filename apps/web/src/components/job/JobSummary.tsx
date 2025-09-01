"use client";

import { useState } from "react";
import { JobStatusBadge } from "./JobStatusBadge";
import { LogsViewer } from "./LogsViewer";
import { formatCostFromDollars, formatDuration, formatDate } from "@/application/services/job/formatters";
import { JobData } from "@/application/services/job/types";
import { getRetryText } from "@/application/services/job/transformers";
import { CopyButton } from "@/components/CopyButton";
import { XCircle } from "lucide-react";

interface JobSummaryProps {
  job: JobData & { 
    logs?: string;
    cancelledAt?: string | null;
    cancelledBy?: {
      id: string;
      name: string | null;
      email: string;
    } | null;
    cancellationReason?: string | null;
  };
  showError?: boolean;
  showLogs?: boolean;
  compact?: boolean;
  onCancel?: () => void;
  canCancel?: boolean;
}

export function JobSummary({ 
  job, 
  showError = true, 
  showLogs = true, 
  compact = false,
  onCancel,
  canCancel = false 
}: JobSummaryProps) {
  const retryText = getRetryText(job);
  const [isCancelling, setIsCancelling] = useState(false);
  
  const handleCancel = async () => {
    if (!onCancel) return;
    setIsCancelling(true);
    try {
      await onCancel();
    } finally {
      setIsCancelling(false);
    }
  };
  
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
        <div className="flex items-center gap-2">
          <JobStatusBadge status={job.status} showIcon />
          {canCancel && (job.status === 'PENDING' || job.status === 'RUNNING') && (
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Cancel this job"
            >
              <XCircle className="h-4 w-4" />
              {isCancelling ? 'Cancelling...' : 'Cancel'}
            </button>
          )}
        </div>
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

      {job.status === 'CANCELLED' && job.cancelledAt && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Cancellation Details</h4>
          <div className="p-3 bg-gray-50 rounded-md space-y-2">
            <div className="text-sm">
              <span className="font-medium">Cancelled by:</span>{' '}
              {job.cancelledBy ? (job.cancelledBy.name || job.cancelledBy.email) : 'Unknown'}
            </div>
            <div className="text-sm">
              <span className="font-medium">Cancelled at:</span>{' '}
              {formatDate(job.cancelledAt)}
            </div>
            {job.cancellationReason && (
              <div className="text-sm">
                <span className="font-medium">Reason:</span>{' '}
                {job.cancellationReason}
              </div>
            )}
          </div>
        </div>
      )}

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