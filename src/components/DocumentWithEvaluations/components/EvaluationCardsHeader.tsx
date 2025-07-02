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

  // Pills row mini component
  function EvaluationPillsRow({
    document,
    evaluationState,
    onToggleAgent,
  }: {
    document: any;
    evaluationState: any;
    onToggleAgent: (agentId: string) => void;
  }) {
    return (
      <div className="scrollbar-thin scrollbar-thumb-gray-200 ml-2 flex h-full flex-1 items-center justify-end gap-2 overflow-x-auto">
        {document.reviews.map((review: any) => {
          const isActive = evaluationState.selectedAgentIds.has(review.agentId);
          return (
            <button
              key={review.agentId}
              onClick={() => onToggleAgent(review.agentId)}
              className={`mr-1 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-100 text-blue-700 ring-1 ring-blue-600"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
              }`}
              style={{ height: "2rem" }}
            >
              {review.agent.name}
              <div className="flex items-center gap-1.5">
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
    );
  }

  // Chevron arrow button mini component
  function EvaluationModeToggleButton({
    isLargeMode,
    onClick,
  }: {
    isLargeMode: boolean;
    onClick: () => void;
  }) {
    return (
      <button
        onClick={onClick}
        className="flex items-center justify-center rounded-full bg-gray-200 p-0.5 transition-colors hover:bg-gray-300"
        aria-label="Toggle card size"
        type="button"
        style={{ width: "1.8rem", height: "1.8rem" }}
      >
        <ChevronLeftIcon
          className={`h-5 w-5 transform text-gray-500 transition-transform duration-200 ${isLargeMode ? "-rotate-90" : "rotate-0"}`}
        />
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex w-full flex-col gap-1">
        {/* Header row: always one line */}
        <div
          className={`flex w-full items-center border-b border-gray-100 ${isLargeMode ? "mb-1 pb-1" : "mb-0 pb-0"} h-10`}
        >
          <h2 className="mr-2 whitespace-nowrap text-sm font-medium text-gray-500">
            Document Evals
          </h2>
          {isLargeMode ? (
            <div className="ml-auto flex-shrink-0">
              <EvaluationModeToggleButton
                isLargeMode={isLargeMode}
                onClick={onToggleMode || (() => {})}
              />
            </div>
          ) : (
            <>
              <EvaluationPillsRow
                document={document}
                evaluationState={evaluationState}
                onToggleAgent={handleToggleAgent}
              />
              <div className="ml-2 flex-shrink-0">
                <EvaluationModeToggleButton
                  isLargeMode={isLargeMode}
                  onClick={onToggleMode || (() => {})}
                />
              </div>
            </>
          )}
        </div>
        {/* Cards grid only in large mode, below header */}
        {isLargeMode && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {document.reviews.map((review: any) => {
              const isActive = evaluationState.selectedAgentIds.has(
                review.agentId
              );
              const summary = review.summary || "No summary available";
              const truncatedSummary =
                summary.length > 300
                  ? summary.substring(0, 300) + "..."
                  : summary;
              return (
                <div
                  key={review.agentId}
                  className={`flex min-h-[100px] flex-col justify-between rounded-md bg-white p-3`}
                >
                  {/* Header Row */}
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {review.grade !== undefined && (
                        <GradeBadge
                          grade={review.grade}
                          variant="grayscale"
                          size="xs"
                        />
                      )}
                      <span className="text-sm font-semibold text-gray-700">
                        {review.agent.name}
                      </span>
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
                        className={`relative inline-block h-4 w-9 rounded-full transition-colors duration-200 ${isActive ? "bg-purple-600" : "bg-gray-200"}`}
                      >
                        <span
                          className={`absolute left-1 top-1 h-2 w-2 rounded-full bg-white shadow transition-transform duration-200 ${isActive ? "translate-x-4" : ""}`}
                        />
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        Comments ({review.comments?.length || 0})
                      </span>
                    </label>
                  </div>
                  {/* Summary */}
                  <div className="mb-2 min-h-[40px] text-sm text-gray-700">
                    {truncatedSummary}
                  </div>
                  {/* Footer */}
                  <div className="mt-auto">
                    <a
                      href="#"
                      className="flex items-center text-xs font-medium text-purple-600 hover:underline"
                    >
                      more
                      <ChevronDownIcon className="ml-1 h-3 w-3" />
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
