import { Button } from "@/components/Button";
import { GradeBadge } from "@/components/GradeBadge";
import {
  CheckCircleIcon,
  ClockIcon,
  PlayIcon,
  RectangleStackIcon,
  SparklesIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

import type { AgentWithEvaluation } from "../types";

// Helper function to get status icon
function getStatusIcon(status: string) {
  switch (status) {
    case "PENDING":
      return <ClockIcon className="h-4 w-4 text-yellow-500" />;
    case "RUNNING":
      return <PlayIcon className="h-4 w-4 animate-pulse text-blue-500" />;
    case "COMPLETED":
      return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
    case "FAILED":
      return <XCircleIcon className="h-4 w-4 text-red-500" />;
    default:
      return null;
  }
}

interface VersionHistoryProps {
  selectedAgent: AgentWithEvaluation | null;
  selectedVersionIndex: number | null;
  selectedJobIndex: number | null;
  middleTab: "versions" | "jobs";
  isOwner?: boolean;
  onVersionSelect: (index: number) => void;
  onTabChange: (tab: "versions" | "jobs") => void;
  onRunEvaluation: (agentId: string) => void;
  formatDate: (date: Date) => string;
  onJobSelect: (index: number) => void;
}

export function VersionHistory({
  selectedAgent,
  selectedVersionIndex,
  selectedJobIndex,
  middleTab,
  isOwner,
  onVersionSelect,
  onTabChange,
  onRunEvaluation,
  formatDate,
  onJobSelect,
}: VersionHistoryProps) {
  if (!selectedAgent) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-gray-500">
        Select an agent to view its evaluation details
      </div>
    );
  }

  const selectedReview = selectedAgent.evaluation;

  if (!selectedReview) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-gray-500">
        <div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            {selectedAgent.name}
          </h3>
          <p className="mb-4 text-gray-500">
            This agent hasn't been run for this document yet.
          </p>
          {isOwner && (
            <Button
              onClick={() => onRunEvaluation(selectedAgent.id)}
              className="flex items-center gap-2"
            >
              <SparklesIcon className="h-4 w-4" />
              Run Evaluation
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-4">
        <button
          className={`px-4 py-2 text-sm font-medium ${
            middleTab === "versions"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-blue-600"
          }`}
          onClick={() => onTabChange("versions")}
        >
          <RectangleStackIcon className="mr-1 inline-block h-4 w-4 align-text-bottom" />
          Versions
          {selectedReview?.versions && (
            <span className="ml-2 rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
              {selectedReview.versions.length}
            </span>
          )}
        </button>
        <button
          className={`ml-4 px-4 py-2 text-sm font-medium ${
            middleTab === "jobs"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-blue-600"
          }`}
          onClick={() => onTabChange("jobs")}
        >
          <SparklesIcon className="mr-1 inline-block h-4 w-4 align-text-bottom" />
          Jobs
          {selectedReview?.jobs && (
            <span className="ml-2 rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
              {selectedReview.jobs.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {middleTab === "versions" && (
          <div>
            {selectedReview.versions && selectedReview.versions.length > 0 ? (
              <div>
                {selectedReview.versions.map((version, index) => (
                  <div
                    key={index}
                    className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                      selectedVersionIndex === index
                        ? "bg-blue-50"
                        : "bg-transparent"
                    } ${
                      index !== (selectedReview.versions?.length ?? 0) - 1
                        ? "border-b border-gray-200"
                        : ""
                    }`}
                    onClick={() => onVersionSelect(index)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-gray-800">
                          {version.version ? (
                            <>
                              Version {version.version}
                              {index === 0 && " (Latest)"}
                            </>
                          ) : (
                            <>
                              Version{" "}
                              {selectedReview.versions?.length
                                ? selectedReview.versions.length - index
                                : 0}
                              {index === 0 && " (Latest)"}
                            </>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {formatDate(version.createdAt)}
                        </div>
                      </div>
                      {version.grade !== undefined && (
                        <GradeBadge grade={version.grade} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-gray-500">
                No versions available for this evaluation
              </div>
            )}
          </div>
        )}
        {middleTab === "jobs" && (
          <div>
            {selectedReview.jobs && selectedReview.jobs.length > 0 ? (
              <ul className="space-y-1 px-4 py-2 text-sm">
                {selectedReview.jobs.map((job, index) => (
                  <li
                    key={job.id}
                    className={`flex cursor-pointer items-center gap-4 ${selectedJobIndex === index ? "bg-blue-50" : "bg-transparent"}`}
                    onClick={() => onJobSelect(index)}
                  >
                    <span className="font-mono text-xs">
                      {job.id.slice(0, 8)}...
                    </span>
                    <span className="flex items-center gap-1 rounded bg-gray-200 px-2 py-0.5 text-gray-700">
                      {getStatusIcon(job.status)}
                      {job.status}
                    </span>
                    {job.createdAt && (
                      <span className="text-gray-500">
                        {new Date(job.createdAt).toLocaleString()}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-4 text-center text-gray-500">
                No jobs available for this evaluation
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
