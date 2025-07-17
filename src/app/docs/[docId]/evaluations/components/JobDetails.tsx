import React from "react";
import { JobSummary, TaskDisplay } from "@/components/job";


interface JobDetailsProps {
  job: {
    id: string;
    status: string;
    createdAt?: string | Date;
    error?: string;
    logs?: string;
    tasks?: Array<{
      id: string;
      name: string;
      modelName: string;
      priceInDollars: number;
      timeInSeconds: number | null;
      log: string | null;
      createdAt: Date;
    }>;
    attempts?: number;
    originalJobId?: string | null;
  };
}

export const JobDetails: React.FC<JobDetailsProps> = ({ job }) => {
  const [showLogs, setShowLogs] = React.useState(false);
  
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <JobSummary 
        job={{
          id: job.id,
          status: job.status,
          createdAt: job.createdAt || new Date(),
          attempts: job.attempts,
          originalJobId: job.originalJobId,
          error: job.error
        }}
      />
      
      {job.logs && (
        <div className="mt-4">
          <button
            className="mb-1 text-xs text-blue-700 underline"
            onClick={() => setShowLogs((v) => !v)}
          >
            {showLogs ? "Hide Logs" : "Show Logs"}
          </button>
          {showLogs && (
            <pre className="mt-1 max-h-96 overflow-auto rounded border border-gray-200 bg-gray-100 p-2 text-xs text-gray-800">
              {job.logs}
            </pre>
          )}
        </div>
      )}
      
      {job.tasks && job.tasks.length > 0 && (
        <div className="mt-4">
          <h3 className="text-md mb-2 font-semibold">Tasks</h3>
          <TaskDisplay 
            tasks={job.tasks.map(task => ({
              ...task,
              priceInDollars: Number(task.priceInDollars)
            }))}
          />
        </div>
      )}
    </div>
  );
};
