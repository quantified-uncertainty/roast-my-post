import React, { useState } from "react";

import { TaskLogs } from "./TaskLogs";

interface Task {
  id: string;
  name: string;
  modelName: string;
  priceInCents: number;
  timeInSeconds: number | null;
  log: string | null;
  createdAt: Date;
}

interface JobDetailsProps {
  job: {
    id: string;
    status: string;
    createdAt?: string | Date;
    error?: string;
    logs?: string;
    tasks?: Task[];
    attempts?: number;
    originalJobId?: string | null;
  };
}

export const JobDetails: React.FC<JobDetailsProps> = ({ job }) => {
  const [showLogs, setShowLogs] = useState(false);
  const [showError, setShowError] = useState(false);
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="mb-2 text-lg font-bold">
        Job Details
        {job.originalJobId && (
          <span className="ml-2 text-sm bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-normal">
            Retry #{(job.attempts || 0) + 1}
          </span>
        )}
      </h2>
      <div className="mb-2">
        <strong>ID:</strong> {job.id}
      </div>
      <div className="mb-2">
        <strong>Status:</strong> {job.status}
      </div>
      {job.createdAt && (
        <div className="mb-2">
          <strong>Created At:</strong>{" "}
          {typeof job.createdAt === "string"
            ? new Date(job.createdAt).toLocaleString()
            : job.createdAt.toLocaleString()}
        </div>
      )}
      {job.error && (
        <div className="mb-2 text-red-600">
          <button
            className="mb-1 text-xs text-red-700 underline"
            onClick={() => setShowError((v) => !v)}
          >
            {showError ? "Hide Error" : "Show Error"}
          </button>
          {showError && (
            <pre className="mt-1 max-h-96 overflow-auto rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800">
              {job.error}
            </pre>
          )}
        </div>
      )}
      {job.logs && (
        <div className="mb-2">
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
          {/* Reuse TaskLogs, faking selectedVersion shape */}
          <TaskLogs
            selectedVersion={{
              createdAt: new Date(),
              comments: [],
              summary: "",
              documentVersion: { version: 0 },
              job: { tasks: job.tasks, costInCents: 0, llmThinking: "" },
            }}
          />
        </div>
      )}
    </div>
  );
};
