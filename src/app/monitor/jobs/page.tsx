"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon, 
  PlayIcon 
} from "@heroicons/react/24/outline";
import { JobDetails } from "@/app/docs/[docId]/evaluations/components/JobDetails";

interface Job {
  id: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
  logs?: string;
  costInCents?: number;
  durationInSeconds?: number;
  attempts: number;
  originalJobId?: string | null;
  evaluation: {
    document: {
      id: string;
      versions: Array<{
        title: string;
      }>;
    };
    agent: {
      id: string;
      versions: Array<{
        name: string;
      }>;
    };
  };
  tasks?: Array<{
    id: string;
    name: string;
    modelName: string;
    priceInCents: number;
    timeInSeconds: number | null;
    log: string | null;
    createdAt: Date;
  }>;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
    case "FAILED":
      return <XCircleIcon className="h-5 w-5 text-red-600" />;
    case "RUNNING":
      return <PlayIcon className="h-5 w-5 text-blue-600 animate-pulse" />;
    case "PENDING":
      return <ClockIcon className="h-5 w-5 text-yellow-600" />;
    default:
      return <ClockIcon className="h-5 w-5 text-gray-600" />;
  }
};

const getStatusBadge = (status: string) => {
  const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
  switch (status) {
    case "COMPLETED":
      return `${baseClasses} bg-green-100 text-green-800`;
    case "FAILED":
      return `${baseClasses} bg-red-100 text-red-800`;
    case "RUNNING":
      return `${baseClasses} bg-blue-100 text-blue-800`;
    case "PENDING":
      return `${baseClasses} bg-yellow-100 text-yellow-800`;
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`;
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (durationInSeconds?: number) => {
  if (!durationInSeconds) return "—";
  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = durationInSeconds % 60;
  return `${minutes}m ${seconds}s`;
};

const formatCost = (costInCents?: number) => {
  if (!costInCents) return "—";
  return `$${(costInCents / 100).toFixed(3)}`;
};

export default function JobsMonitorPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/monitor/jobs");
        if (!response.ok) {
          throw new Error("Failed to fetch jobs");
        }
        const data = await response.json();
        setJobs(data.jobs);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading jobs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Jobs Monitor</h1>
        <div className="text-sm text-gray-500">
          Last 20 jobs • Auto-refresh every 30s
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Job List */}
        <div className="col-span-4 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Jobs</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-[calc(100vh-300px)] overflow-y-auto">
            {jobs.map((job) => (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedJob?.id === job.id ? "bg-blue-50 border-r-4 border-blue-500" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(job.status)}
                    <span className="font-mono text-sm text-gray-900">
                      {job.id.slice(0, 8)}...
                    </span>
                    {job.originalJobId && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded" title={`Retry attempt ${job.attempts + 1}`}>
                        retry
                      </span>
                    )}
                  </div>
                  <span className={getStatusBadge(job.status)}>
                    {job.status}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600 mb-1">
                  <div className="font-medium">{job.evaluation.document.versions[0]?.title || 'Unknown Document'}</div>
                  <div className="text-xs">Agent: {job.evaluation.agent.versions[0]?.name || 'Unknown Agent'}</div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{formatDate(job.createdAt)}</span>
                  <div className="flex space-x-3">
                    <span>{formatDuration(job.durationInSeconds)}</span>
                    <span>{formatCost(job.costInCents)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Job Details */}
        <div className="col-span-8">
          {selectedJob ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Job Details</h2>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedJob.status)}
                    <span className={getStatusBadge(selectedJob.status)}>
                      {selectedJob.status}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="font-medium text-gray-900">Job ID</dt>
                    <dd className="font-mono text-gray-600">
                      {selectedJob.id}
                      {selectedJob.originalJobId && (
                        <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          Retry #{selectedJob.attempts + 1}
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900">Document</dt>
                    <dd className="space-y-1">
                      <div className="text-blue-600 hover:text-blue-800">
                        <Link href={`/docs/${selectedJob.evaluation.document.id}/reader`}>
                          {selectedJob.evaluation.document.versions[0]?.title || 'Unknown Document'}
                        </Link>
                      </div>
                      <div className="text-xs text-blue-600 hover:text-blue-800">
                        <Link href={`/docs/${selectedJob.evaluation.document.id}/evaluations`}>
                          View Evaluations →
                        </Link>
                      </div>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900">Agent</dt>
                    <dd className="text-blue-600 hover:text-blue-800">
                      <Link href={`/agents/${selectedJob.evaluation.agent.id}`}>
                        {selectedJob.evaluation.agent.versions[0]?.name || 'Unknown Agent'}
                      </Link>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900">Created</dt>
                    <dd className="text-gray-600">{formatDate(selectedJob.createdAt)}</dd>
                  </div>
                  {selectedJob.completedAt && (
                    <>
                      <div>
                        <dt className="font-medium text-gray-900">Completed</dt>
                        <dd className="text-gray-600">{formatDate(selectedJob.completedAt)}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-900">Duration</dt>
                        <dd className="text-gray-600">{formatDuration(selectedJob.durationInSeconds)}</dd>
                      </div>
                    </>
                  )}
                  {selectedJob.costInCents && (
                    <div>
                      <dt className="font-medium text-gray-900">Cost</dt>
                      <dd className="text-gray-600">{formatCost(selectedJob.costInCents)}</dd>
                    </div>
                  )}
                </div>
              </div>

              {/* Reuse JobDetails component for expanded info */}
              <JobDetails job={selectedJob} />
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <div className="text-gray-500">Select a job to view details</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}