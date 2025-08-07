"use client";

import {
  ChatBubbleLeftIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  CommandLineIcon,
} from "@heroicons/react/24/outline";
import { useRouter, useSearchParams } from "next/navigation";

import { GradeBadge } from "../../GradeBadge";
import type { Document } from "@/types/databaseTypes";
import type { EvaluationState } from "../types";
import { TRANSITION_DURATION, TRANSITION_DURATION_SLOW, CARDS_GRID_MAX_HEIGHT } from "../constants";

interface EvaluationCardsHeaderProps {
  document: Document;
  evaluationState: EvaluationState;
  onEvaluationStateChange?: (newState: EvaluationState) => void;
  isLargeMode?: boolean;
  onToggleMode?: () => void;
  showDebugComments?: boolean;
  onToggleDebugComments?: () => void;
}

export function EvaluationCardsHeader({
  document,
  evaluationState,
  onEvaluationStateChange,
  isLargeMode = true,
  onToggleMode,
  showDebugComments = false,
  onToggleDebugComments,
}: EvaluationCardsHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (!document || !evaluationState) {
    return null;
  }

  const updateUrlParams = (selectedIds: Set<string>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (selectedIds.size === 0) {
      params.delete('evals');
    } else {
      params.set('evals', Array.from(selectedIds).join(','));
    }
    
    router.replace(`?${params.toString()}`, { scroll: false });
  };

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
      
      updateUrlParams(newSelectedIds);
    }
  };

  // Pills row mini component
  function EvaluationPillsRow({
    document,
    evaluationState,
    onToggleAgent,
  }: {
    document: Document;
    evaluationState: EvaluationState;
    onToggleAgent: (agentId: string) => void;
  }) {
    return (
      <div className="scrollbar-thin scrollbar-thumb-gray-200 ml-2 flex flex-1 items-center justify-end gap-2 overflow-x-auto py-0.5">
        {document.reviews.map((review) => {
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

  // Debug toggle button mini component
  function DebugToggleButton({
    showDebug,
    onToggle,
  }: {
    showDebug: boolean;
    onToggle: () => void;
  }) {
    return (
      <button
        onClick={onToggle}
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors ${
          showDebug
            ? "bg-amber-100 text-amber-700 ring-1 ring-amber-600"
            : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
        }`}
        title={showDebug ? "Hide debug comments" : "Show debug comments"}
      >
        <CommandLineIcon className="h-3.5 w-3.5" />
        Debug
      </button>
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
        className="flex items-center justify-center rounded-full bg-gray-200 p-0.5 transition-colors duration-500 hover:bg-gray-300 hover:text-gray-900 group-hover:bg-gray-300 group-hover:text-gray-900"
        aria-label="Toggle card size"
        type="button"
        style={{ width: "1.8rem", height: "1.8rem" }}
      >
        <ChevronLeftIcon
          className={`h-5 w-5 transform text-gray-500 transition-transform duration-500 ${isLargeMode ? "-rotate-90" : "rotate-0"}`}
        />
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className={`flex w-full flex-col gap-1 transition-all ease-in-out`} style={{ transitionDuration: `${TRANSITION_DURATION}ms` }}>
        {/* Header row: always one line */}
        <div
          className={`group flex w-full items-center rounded-t-lg transition-all duration-300 ease-in-out ${isLargeMode ? "h-12 cursor-pointer px-6 py-6 hover:bg-gray-200" : "mb-0 px-3 py-2"}`}
          onClick={isLargeMode ? onToggleMode : undefined}
        >
          {isLargeMode && (
            <div className="ml-1 flex items-center gap-4">
              <div className="text-md font-semibold text-gray-500">
                {document.reviews.length} AI Evaluation
                {document.reviews.length === 1 ? "" : "s"}
              </div>
              <div className="text-sm text-gray-500">
                Toggle evaluations to show their comments alongside the document
              </div>
            </div>
          )}
          {!isLargeMode && (
            <div className="text-md flex items-center gap-2 font-medium text-gray-500">
              <ChatBubbleLeftIcon className="h-4 w-4" />
              Showing{" "}
              {document.reviews
                .filter((r) =>
                  evaluationState.selectedAgentIds.has(r.agentId)
                )
                .reduce(
                  (total: number, review) =>
                    total + (review.comments?.length || 0),
                  0
                )}{" "}
              comments by {evaluationState.selectedAgentIds.size} Evaluation
              {evaluationState.selectedAgentIds.size === 1 ? "" : "s"}
            </div>
          )}
          {isLargeMode ? (
            <div className="ml-auto flex-shrink-0">
              <EvaluationModeToggleButton
                isLargeMode={isLargeMode}
                onClick={() => {}}
              />
            </div>
          ) : (
            <>
              <EvaluationPillsRow
                document={document}
                evaluationState={evaluationState}
                onToggleAgent={handleToggleAgent}
              />
              {onToggleDebugComments && (
                <div className="ml-2 flex-shrink-0">
                  <DebugToggleButton
                    showDebug={showDebugComments}
                    onToggle={onToggleDebugComments}
                  />
                </div>
              )}
              <div className="ml-2 flex-shrink-0">
                <EvaluationModeToggleButton
                  isLargeMode={isLargeMode}
                  onClick={onToggleMode || (() => {})}
                />
              </div>
            </>
          )}
        </div>
        {/* Cards grid container with smooth height transition */}
        <div
          className={`grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3 transition-all ease-in-out ${
            isLargeMode ? `max-h-[${CARDS_GRID_MAX_HEIGHT}px] opacity-100 pb-2` : "max-h-0 opacity-0 overflow-hidden"
          }`}
          style={{ transitionDuration: `${TRANSITION_DURATION_SLOW}ms` }}
        >
            {document.reviews.map((review) => {
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
                  <div className="mb-3 flex items-start justify-between">
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
                      <span
                        className={`text-sm font-medium ${isActive ? "text-gray-700" : "text-gray-400"}`}
                      >
                        Comments ({review.comments?.length || 0})
                      </span>
                    </label>
                  </div>
                  {/* Summary */}
                  <div className="mb-3 min-h-[40px] text-sm text-gray-700">
                    {truncatedSummary}
                  </div>
                  {/* Footer */}
                  <div className="mt-auto flex flex-row items-center justify-between">
                    <a
                      href={`#eval-${review.agentId}`}
                      className="flex items-center text-xs font-medium text-purple-600 hover:underline"
                      onClick={(e) => {
                        e.preventDefault();
                        const element = window.document.getElementById(`eval-${review.agentId}`);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                    >
                      Full Evaluation
                      <ChevronDownIcon className="ml-1 h-3 w-3" />
                    </a>
                    <div className="flex items-center gap-4">
                      <a
                        href={`/docs/${document.id}/evals/${review.agentId}`}
                        className="flex items-center text-xs font-medium text-gray-400 hover:text-gray-700 hover:underline"
                        rel="noopener noreferrer"
                      >
                        <CommandLineIcon className="mr-1 h-4 w-4" />
                        Details
                      </a>
                      <a
                        href={`/docs/${document.id}/evals/${review.agentId}/versions`}
                        className="flex items-center text-xs font-medium text-gray-400 hover:text-gray-700 hover:underline"
                      >
                        v{review.versions?.[0]?.version || "1"}
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
