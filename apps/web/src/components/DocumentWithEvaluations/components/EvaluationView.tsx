"use client";

import {
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { Comment as DbComment } from "@/shared/types/databaseTypes";
import { getValidAndSortedComments } from "@/shared/utils/ui/commentUtils";

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
  showDebugComments = false,
}: EvaluationViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contentRef = useRef<HTMLDivElement>(null);
  const evaluationsSectionRef = useRef<HTMLDivElement>(null);
  const [isFullWidth, setIsFullWidth] = useState(false);

  // Debug state management
  const [localShowDebugComments, setLocalShowDebugComments] = useState(showDebugComments);
  
  const handleToggleDebugComments = () => {
    const newShowDebug = !localShowDebugComments;
    setLocalShowDebugComments(newShowDebug);
    
    // Update URL parameter
    const params = new URLSearchParams(searchParams.toString());
    if (newShowDebug) {
      params.set('debug', 'true');
    } else {
      params.delete('debug');
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

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

  // Filter debug comments if showDebugComments is false
  const displayComments = useMemo(() => {
    if (localShowDebugComments) {
      return allComments;
    }
    return allComments.filter(comment => comment.level !== 'debug');
  }, [allComments, localShowDebugComments]);

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
        className={`transition-all duration-300 ease-in-out ${
          headerVisible ? "max-h-96" : "max-h-0 overflow-hidden"
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
            showDebugComments={localShowDebugComments}
            onToggleDebugComments={handleToggleDebugComments}
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
                showDebugComments={localShowDebugComments}
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
