"use client";

import {
  ChatBubbleLeftIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";

import { GradeBadge } from "../../GradeBadge";

interface EvaluationCardsHeaderProps {
  document: any;
  evaluationState: any;
  onEvaluationStateChange?: (newState: any) => void;
  isLargeMode?: boolean;
  onToggleMode?: () => void;
}

export function EvaluationCardsHeader({
  document,
  evaluationState,
  onEvaluationStateChange,
  isLargeMode = true,
  onToggleMode,
}: EvaluationCardsHeaderProps) {
  if (!document || !evaluationState) {
    return null;
  }

  const handleToggleAgent = (agentId: string) => {
    if (onEvaluationStateChange) {
      const newSelectedIds = new Set(evaluationState.selectedAgentIds);
      if (newSelectedIds.has(agentId)) {
        newSelectedIds.delete(agentId);
      } else {
        newSelectedIds.add(agentId);
      }
      onEvaluationStateChange({
        ...evaluationState,
        selectedAgentIds: newSelectedIds,
      });
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex w-full flex-col gap-1">
        {/* Header row: always one line */}
        <div
          className={`flex w-full items-center border-b border-gray-100 ${isLargeMode ? "mb-1 pb-1" : "mb-0 pb-0"} h-10`}
        >
          <h2 className="mr-2 whitespace-nowrap text-sm font-semibold text-gray-900">
            Document Evals
          </h2>
          {isLargeMode ? null : (
            <div className="ml-auto flex h-full items-center">
              <button
                onClick={onToggleMode}
                className="rounded-full p-1 transition-colors hover:bg-gray-100"
                aria-label="Toggle card size"
                type="button"
              >
                <ChevronLeftIcon className="h-6 w-6 text-gray-500 hover:text-gray-700" />
              </button>
              <div className="scrollbar-thin scrollbar-thumb-gray-200 flex h-full items-center gap-2 overflow-x-auto">
                {document.reviews.map((review: any) => {
                  const isActive = evaluationState.selectedAgentIds.has(
                    review.agentId
                  );
                  return (
                    <button
                      key={review.agentId}
                      onClick={() => handleToggleAgent(review.agentId)}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-blue-100 text-blue-700 ring-1 ring-blue-600"
                          : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                      }`}
                      style={{ height: "2rem" }}
                    >
                      {review.agent.name}
                      <div className="flex items-center gap-1.5">
                        {review.grade !== undefined && (
                          <GradeBadge
                            grade={review.grade}
                            variant="light"
                            size="xs"
                          />
                        )}
                        <div
                          className={`flex items-center gap-0.5 text-xs ${
                            isActive ? "text-blue-600" : "text-gray-500"
                          }`}
                        >
                          <ChatBubbleLeftIcon className="h-3.5 w-3.5" />
                          <span>{review.comments?.length || 0}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {isLargeMode && (
            <div className="ml-2 flex-shrink-0">
              <button
                onClick={onToggleMode}
                className="rounded-full p-1 transition-colors hover:bg-gray-100"
                aria-label="Toggle card size"
                type="button"
              >
                <ChevronDownIcon className="h-6 w-6 text-gray-500 hover:text-gray-700" />
              </button>
            </div>
          )}
        </div>
        {/* Cards grid only in large mode, below header */}
        {isLargeMode && (
          <div className="mt-2 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {document.reviews.map((review: any) => {
              const isActive = evaluationState.selectedAgentIds.has(
                review.agentId
              );
              const summary = review.summary || "No summary available";
              const truncatedSummary =
                summary.length > 120
                  ? summary.substring(0, 120) + "..."
                  : summary;
              return (
                <div
                  key={review.agentId}
                  className={`flex min-h-[100px] flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow transition-all`}
                >
                  {/* Header Row */}
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-gray-900">
                        {review.agent.name}
                      </span>
                      {review.grade !== undefined && (
                        <GradeBadge
                          grade={review.grade}
                          variant="light"
                          size="sm"
                        />
                      )}
                    </div>
                    {/* Comments Switch */}
                    <label className="flex cursor-pointer select-none items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => handleToggleAgent(review.agentId)}
                        className="sr-only"
                      />
                      <span
                        className={`relative inline-block h-6 w-10 rounded-full transition-colors duration-200 ${isActive ? "bg-purple-600" : "bg-gray-200"}`}
                      >
                        <span
                          className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${isActive ? "translate-x-4" : ""}`}
                        />
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        Comments ({review.comments?.length || 0})
                      </span>
                    </label>
                  </div>
                  {/* Summary */}
                  <div className="mb-4 min-h-[40px] text-sm text-gray-600">
                    {truncatedSummary}
                  </div>
                  {/* Footer */}
                  <div className="mt-auto pt-2">
                    <a
                      href="#"
                      className="text-sm font-medium text-purple-600 hover:underline"
                    >
                      More
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
