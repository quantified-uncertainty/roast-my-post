import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { GradeBadge } from "@/components/GradeBadge";
import type { Agent } from "@/types/agentSchema";
import { TaskLogs } from "@/app/docs/[docId]/evaluations/components/TaskLogs";

import { StatusBadge, StatusIcon } from "../components";
import type {
  AgentEvaluation,
  BatchSummary,
  EvalDetailsTab,
} from "../types";
import { formatCost, formatDate } from "../utils";

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
  // Auto-select first evaluation if none selected
  if (!selectedEvaluation && evaluations.length > 0) {
    const filtered = evaluations.filter(
      (e) => selectedVersion === null || e.agentVersion === selectedVersion
    );
    if (filtered.length > 0) {
      setSelectedEvaluation(filtered[0]);
    }
  }

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
                        {evalItem.grade !== null && agent.gradeInstructions ? (
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
                      <span>{formatDate(evalItem.createdAt)}</span>
                      <div className="flex space-x-3">
                        {evalItem.costInCents !== undefined && (
                          <span>{formatCost(evalItem.costInCents)}</span>
                        )}
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs ${
                            evalItem.agentVersion === Number(agent.version)
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          v{evalItem.agentVersion}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Evaluation Details */}
          <div className="col-span-8">
            {selectedEvaluation ? (
              <div className="space-y-4">
                {/* Header */}
                <div className="rounded-lg bg-white p-6 shadow">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">
                      Evaluation Details
                    </h2>
                    <div className="flex items-center space-x-2">
                      {selectedEvaluation.grade !== null &&
                        agent.gradeInstructions && (
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">
                              {selectedEvaluation.grade}/100
                            </div>
                            <div className="text-xs text-gray-500">Grade</div>
                          </div>
                        )}
                      <StatusBadge status={selectedEvaluation.jobStatus} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="font-medium text-gray-900">Document</dt>
                      <dd className="text-gray-600">
                        <Link
                          href={`/docs/${selectedEvaluation.documentId}`}
                          className="hover:text-blue-600"
                        >
                          {selectedEvaluation.documentTitle}
                        </Link>
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-900">Author</dt>
                      <dd className="text-gray-600">
                        {selectedEvaluation.documentAuthor}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-900">
                        Agent Version
                      </dt>
                      <dd className="text-gray-600">
                        v{selectedEvaluation.agentVersion}
                        {selectedEvaluation.agentVersionName &&
                          ` - ${selectedEvaluation.agentVersionName}`}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-900">Evaluated</dt>
                      <dd className="text-gray-600">
                        {formatDate(selectedEvaluation.createdAt)}
                      </dd>
                    </div>
                    {selectedEvaluation.costInCents !== undefined && (
                      <div>
                        <dt className="font-medium text-gray-900">Cost</dt>
                        <dd className="text-gray-600">
                          {formatCost(selectedEvaluation.costInCents || null)}
                        </dd>
                      </div>
                    )}
                    {selectedEvaluation.jobCompletedAt && (
                      <div>
                        <dt className="font-medium text-gray-900">Duration</dt>
                        <dd className="text-gray-600">
                          {
                            Math.round(
                              (new Date(
                                selectedEvaluation.jobCompletedAt
                              ).getTime() -
                                new Date(
                                  selectedEvaluation.jobCreatedAt ||
                                    selectedEvaluation.createdAt
                                ).getTime()) /
                                1000
                            )
                          }
                          s
                        </dd>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/docs/${selectedEvaluation.documentId}/evaluations?evaluationId=${selectedEvaluation.evaluationId}`}
                      className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      View Full Details →
                    </Link>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="rounded-lg bg-white shadow">
                  <div className="border-b border-gray-200">
                    <nav className="-mb-px flex">
                      {["summary", "analysis", "comments", "selfCritique", "logs"].map(
                        (tab) => (
                          <button
                            key={tab}
                            onClick={() => setEvalDetailsTab(tab as any)}
                            className={`${
                              evalDetailsTab === tab
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                            } whitespace-nowrap border-b-2 px-6 py-4 text-sm font-medium capitalize`}
                            disabled={
                              (tab === "selfCritique" &&
                                !selectedEvaluation.selfCritique) ||
                              (tab === "logs" && !selectedEvaluation.job)
                            }
                          >
                            {tab === "selfCritique" ? "Self-Critique" : tab}
                          </button>
                        )
                      )}
                    </nav>
                  </div>

                  <div className="p-6">
                    {evalDetailsTab === "summary" &&
                      selectedEvaluation.summary && (
                        <div className="prose max-w-none">
                          <p className="text-gray-700">
                            {selectedEvaluation.summary}
                          </p>
                        </div>
                      )}

                    {evalDetailsTab === "analysis" &&
                      selectedEvaluation.analysis && (
                        <div className="prose max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                          >
                            {selectedEvaluation.analysis}
                          </ReactMarkdown>
                        </div>
                      )}

                    {evalDetailsTab === "comments" && (
                      <div className="space-y-4">
                        {!selectedEvaluation.comments ||
                        selectedEvaluation.comments.length === 0 ? (
                          <div className="py-8 text-center text-gray-500">
                            No comments for this evaluation
                          </div>
                        ) : (
                          selectedEvaluation.comments.map((comment) => (
                            <div
                              key={comment.id}
                              className="rounded-lg border border-gray-200 p-4"
                            >
                              <div className="mb-2 flex items-center justify-between">
                                <h4 className="font-medium text-gray-900">
                                  {comment.title}
                                </h4>
                                <div className="flex items-center space-x-2">
                                  {comment.grade && (
                                    <GradeBadge grade={comment.grade} />
                                  )}
                                  {comment.importance && (
                                    <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                                      Importance: {comment.importance}/10
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="prose prose-sm text-gray-700">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  rehypePlugins={[rehypeRaw]}
                                >
                                  {comment.description}
                                </ReactMarkdown>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {evalDetailsTab === "selfCritique" && (
                      <div className="prose prose-sm max-w-none">
                        {selectedEvaluation.selfCritique ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                          >
                            {selectedEvaluation.selfCritique}
                          </ReactMarkdown>
                        ) : (
                          <div className="py-8 text-center text-gray-500">
                            No self-critique available for this evaluation
                          </div>
                        )}
                      </div>
                    )}

                    {evalDetailsTab === "logs" && (
                      <div>
                        {selectedEvaluation.job ? (
                          <TaskLogs
                            selectedVersion={{
                              createdAt: new Date(selectedEvaluation.createdAt),
                              comments: [],
                              summary: selectedEvaluation.summary || "",
                              documentVersion: { version: 0 },
                              job: {
                                tasks: (selectedEvaluation.job.tasks || []).map(task => ({
                                  ...task,
                                  log: task.log || null,
                                  timeInSeconds: task.timeInSeconds || null,
                                })),
                                costInCents:
                                  selectedEvaluation.job.costInCents || 0,
                                llmThinking:
                                  selectedEvaluation.job.llmThinking || "",
                              },
                            }}
                          />
                        ) : (
                          <div className="py-8 text-center text-gray-500">
                            No logs available for this evaluation
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
