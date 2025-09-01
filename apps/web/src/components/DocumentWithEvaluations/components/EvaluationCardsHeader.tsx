"use client";

import {
  ChatBubbleLeftIcon,
  CommandLineIcon,
} from "@heroicons/react/24/outline";
import { Bot } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { EvaluationCard } from "./EvaluationCard";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import type { Document } from "@/shared/types/databaseTypes";
import type { EvaluationState } from "../types";

interface EvaluationCardsHeaderProps {
  document: Document;
  evaluationState: EvaluationState;
  onEvaluationStateChange?: (newState: EvaluationState) => void;
  isLargeMode?: boolean;
  onToggleMode?: () => void;
  showDebugComments?: boolean;
  onToggleDebugComments?: () => void;
  isOwner?: boolean;
  onRerun?: (agentId: string) => void;
}

export function EvaluationCardsHeader({
  document,
  evaluationState,
  onEvaluationStateChange,
  isLargeMode = false,
  onToggleMode,
  showDebugComments = false,
  onToggleDebugComments,
  isOwner = false,
  onRerun,
}: EvaluationCardsHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

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
    return (
      <div
        className="flex min-w-0 flex-shrink items-center gap-2 overflow-x-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {document.reviews.map((review) => {
          const isActive = evaluationState.selectedAgentIds.has(review.agentId);
          return (
            <Button
              key={review.agentId}
              variant={isActive ? "secondary" : "outline"}
              size="sm"
              className="h-8 flex-shrink-0 gap-2 whitespace-nowrap px-3 text-xs transition-all duration-200 hover:border-gray-300 hover:bg-gray-200 data-[state=active]:hover:bg-gray-300"
              onClick={() => onToggleAgent(review.agentId)}
              title={`${isActive ? "Hide" : "Show"} ${review.agent.name} evaluation`}
            >
              <Checkbox checked={isActive} className="pointer-events-none" />
              {review.agent.name}
              <div className="flex items-center gap-0.5 text-xs">
                <ChatBubbleLeftIcon className="h-3 w-3" />
                <span>{review.comments?.length || 0}</span>
              </div>
            </Button>
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
      <div onClick={(e) => e.stopPropagation()}>
        <Button
          variant={showDebug ? "destructive" : "outline"}
          size="sm"
          className="h-8 flex-shrink-0 gap-2 whitespace-nowrap px-3 text-xs transition-all duration-200 hover:border-gray-300 hover:bg-gray-200 data-[state=active]:hover:bg-red-600"
          onClick={onToggle}
          title={showDebug ? "Hide debug comments" : "Show debug comments"}
        >
          <Checkbox checked={showDebug} className="pointer-events-none" />
          <CommandLineIcon className="h-3 w-3" />
          Debug
        </Button>
      </div>
    );
  }

  return (
    <Accordion
      type="single"
      collapsible
      value={isLargeMode ? "evaluations" : ""}
      onValueChange={(_value) => {
        if (onToggleMode) {
          onToggleMode();
        }
      }}
    >
      <AccordionItem value="evaluations" className="border-none">
        <AccordionTrigger className="min-w-0 px-4 py-2 hover:no-underline">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
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
