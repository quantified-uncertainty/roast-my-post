"use client";

import { useState } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import type { AgenticEvaluation } from "../hooks/useAgenticEvaluations";

interface EvaluationsListProps {
  evaluations: AgenticEvaluation[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

function gradeColor(grade: number): string {
  if (grade >= 70) return "text-green-600";
  if (grade >= 40) return "text-yellow-600";
  return "text-red-600";
}

function gradeBg(grade: number): string {
  if (grade >= 70) return "bg-green-100";
  if (grade >= 40) return "bg-yellow-100";
  return "bg-red-100";
}

function levelBadge(level: string): string {
  switch (level) {
    case "error": return "bg-red-100 text-red-800";
    case "warning": return "bg-yellow-100 text-yellow-800";
    case "info": return "bg-blue-100 text-blue-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

export function EvaluationsList({
  evaluations,
  loading,
  error,
  onRefresh,
}: EvaluationsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading && evaluations.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
        Loading evaluations...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">Error: {error}</p>
        <button
          onClick={onRefresh}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (evaluations.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>No agentic evaluations yet.</p>
        <p className="text-sm mt-1">Run an analysis to see results here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">
          {evaluations.length} evaluation{evaluations.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Evaluation list */}
      <div className="border rounded-lg divide-y">
        {evaluations.map((evaluation) => (
          <EvaluationRow
            key={evaluation.id}
            evaluation={evaluation}
            isExpanded={expandedId === evaluation.id}
            onToggle={() => toggleExpanded(evaluation.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface EvaluationRowProps {
  evaluation: AgenticEvaluation;
  isExpanded: boolean;
  onToggle: () => void;
}

function EvaluationRow({ evaluation, isExpanded, onToggle }: EvaluationRowProps) {
  // Format date
  const date = new Date(evaluation.createdAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const cost = evaluation.telemetry?.totalCostUsd;
  const durationMs = evaluation.telemetry?.totalDurationMs;
  const profileName = evaluation.telemetry?.profileName;

  // Format duration as "Xm Ys" or "Xs"
  const formatDuration = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="bg-white">
      {/* Row header - always visible */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 text-left transition-colors hover:bg-gray-50 cursor-pointer"
      >
        {/* Expand icon */}
        <div className="flex-shrink-0 w-5 h-5 text-gray-400">
          {isExpanded ? (
            <ChevronDownIcon className="w-5 h-5" />
          ) : (
            <ChevronRightIcon className="w-5 h-5" />
          )}
        </div>

        {/* Document title */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">
            {evaluation.documentTitle}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            v{evaluation.version}
            {profileName && <span className="ml-2 text-blue-600">• {profileName}</span>}
          </p>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {/* Grade badge */}
          {evaluation.grade !== null && (
            <span className={`px-2 py-0.5 rounded font-medium ${gradeBg(evaluation.grade)} ${gradeColor(evaluation.grade)}`}>
              {evaluation.grade}
            </span>
          )}

          {/* Comments count */}
          <span className="flex items-center gap-1">
            <DocumentTextIcon className="w-4 h-4" />
            {evaluation.comments.length}
          </span>

          {/* Duration */}
          {durationMs !== undefined && (
            <span className="flex items-center gap-1">
              <ClockIcon className="w-4 h-4" />
              {formatDuration(durationMs)}
            </span>
          )}

          {/* Cost */}
          {cost !== undefined && (
            <span className="flex items-center gap-1">
              <CurrencyDollarIcon className="w-4 h-4" />
              ${cost.toFixed(4)}
            </span>
          )}

          {/* Date */}
          <span className="w-28 text-right">{formattedDate}</span>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t bg-gray-50">
          {/* Summary */}
          {evaluation.summary && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Summary</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                {evaluation.summary}
              </p>
            </div>
          )}

          {/* Comments */}
          {evaluation.comments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">
                Findings ({evaluation.comments.length})
              </h4>
              {evaluation.comments.map((comment) => (
                <div key={comment.id} className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="flex items-center gap-2 mb-1">
                    {comment.header && (
                      <span className="text-sm font-medium text-gray-900">{comment.header}</span>
                    )}
                    {comment.importance !== null && (
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${levelBadge(comment.importance >= 7 ? "error" : comment.importance >= 4 ? "warning" : "info")}`}>
                        {comment.importance}
                      </span>
                    )}
                  </div>
                  {comment.quotedText && (
                    <div className="mb-1 pl-2 border-l-2 border-gray-300 text-xs text-gray-500 italic truncate">
                      &quot;{comment.quotedText}&quot;
                    </div>
                  )}
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {comment.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          {evaluation.comments.length === 0 && !evaluation.summary && (
            <p className="text-sm text-gray-500">No details available.</p>
          )}
        </div>
      )}
    </div>
  );
}
