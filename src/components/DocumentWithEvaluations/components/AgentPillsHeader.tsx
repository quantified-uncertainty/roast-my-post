"use client";

import { ChatBubbleLeftIcon } from "@heroicons/react/24/outline";

import { GradeBadge } from "../../GradeBadge";

interface AgentPillsHeaderProps {
  document: any;
  evaluationState: any;
  onEvaluationStateChange?: (newState: any) => void;
}

export function AgentPillsHeader({
  document,
  evaluationState,
  onEvaluationStateChange,
}: AgentPillsHeaderProps) {
  if (!document || !evaluationState) {
    return null;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {document.reviews.map((review: any) => {
          const isActive = evaluationState.selectedAgentIds.has(review.agentId);
          return (
            <button
              key={review.agentId}
              onClick={() => {
                if (onEvaluationStateChange) {
                  // Toggle agent selection in multi-agent mode
                  const newSelectedIds = new Set(
                    evaluationState.selectedAgentIds
                  );
                  if (newSelectedIds.has(review.agentId)) {
                    newSelectedIds.delete(review.agentId);
                  } else {
                    newSelectedIds.add(review.agentId);
                  }
                  onEvaluationStateChange({
                    ...evaluationState,
                    selectedAgentIds: newSelectedIds,
                  });
                }
              }}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-100 text-blue-700 ring-1 ring-blue-600"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {review.agent.name}
              <div className="flex items-center gap-1.5">
                {review.grade !== undefined && (
                  <GradeBadge grade={review.grade} variant="light" size="xs" />
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
  );
}
