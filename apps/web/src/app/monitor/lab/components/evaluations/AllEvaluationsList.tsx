"use client";

import { useState } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  ClockIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import type { EvaluationWithTelemetry } from "../../hooks/useAllEvaluations";
import { PipelineView } from "../snapshots/PipelineView";
import { formatDuration, formatCost } from "../snapshots/pipelineUtils";

interface AllEvaluationsListProps {
  evaluations: EvaluationWithTelemetry[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function AllEvaluationsList({
  evaluations,
  loading,
  error,
  onRefresh,
}: AllEvaluationsListProps) {
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
        <p>No evaluations with telemetry found.</p>
        <p className="text-sm mt-1">Run some evaluations in the main UI to see them here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">
          {evaluations.length} recent evaluation{evaluations.length !== 1 ? "s" : ""}
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
  evaluation: EvaluationWithTelemetry;
  isExpanded: boolean;
  onToggle: () => void;
}

function EvaluationRow({ evaluation, isExpanded, onToggle }: EvaluationRowProps) {
  const telemetry = evaluation.telemetry;
  const hasTelemetry = telemetry && (telemetry.stages || telemetry.extractionPhase);

  // Format date
  const date = new Date(evaluation.createdAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-white">
      {/* Row header - always visible */}
      <button
        onClick={onToggle}
        disabled={!hasTelemetry}
        className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
          hasTelemetry
            ? "hover:bg-gray-50 cursor-pointer"
            : "cursor-default opacity-60"
        }`}
      >
        {/* Expand icon */}
        <div className="flex-shrink-0 w-5 h-5 text-gray-400">
          {hasTelemetry ? (
            isExpanded ? (
              <ChevronDownIcon className="w-5 h-5" />
            ) : (
              <ChevronRightIcon className="w-5 h-5" />
            )
          ) : (
            <div className="w-5 h-5" />
          )}
        </div>

        {/* Document title */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">
            {evaluation.documentTitle}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {evaluation.agentName} &middot; v{evaluation.version}
          </p>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {/* Comments count */}
          <span className="flex items-center gap-1">
            <DocumentTextIcon className="w-4 h-4" />
            {evaluation.comments.length} comment{evaluation.comments.length !== 1 ? "s" : ""}
          </span>

          {/* Duration */}
          {telemetry?.totalDurationMs && (
            <span className="flex items-center gap-1">
              <ClockIcon className="w-4 h-4" />
              {formatDuration(telemetry.totalDurationMs)}
            </span>
          )}

          {/* Cost */}
          {telemetry?.totalCostUsd && (
            <span className="flex items-center gap-1">
              <CurrencyDollarIcon className="w-4 h-4" />
              {formatCost(telemetry.totalCostUsd)}
            </span>
          )}

          {/* Date */}
          <span className="w-24 text-right">{formattedDate}</span>
        </div>
      </button>

      {/* Expanded content - PipelineView */}
      {isExpanded && hasTelemetry && (
        <div className="px-4 pb-4 pt-2 border-t bg-gray-50">
          <PipelineView
            extraction={telemetry.extractionPhase}
            counts={telemetry.pipelineCounts}
            filteredItems={telemetry.filteredItems ?? []}
            passedItems={telemetry.passedItems}
            stages={telemetry.stages}
            totalDurationMs={telemetry.totalDurationMs}
            finalComments={evaluation.comments}
            lostComments={[]}
          />
        </div>
      )}
    </div>
  );
}
