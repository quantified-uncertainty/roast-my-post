"use client";

import {
  useMemo,
  useRef,
  useState,
} from "react";

import type { Comment as DbComment } from "@/types/databaseTypes";
import { getValidAndSortedComments } from "@/utils/ui/commentUtils";

import { useScrollBehavior } from "../hooks/useScrollBehavior";
import { EvaluationViewProps } from "../types";
import { EvaluationCardsHeader } from "./EvaluationCardsHeader";
import { DocumentContent } from "./DocumentContent";
import { CommentsColumn } from "./CommentsColumn";
import { EvaluationAnalysisSection } from "./EvaluationAnalysisSection";
import { LAYOUT, TIMING } from "../constants";

export function EvaluationView({
  evaluationState,
  onEvaluationStateChange,
  document,
  contentWithMetadataPrepend,
}: EvaluationViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const evaluationsSectionRef = useRef<HTMLDivElement>(null);
  const [isFullWidth, setIsFullWidth] = useState(false);

  // Use the scroll behavior hook
  const { scrollContainerRef, headerVisible, isLargeMode, setIsLargeMode } =
    useScrollBehavior({
      evaluationsSectionRef,
      isLargeMode: true,
    });

  // Get selected evaluations
  const selectedEvaluations = document.reviews.filter((r) =>
    evaluationState.selectedAgentIds.has(r.agentId)
  );

  // Merge comments from all selected evaluations
  const allComments = useMemo(() => {
    const comments: Array<DbComment & { agentName: string }> = [];
    selectedEvaluations.forEach((evaluation) => {
      evaluation.comments.forEach((comment) => {
        comments.push({
          ...comment,
          agentName: evaluation.agent.name,
        });
      });
    });

    return getValidAndSortedComments(comments);
  }, [selectedEvaluations]);

  // Use all comments directly
  const displayComments = allComments;

  const highlights = useMemo(
    () =>
      displayComments
        .filter((comment): comment is typeof comment & { highlight: NonNullable<typeof comment.highlight> } => 
          comment.highlight != null && 
          comment.highlight.startOffset != null && 
          comment.highlight.endOffset != null
        )
        .map((comment, index) => ({
          startOffset: comment.highlight.startOffset!,
          endOffset: comment.highlight.endOffset!,
          quotedText: comment.highlight.quotedText || "",
          tag: index.toString(),
          color: "#3b82f6",
        })),
    [displayComments]
  );

  // Get selected evaluations for the analysis section
  const selectedEvaluationsForAnalysis = document.reviews.filter((r) =>
    evaluationState.selectedAgentIds.has(r.agentId)
  );

  return (
    <>
      {/* Header wrapper that collapses when hidden */}
      <div
        className={`transition-all duration-[${TIMING.TRANSITION_DURATION}ms] ease-in-out ${
          headerVisible ? `max-h-[${LAYOUT.HEADER_MAX_HEIGHT}px]` : "max-h-0 overflow-hidden"
        }`}
      >
        {/* Sticky Evaluation Cards Header Bar */}
        <div className="sticky top-0 z-50 mx-5 mt-3 rounded-lg border border-gray-200 bg-slate-100 shadow-sm">
          <EvaluationCardsHeader
            document={document}
            evaluationState={evaluationState}
            onEvaluationStateChange={onEvaluationStateChange}
            isLargeMode={isLargeMode}
            onToggleMode={() => setIsLargeMode((v) => !v)}
          />
        </div>
      </div>

      {/* Main content container */}
      <div className="flex h-full flex-col overflow-x-hidden">
        {/* Unified scroll container for all content */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden pt-2"
        >
          {/* Document content and comments section */}
          <div
            className={`flex min-h-screen ${isFullWidth ? "px-5" : "justify-center"} py-5`}
          >
            {/* Main content area */}
            <DocumentContent
              document={document}
              contentWithMetadataPrepend={contentWithMetadataPrepend}
              highlights={highlights}
              hoveredCommentId={evaluationState.hoveredCommentId}
              onHighlightHover={(commentId) => {
                onEvaluationStateChange({
                  ...evaluationState,
                  hoveredCommentId: commentId,
                });
              }}
              onHighlightClick={(commentId) => {
                onEvaluationStateChange({
                  ...evaluationState,
                  expandedCommentId: commentId,
                });
              }}
              isFullWidth={isFullWidth}
              onToggleFullWidth={() => setIsFullWidth(!isFullWidth)}
              contentRef={contentRef}
            />
            {/* Comments column with filters and positioned comments */}
            <div style={{ width: `${LAYOUT.COMMENT_COLUMN_WIDTH}px`, flexShrink: 0 }}>
              <CommentsColumn
                comments={displayComments}
                contentRef={contentRef}
                selectedCommentId={evaluationState.expandedCommentId}
                hoveredCommentId={evaluationState.hoveredCommentId}
                onCommentHover={(commentId) =>
                  onEvaluationStateChange({
                    ...evaluationState,
                    hoveredCommentId: commentId,
                  })
                }
                onCommentClick={(commentId) => {
                  onEvaluationStateChange({
                    ...evaluationState,
                    expandedCommentId: commentId,
                  });
                }}
                document={document as any}
                evaluationState={evaluationState}
                onEvaluationStateChange={onEvaluationStateChange}
              />
            </div>
          </div>

          {/* Evaluation Analysis Section */}
          <div ref={evaluationsSectionRef}>
            <EvaluationAnalysisSection
              document={document}
              selectedEvaluations={selectedEvaluationsForAnalysis}
            />
          </div>
        </div>
      </div>
    </>
  );
}
