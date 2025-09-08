"use client";

import {
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import type { Comment as DbComment } from "@/shared/types/databaseTypes";
import { getValidAndSortedComments } from "@/shared/utils/ui/commentUtils";

import { LAYOUT } from "../constants";
import { useScrollBehavior } from "../hooks/useScrollBehavior";
import { EvaluationViewProps } from "../types";
import { CommentsColumn } from "./CommentsColumn";
import { CommentModal } from "./CommentModal";
import { CommentToolbar } from "./CommentToolbar";
import { DocumentContent } from "./DocumentContent";
import { EvaluationAnalysisSection } from "./EvaluationAnalysisSection";
import { EvaluationCardsHeader } from "./EvaluationCardsHeader";
import { dbCommentToAiComment } from "@/shared/utils/typeAdapters";

/**
 * Maps comment levels to appropriate highlight colors
 */
function getLevelHighlightColor(level?: string | null): string {
  switch (level) {
    case "error":
      return "#dc2626"; // Brighter red - for false claims (more intense)
    case "warning":
      return "#f59e0b"; // Amber - for partially-true claims
    case "success":
      return "#86efac"; // Lighter green - for verified true claims (less intense)
    case "info":
    default:
      return "#93c5fd"; // Lighter blue - for info/unverified claims and default
  }
}

export function EvaluationView({
  evaluationState,
  onEvaluationStateChange,
  document,
  contentWithMetadataPrepend,
  showDebugComments = false,
  isOwner = false,
  onRerun,
  runningEvals = new Set(),
}: EvaluationViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contentRef = useRef<HTMLDivElement>(null);
  const evaluationsSectionRef = useRef<HTMLDivElement>(null);
  const [isFullWidth, setIsFullWidth] = useState(false);

  // Debug state management
  const [localShowDebugComments, setLocalShowDebugComments] =
    useState(showDebugComments);

  const handleToggleDebugComments = () => {
    const newShowDebug = !localShowDebugComments;
    setLocalShowDebugComments(newShowDebug);

    // Update URL parameter
    const params = new URLSearchParams(searchParams.toString());
    if (newShowDebug) {
      params.set("debug", "true");
    } else {
      params.delete("debug");
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
    return allComments.filter((comment) => comment.level !== "debug");
  }, [allComments, localShowDebugComments]) as Array<DbComment & { agentName: string }>;

  // Check for comment query param on mount and when it changes
  const commentIdFromUrl = searchParams.get('comment');
  useEffect(() => {
    if (commentIdFromUrl && displayComments.length > 0) {
      const commentIndex = parseInt(commentIdFromUrl);
      if (!isNaN(commentIndex) && commentIndex >= 0 && commentIndex < displayComments.length) {
        const comment = displayComments[commentIndex];
        if (!evaluationState.modalComment || evaluationState.modalComment.commentId !== commentIdFromUrl) {
          onEvaluationStateChange?.({
            ...evaluationState,
            modalComment: {
              comment: dbCommentToAiComment(comment),
              agentName: comment.agentName || "Unknown",
              commentId: commentIdFromUrl,
            },
          });
        }
      }
    }
  }, [commentIdFromUrl, displayComments.length]);

  const highlights = useMemo(
    () =>
      displayComments
        .filter(
          (
            comment
          ): comment is typeof comment & {
            highlight: NonNullable<typeof comment.highlight>;
          } =>
            comment.highlight != null &&
            comment.highlight.startOffset != null &&
            comment.highlight.endOffset != null
        )
        .map((comment, index) => ({
          startOffset: comment.highlight.startOffset!,
          endOffset: comment.highlight.endOffset!,
          quotedText: comment.highlight.quotedText || "",
          tag: index.toString(),
          color: getLevelHighlightColor(comment.level),
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
            isOwner={isOwner}
            onRerun={onRerun}
            runningEvals={runningEvals}
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
                onEvaluationStateChange?.({
                  ...evaluationState,
                  hoveredCommentId: commentId,
                });
              }}
              onHighlightClick={(commentId) => {
                onEvaluationStateChange?.({
                  ...evaluationState,
                  expandedCommentId: commentId,
                });
              }}
              isFullWidth={isFullWidth}
              contentRef={contentRef}
            />
            {/* Comments column with filters and positioned comments */}
            <div
              style={{
                width: `${LAYOUT.COMMENT_COLUMN_WIDTH}px`,
                flexShrink: 0,
                marginLeft: "2rem",
              }}
            >
              <CommentToolbar
                documentId={document.id}
                isFullWidth={isFullWidth}
                onToggleFullWidth={() => setIsFullWidth(!isFullWidth)}
              />
              <CommentsColumn
                comments={displayComments}
                contentRef={contentRef}
                selectedCommentId={evaluationState.expandedCommentId}
                hoveredCommentId={evaluationState.hoveredCommentId}
                onCommentHover={(commentId) =>
                  onEvaluationStateChange?.({
                    ...evaluationState,
                    hoveredCommentId: commentId,
                  })
                }
                onCommentClick={(commentId, comment) => {
                  const aiComment = dbCommentToAiComment(comment);
                  
                  // Update URL with comment ID
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('comment', commentId);
                  router.replace(`?${params.toString()}`, { scroll: false });
                  
                  onEvaluationStateChange?.({
                    ...evaluationState,
                    modalComment: {
                      comment: aiComment,
                      agentName: comment.agentName || "Unknown",
                      commentId: commentId,
                    },
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
      
      {/* Comment Modal */}
      <CommentModal
        comment={evaluationState.modalComment?.comment || null}
        agentName={evaluationState.modalComment?.agentName || ""}
        currentCommentId={evaluationState.modalComment?.commentId}
        totalComments={displayComments.length}
        isOpen={!!evaluationState.modalComment}
        onClose={() => {
          // Remove comment from URL
          const params = new URLSearchParams(searchParams.toString());
          params.delete('comment');
          router.replace(`?${params.toString()}`, { scroll: false });
          
          onEvaluationStateChange?.({
            ...evaluationState,
            modalComment: null,
          });
        }}
        onNavigate={(direction) => {
          const currentId = evaluationState.modalComment?.commentId;
          if (!currentId) return;
          
          const currentIndex = parseInt(currentId);
          const nextIndex = direction === 'next' 
            ? Math.min(currentIndex + 1, displayComments.length - 1)
            : Math.max(currentIndex - 1, 0);
          
          if (nextIndex !== currentIndex) {
            const nextComment = displayComments[nextIndex];
            const aiComment = dbCommentToAiComment(nextComment);
            
            // Update URL
            const params = new URLSearchParams(searchParams.toString());
            params.set('comment', nextIndex.toString());
            router.replace(`?${params.toString()}`, { scroll: false });
            
            onEvaluationStateChange?.({
              ...evaluationState,
              modalComment: {
                comment: aiComment,
                agentName: nextComment.agentName || "Unknown",
                commentId: nextIndex.toString(),
              },
            });
          }
        }}
      />
    </>
  );
}
