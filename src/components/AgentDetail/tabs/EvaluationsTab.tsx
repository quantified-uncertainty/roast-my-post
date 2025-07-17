import Link from "next/link";
import { useEffect } from "react";

import { GradeBadge } from "@/components/GradeBadge";
import { EvaluationDetailsPanel } from "@/components/EvaluationDetailsPanel";
import type { EvaluationTab } from "@/components/EvaluationDetails";
import type { Agent } from "@/types/agentSchema";

import { StatusBadge, StatusIcon } from "../components";
import type {
  AgentEvaluation,
  BatchSummary,
} from "../types";
import { formatCost, formatDate, formatDateWithTime } from "../utils";

interface EvaluationsTabProps {
  agent: Agent;
  evaluations: AgentEvaluation[];
  evalsLoading: boolean;
  selectedEvaluation: AgentEvaluation | null;
  setSelectedEvaluation: (evaluation: AgentEvaluation | null) => void;
  evalDetailsTab: EvaluationTab;
  setEvalDetailsTab: (tab: EvaluationTab) => void;
  selectedVersion: number | null;
  setSelectedVersion: (version: number | null) => void;
  evalsBatchFilter: string | null;
  setEvalsBatchFilter: (filter: string | null) => void;
  batches: BatchSummary[];
  fetchEvaluations: (batchId?: string) => void;
}

export function EvaluationsTab({
  agent,
  evaluations,
  evalsLoading,
  selectedEvaluation,
  setSelectedEvaluation,
  evalDetailsTab,
  setEvalDetailsTab,
  selectedVersion,
  setSelectedVersion,
  evalsBatchFilter,
  setEvalsBatchFilter,
  batches,
  fetchEvaluations,
}: EvaluationsTabProps) {
  // Auto-select first evaluation if none selected
  useEffect(() => {
    if (!selectedEvaluation && evaluations.length > 0) {
      const filtered = evaluations.filter(
        (e) => selectedVersion === null || e.agentVersion === selectedVersion
      );
      if (filtered.length > 0) {
        setSelectedEvaluation(filtered[0]);
      }
    }
  }, [selectedEvaluation, evaluations, selectedVersion, setSelectedEvaluation]);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Agent Evaluations
          {evalsBatchFilter && (
            <span className="ml-2 rounded-md bg-blue-100 px-2 py-1 text-sm font-medium text-blue-800">
              Batch:{" "}
              {batches.find((b) => b.id === evalsBatchFilter)?.name ||
                evalsBatchFilter.slice(0, 8)}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-4">
          {evalsBatchFilter && (
            <button
              onClick={() => {
                setEvalsBatchFilter(null);
                fetchEvaluations();
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear batch filter
            </button>
          )}
          <div className="flex items-center gap-2">
            <label
              htmlFor="version-filter"
              className="text-sm font-medium text-gray-700"
            >
              Filter by version:
            </label>
            <select
              id="version-filter"
              value={selectedVersion || ""}
              onChange={(e) =>
                setSelectedVersion(e.target.value ? Number(e.target.value) : null)
              }
              className="rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All versions</option>
              {Array.from({ length: Number(agent.version) }, (_, i) => i + 1)
                .reverse()
                .map((version) => (
                  <option key={version} value={version}>
                    v{version}
                    {version === Number(agent.version) && " (current)"}
                  </option>
                ))}
            </select>
          </div>
          <div className="text-sm text-gray-500">
            {
              evaluations.filter(
                (e) =>
                  selectedVersion === null || e.agentVersion === selectedVersion
              ).length
            }{" "}
            evaluations
          </div>
        </div>
      </div>

      {evalsLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-lg text-gray-600">Loading evaluations...</div>
        </div>
      ) : evaluations.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-lg text-gray-600">
            No evaluations have been performed by this agent yet.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Evaluation List */}
          <div className="col-span-4 rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-medium text-gray-900">
                Recent Evaluations
              </h2>
            </div>
            <div className="max-h-[calc(100vh-300px)] divide-y divide-gray-200 overflow-y-auto">
              {evaluations
                .filter(
                  (evalItem) =>
                    selectedVersion === null ||
                    evalItem.agentVersion === selectedVersion
                )
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((evalItem) => (
                  <div
                    key={evalItem.id}
                    onClick={() => setSelectedEvaluation(evalItem)}
                    className={`cursor-pointer p-4 transition-colors hover:bg-gray-50 ${
                      selectedEvaluation?.id === evalItem.id
                        ? "border-r-4 border-blue-500 bg-blue-50"
                        : ""
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm text-gray-900">
                          {evalItem.id.slice(0, 8)}...
                        </span>
                        {evalItem.grade !== null && evalItem.grade !== undefined ? (
                          <GradeBadge grade={evalItem.grade} />
                        ) : (
                          <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                            No Grade
                          </span>
                        )}
                      </div>
                      <StatusIcon status={evalItem.jobStatus || "PENDING"} />
                    </div>

                    <div className="mb-1 text-sm text-gray-600">
                      <div className="truncate font-medium">
                        {evalItem.documentTitle}
                      </div>
                      <div className="text-xs text-gray-500">
                        by {evalItem.documentAuthor}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatDateWithTime(evalItem.createdAt)}</span>
                      <div className="flex space-x-3">
                        {evalItem.costInCents !== undefined && (
                          <span>{formatCost(evalItem.costInCents || null)}</span>
                        )}
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs ${
                            evalItem.agentVersion === Number(agent.version)
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          Agent v{evalItem.agentVersion}
                        </span>
                        {evalItem.evaluationVersion && (
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                            Eval v{evalItem.evaluationVersion}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Evaluation Details */}
          <div className="col-span-8">
            {selectedEvaluation ? (
              <EvaluationDetailsPanel
                evaluation={{
                  id: selectedEvaluation.id,
                  evaluationId: selectedEvaluation.evaluationId,
                  documentId: selectedEvaluation.documentId,
                  documentTitle: selectedEvaluation.documentTitle,
                  agentId: agent.id,
                  agentName: agent.name,
                  agentVersion: `${agent.name} v${selectedEvaluation.agentVersion}${
                    selectedEvaluation.agentVersionName
                      ? ` - ${selectedEvaluation.agentVersionName}`
                      : ""
                  }`,
                  evaluationVersion: selectedEvaluation.evaluationVersion,
                  grade: selectedEvaluation.grade !== undefined ? selectedEvaluation.grade : null,
                  jobStatus: selectedEvaluation.jobStatus,
                  createdAt: selectedEvaluation.createdAt,
                  summary: selectedEvaluation.summary,
                  analysis: selectedEvaluation.analysis,
                  selfCritique: selectedEvaluation.selfCritique,
                  comments: selectedEvaluation.comments,
                  job: selectedEvaluation.job,
                }}
                activeTab={evalDetailsTab}
                setActiveTab={setEvalDetailsTab}
                statusIcon={
                  selectedEvaluation.jobStatus && (
                    <StatusIcon status={selectedEvaluation.jobStatus} />
                  )
                }
                showAllEvaluationsLink={false}
              />
            ) : (
              <div className="rounded-lg bg-white p-12 text-center shadow">
                <p className="text-gray-500">
                  Select an evaluation from the list to view details
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
