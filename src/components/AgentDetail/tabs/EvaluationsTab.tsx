import { GradeBadge } from "@/components/GradeBadge";
import type { Agent } from "@/types/agentSchema";

import { StatusIcon } from "../components";
import type {
  AgentEvaluation,
  BatchSummary,
  EvalDetailsTab,
} from "../types";
import { formatDate } from "../utils";

interface EvaluationsTabProps {
  agent: Agent;
  evaluations: AgentEvaluation[];
  evalsLoading: boolean;
  selectedEvaluation: AgentEvaluation | null;
  setSelectedEvaluation: (evaluation: AgentEvaluation | null) => void;
  evalDetailsTab: EvalDetailsTab;
  setEvalDetailsTab: (tab: EvalDetailsTab) => void;
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
  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Agent Evaluations
          {evalsBatchFilter && (
            <span className="ml-2 rounded-md bg-blue-100 px-2 py-1 text-sm font-medium text-blue-800">
              Batch: {evalsBatchFilter.slice(0, 8)}
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
        <div className="space-y-4">
          {evaluations
            .filter(
              (evalItem) =>
                selectedVersion === null ||
                evalItem.agentVersion === selectedVersion
            )
            .map((evalItem) => (
              <div
                key={evalItem.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {evalItem.documentTitle}
                    </h4>
                    <p className="text-sm text-gray-500">
                      by {evalItem.documentAuthor} •{" "}
                      {formatDate(evalItem.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {evalItem.grade !== null &&
                    evalItem.grade !== undefined &&
                    agent.gradeInstructions ? (
                      <GradeBadge grade={evalItem.grade} />
                    ) : (
                      <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                        No Grade
                      </span>
                    )}
                    <StatusIcon status={evalItem.jobStatus || "PENDING"} />
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
