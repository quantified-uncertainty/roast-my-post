import { JobCard } from "@/components/job";
import type {
  BatchSummary,
  Job,
} from "../types";

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
            <JobCard
              key={job.id}
              job={{
                id: job.id,
                status: job.status,
                createdAt: job.createdAt,
                durationInSeconds: job.durationInSeconds,
                priceInDollars: job.priceInDollars,
                attempts: job.attempts,
                originalJobId: job.originalJobId,
                document: {
                  id: job.document.id,
                  title: job.document.title
                },
                agent: {
                  id: job.agent.id,
                  name: job.agent.name
                },
                batch: job.batch
              }}
              showDocument={true}
              showAgent={false}
              showBatch={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}
