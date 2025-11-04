"use client";

import {
  ChatBubbleLeftIcon,
  CommandLineIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { useRouter, useSearchParams } from "next/navigation";
import { type RefObject, useState, memo } from "react";

import { AppIcon } from "@/components/AppIcon";
// import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { EvaluationCard } from "./EvaluationCard";
import type { Document } from "@/shared/types/databaseTypes";
import type { EvaluationState } from "../types";
import { useScrollHeaderBehavior } from "../hooks/useScrollHeaderBehavior";

interface EvaluationCardsHeaderProps {
  document: Document;
  evaluationState: EvaluationState;
  onEvaluationStateChange?: (newState: EvaluationState) => void;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  showDebugComments?: boolean;
  onToggleDebugComments?: () => void;
  isOwner?: boolean;
  onRerun?: (agentId: string) => void;
}

function EvaluationCardsHeaderComponent({
  document,
  evaluationState,
  onEvaluationStateChange,
  scrollContainerRef,
  showDebugComments = false,
  onToggleDebugComments,
  isOwner = false,
  onRerun,
}: EvaluationCardsHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Local expand/collapse managed here to avoid parent re-renders
  const { isLargeMode, setIsLargeMode } = useScrollHeaderBehavior(
    scrollContainerRef ?? { current: null }
  );

  if (!document || !evaluationState) {
    return null;
  }

  const updateUrlParams = (selectedIds: Set<string>) => {
    const params = new URLSearchParams(searchParams.toString());

    if (selectedIds.size === 0) {
      params.delete("evals");
    } else {
      params.set("evals", Array.from(selectedIds).join(","));
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
    const [showMoreOpen, setShowMoreOpen] = useState(false);
    const maxVisible = 4;
    // Filter out evaluations with 0 comments
    const reviewsWithComments = document.reviews.filter(
      (review) => review.comments && review.comments.length > 0
    );
    const visibleReviews = reviewsWithComments.slice(0, maxVisible);
    const hiddenReviews = reviewsWithComments.slice(maxVisible);
    const hasHiddenReviews = hiddenReviews.length > 0;

    return (
      <div
        className="flex min-w-0 flex-shrink items-center gap-2 overflow-x-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Show first 3 agents */}
        {visibleReviews.map((review) => {
          const isActive = evaluationState.selectedAgentIds.has(review.agentId);
          return (
            <div
              key={review.agentId}
              className={`inline-flex h-8 flex-shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border px-3 text-xs transition-all duration-200 hover:border-gray-300 hover:bg-gray-200 ${
                isActive
                  ? "border-gray-300 bg-gray-200 hover:bg-gray-300"
                  : "border-gray-200 bg-white"
              }`}
              onClick={() => onToggleAgent(review.agentId)}
              title={`${isActive ? "Hide" : "Show"} ${review.agent.name} evaluation`}
            >
              <Checkbox asChild checked={isActive}>
                <span className="pointer-events-none" />
              </Checkbox>
              {review.agent.name}
              <div className="flex items-center gap-0.5 text-xs">
                <ChatBubbleLeftIcon className="h-3 w-3" />
                <span>{review.comments?.length || 0}</span>
              </div>
            </div>
          );
        })}

        {/* Show more dropdown if there are hidden agents */}
        {hasHiddenReviews && (
          <Popover open={showMoreOpen} onOpenChange={setShowMoreOpen}>
            <PopoverTrigger asChild>
              <div
                className="inline-flex h-8 flex-shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border border-gray-200 bg-white px-3 text-xs transition-all duration-200 hover:border-gray-300 hover:bg-gray-200"
                title={`Show ${hiddenReviews.length} more evaluators`}
              >
                <ChevronDownIcon className="mr-1.5 h-3.5 w-3.5" />
                Show {hiddenReviews.length} More
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2" align="end">
              <div className="space-y-1">
                <div className="px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Evaluators
                </div>
                {hiddenReviews.map((review) => {
                  const isActive = evaluationState.selectedAgentIds.has(
                    review.agentId
                  );
                  return (
                    <div
                      key={review.agentId}
                      className="flex h-9 w-full cursor-pointer items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-gray-100"
                      onClick={() => {
                        onToggleAgent(review.agentId);
                        setShowMoreOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox asChild checked={isActive}>
                          <span className="pointer-events-none h-3 w-3" />
                        </Checkbox>
                        <span className="text-sm">{review.agent.name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <ChatBubbleLeftIcon className="h-3 w-3" />
                        <span>{review.comments?.length || 0}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}
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
      <div onClick={(e) => e.stopPropagation()}>
        <div
          className={`inline-flex h-8 flex-shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border px-3 text-xs transition-all duration-200 hover:border-gray-300 hover:bg-gray-200 ${
            showDebug
              ? "border-red-300 bg-red-200 hover:bg-red-300"
              : "border-gray-200 bg-white"
          }`}
          onClick={onToggle}
          title={showDebug ? "Hide debug comments" : "Show debug comments"}
        >
          <Checkbox asChild checked={showDebug}>
            <span className="pointer-events-none" />
          </Checkbox>
          Debug
          <CommandLineIcon className="h-3 w-3" />
        </div>
      </div>
    );
  }

  return (
    <Accordion
      type="single"
      collapsible
      value={isLargeMode ? "evaluations" : ""}
      onValueChange={(_value) => {
        setIsLargeMode(!isLargeMode);
      }}
    >
      <AccordionItem value="evaluations" className="border-none">
        <AccordionTrigger className="min-w-0 px-4 py-2 hover:no-underline">
          <div className="flex items-center gap-2">
            <AppIcon name="evaluation" size={16} className="text-gray-600" />
            <span>
              {document.reviews.length} AI Evaluation
              {document.reviews.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="ml-auto mr-3 flex min-w-0 flex-shrink-0 items-center gap-2">
            {!isLargeMode && (
              <>
                <EvaluationPillsRow
                  document={document}
                  evaluationState={evaluationState}
                  onToggleAgent={handleToggleAgent}
                />
                {onToggleDebugComments && (
                  <DebugToggleButton
                    showDebug={showDebugComments}
                    onToggle={onToggleDebugComments}
                  />
                )}
              </>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="border-t border-gray-100 px-4 pb-4 pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {document.reviews.map((review) => (
              <EvaluationCard
                key={review.agentId}
                review={review}
                documentId={document.id}
                isActive={evaluationState.selectedAgentIds.has(review.agentId)}
                onToggle={() => handleToggleAgent(review.agentId)}
                isOwner={isOwner}
                onRerun={onRerun}
              />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

// Prevent re-renders on hover-only state changes by comparing only relevant props
const areEqual = (
  prev: EvaluationCardsHeaderProps,
  next: EvaluationCardsHeaderProps
) => {
  const selectedPrev = prev.evaluationState.selectedAgentIds;
  const selectedNext = next.evaluationState.selectedAgentIds;

  return (
    prev.document === next.document &&
    selectedPrev === selectedNext &&
    prev.showDebugComments === next.showDebugComments &&
    prev.isOwner === next.isOwner &&
    prev.onRerun === next.onRerun &&
    prev.scrollContainerRef === next.scrollContainerRef &&
    prev.onToggleDebugComments === next.onToggleDebugComments &&
    prev.onEvaluationStateChange === next.onEvaluationStateChange
  );
};

export const EvaluationCardsHeader = memo(
  EvaluationCardsHeaderComponent,
  areEqual
);
