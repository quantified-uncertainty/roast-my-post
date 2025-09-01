"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { JobCard, JobSummary, TaskDisplay } from "@/components/job";
import { decimalToNumber } from "@/infrastructure/database/prisma-serializers";

interface Job {
  id: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
  logs?: string;
  priceInDollars?: number;
  durationInSeconds?: number;
  attempts: number;
  originalJobId?: string | null;
  evaluation: {
    document: {
      id: string;
      submittedById?: string;
      submittedBy?: {
        id: string;
        name: string | null;
        email: string;
      };
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
    priceInDollars: number;
    timeInSeconds: number | null;
    log: string | null;
    createdAt: Date;
  }>;
}


export default function JobsMonitorPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const fetchJobs = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      const url = statusFilter === 'ALL' 
        ? "/api/monitor/jobs"
        : `/api/monitor/jobs?status=${statusFilter}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }
      const data = await response.json();
      setJobs(data.jobs);
      if (data.statusCounts) {
        setStatusCounts(data.statusCounts);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleCancelJob = async () => {
    if (!selectedJob) return;
    
    try {
      const response = await fetch(`/api/monitor/jobs/${selectedJob.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: cancelReason })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel job');
      }
      
      // Refresh the job list and close dialog
      setShowCancelDialog(false);
      setCancelReason('');
      await fetchJobs(true);
      
      // Update selected job if it matches
      if (selectedJob) {
        const updatedJobs = await fetchJobs();
        const updatedJob = jobs.find(j => j.id === selectedJob.id);
        if (updatedJob) {
          setSelectedJob(updatedJob);
        }
      }
    } catch (err) {
      console.error('Failed to cancel job:', err);
      alert(err instanceof Error ? err.message : 'Failed to cancel job');
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [statusFilter]);

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
        <div className="flex items-center gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Jobs ({Object.values(statusCounts).reduce((a, b) => a + b, 0)})</option>
            <option value="COMPLETED">Completed ({statusCounts.COMPLETED || 0})</option>
            <option value="RUNNING">Running ({statusCounts.RUNNING || 0})</option>
            <option value="FAILED">Failed ({statusCounts.FAILED || 0})</option>
            <option value="PENDING">Pending ({statusCounts.PENDING || 0})</option>
            <option value="CANCELLED">Cancelled ({statusCounts.CANCELLED || 0})</option>
          </select>
          <button
            onClick={() => fetchJobs(true)}
            disabled={isRefreshing}
            className="p-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh jobs"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="text-sm text-gray-500">
            Last 20 jobs
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Job List */}
        <div className="col-span-4 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              {statusFilter === 'ALL' ? 'Recent Jobs' : `${statusFilter} Jobs`}
            </h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-[calc(100vh-300px)] overflow-y-auto">
            {jobs.map((job) => (
              <div key={job.id} className="p-2">
                <JobCard
                  job={{
                    ...job,
                    evaluation: {
                      ...job.evaluation,
                      document: {
                        ...job.evaluation.document,
                        uploader: job.evaluation.document.submittedBy
                      }
                    }
                  }}
                  onClick={() => setSelectedJob(job)}
                  isSelected={selectedJob?.id === job.id}
                  showDocument={true}
                  showAgent={true}
                  showUploader={true}
                  showDate={true}
                  compact={true}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Job Details */}
        <div className="col-span-8">
          {selectedJob ? (
            <div className="space-y-4">
              {/* Header with document/agent links */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="mb-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <dt className="font-medium text-gray-900">Document</dt>
                      <dd className="space-y-1">
                        <div className="text-blue-600 hover:text-blue-800">
                          <Link href={`/docs/${selectedJob.evaluation.document.id}/reader`}>
                            {selectedJob.evaluation.document.versions[0]?.title || 'Unknown Document'}
                          </Link>
                        </div>
                        <div className="text-xs text-blue-600 hover:text-blue-800">
                          <Link href={`/docs/${selectedJob.evaluation.document.id}/evals/${selectedJob.evaluation.agent.id}`}>
                            View Evaluation →
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
                      <dt className="font-medium text-gray-900">Uploaded by</dt>
                      <dd className="text-blue-600 hover:text-blue-800">
                        {selectedJob.evaluation.document.submittedBy ? (
                          <Link href={`/profile/${selectedJob.evaluation.document.submittedBy.id}`}>
                            {selectedJob.evaluation.document.submittedBy.name || selectedJob.evaluation.document.submittedBy.email}
                          </Link>
                        ) : (
                          <span className="text-gray-500">Unknown</span>
                        )}
                      </dd>
                    </div>
                  </div>
                </div>
                
                <JobSummary 
                  job={{
                    id: selectedJob.id,
                    status: selectedJob.status,
                    createdAt: selectedJob.createdAt,
                    completedAt: selectedJob.completedAt,
                    durationInSeconds: selectedJob.durationInSeconds,
                    priceInDollars: selectedJob.priceInDollars,
                    attempts: selectedJob.attempts,
                    originalJobId: selectedJob.originalJobId,
                    error: selectedJob.error,
                    cancelledAt: (selectedJob as any).cancelledAt,
                    cancelledBy: (selectedJob as any).cancelledBy,
                    cancellationReason: (selectedJob as any).cancellationReason
                  }}
                  canCancel={true}
                  onCancel={() => setShowCancelDialog(true)}
                />
              </div>

              {/* Tasks */}
              {selectedJob.tasks && selectedJob.tasks.length > 0 && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasks</h3>
                  <TaskDisplay 
                    tasks={selectedJob.tasks.map(task => ({
                      ...task,
                      priceInDollars: decimalToNumber(task.priceInDollars) ?? 0
                    }))}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <div className="text-gray-500">Select a job to view details</div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Job Dialog */}
      {showCancelDialog && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Cancel Job</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to cancel this job? This action cannot be undone.
            </p>
            <div className="mb-4">
              <label htmlFor="cancel-reason" className="block text-sm font-medium text-gray-700 mb-1">
                Reason (optional)
              </label>
              <textarea
                id="cancel-reason"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter cancellation reason..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCancelDialog(false);
                  setCancelReason('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCancelJob}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}