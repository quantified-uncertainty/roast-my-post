import {
  StatusBadge,
  StatusIcon,
} from "../components";
import type {
  BatchSummary,
  Job,
} from "../types";
import {
  formatCost,
  formatRelativeDate,
  formatDuration,
} from "../utils";

interface JobsTabProps {
  jobs: Job[];
  jobsLoading: boolean;
  selectedJob: Job | null;
  setSelectedJob: (job: Job | null) => void;
  selectedBatchFilter: string | null;
  setSelectedBatchFilter: (filter: string | null) => void;
  batches: BatchSummary[];
  fetchJobs: (batchId?: string) => void;
}

export function JobsTab({
  jobs,
  jobsLoading,
  selectedJob,
  setSelectedJob,
  selectedBatchFilter,
  setSelectedBatchFilter,
  batches,
  fetchJobs,
}: JobsTabProps) {
  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Agent Jobs{" "}
          {selectedBatchFilter && (
            <span className="ml-2 rounded-md bg-blue-100 px-2 py-1 text-sm font-medium text-blue-800">
              Batch: {selectedBatchFilter.slice(0, 8)}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-4">
          {selectedBatchFilter && (
            <button
              onClick={() => setSelectedBatchFilter(null)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear batch filter
            </button>
          )}
          <div className="text-sm text-gray-500">{jobs.length} jobs shown</div>
        </div>
      </div>

      {jobsLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-lg text-gray-600">Loading jobs...</div>
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-lg text-gray-600">
            {selectedBatchFilter
              ? "No jobs found for this batch."
              : "No jobs found for this agent."}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {job.document.title}
                    {job.originalJobId && (
                      <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        retry #{(job.attempts || 0) + 1}
                      </span>
                    )}
                  </h4>
                  <p className="text-sm text-gray-500">
                    Agent: {job.agent.name} • Created {formatRelativeDate(job.createdAt)}
                  </p>
                  {job.batch && (
                    <p className="text-sm text-blue-600">
                      Batch: {job.batch.name || `#${job.batch.id.slice(0, 8)}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusIcon status={job.status} />
                  <StatusBadge status={job.status} />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                <span>{formatDuration(job.durationInSeconds)}</span>
                <span>{formatCost(job.costInCents)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
