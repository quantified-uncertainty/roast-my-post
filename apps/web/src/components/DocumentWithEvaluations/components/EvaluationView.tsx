"use client";

import {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import type { Comment as DbComment } from "@/shared/types/databaseTypes";
import type { Comment } from "@roast/ai";
import { getValidAndSortedComments } from "@/shared/utils/ui/commentUtils";

import { LAYOUT } from "../constants";
import { useScrollBehavior } from "../hooks/useScrollBehavior";
import { EvaluationViewProps } from "../types";
import { CommentsColumn } from "./CommentsColumn";
import { CommentModalOptimized } from "./CommentModalOptimized";
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
  
  // Pre-convert all comments to AI format and create lookup maps for O(1) access
  const { aiCommentsMap, modalComments } = useMemo(() => {
    const commentsMap = new Map<string, { 
      comment: Comment; 
      agentName: string; 
    }>();
    const modalCommentsArray: Array<{
      comment: Comment;
      agentName: string;
      commentId: string;
    }> = [];
    
    displayComments.forEach((dbComment, index) => {
      const id = dbComment.id || `temp-${index}`;
      const aiComment = dbCommentToAiComment(dbComment);
      
      commentsMap.set(id, {
        comment: aiComment,
        agentName: dbComment.agentName || "Unknown",
      });
      
      modalCommentsArray.push({
        comment: aiComment,
        agentName: dbComment.agentName || "Unknown",
        commentId: id,
      });
    });
    
    return { 
      aiCommentsMap: commentsMap, 
      modalComments: modalCommentsArray
    };
  }, [displayComments]);

  // Debounced URL update to prevent race conditions
  const urlUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const updateUrlDebounced = useCallback((commentId: string | null) => {
    // Clear any pending URL update
    if (urlUpdateTimerRef.current) {
      clearTimeout(urlUpdateTimerRef.current);
    }
    
    // Schedule new URL update after 500ms of no changes
    urlUpdateTimerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (commentId) {
        params.set('comment', commentId);
      } else {
        params.delete('comment');
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    }, 500); // 500ms delay
  }, [router, searchParams]);
  
  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (urlUpdateTimerRef.current) {
        clearTimeout(urlUpdateTimerRef.current);
      }
    };
  }, []);
  
  // Check for comment query param on mount and when it changes
  // Only update if the modal isn't already showing this comment (prevents double updates)
  const commentIdFromUrl = searchParams.get('comment');
  useEffect(() => {
    if (commentIdFromUrl && aiCommentsMap.size > 0) {
      // Only update if we're not already showing this comment
      if (evaluationState.modalComment?.commentId !== commentIdFromUrl) {
        const commentData = aiCommentsMap.get(commentIdFromUrl);
        if (commentData) {
          onEvaluationStateChange?.({
            ...evaluationState,
            modalComment: {
              comment: commentData.comment,
              agentName: commentData.agentName,
              commentId: commentIdFromUrl,
            },
          });
        }
      }
    } else if (!commentIdFromUrl && evaluationState.modalComment) {
      // Clear modal if URL param is removed
      onEvaluationStateChange?.({
        ...evaluationState,
        modalComment: null,
      });
    }
  }, [commentIdFromUrl]); // Simplified deps - only react to URL changes

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
                onCommentClick={(commentIndex, comment) => {
                  const actualCommentId = comment.id || `temp-${commentIndex}`;
                  const commentData = aiCommentsMap.get(actualCommentId);
                  
                  if (commentData) {
                    // Update state first (immediate UI update)
                    onEvaluationStateChange?.({
                      ...evaluationState,
                      modalComment: {
                        comment: commentData.comment,
                        agentName: commentData.agentName,
                        commentId: actualCommentId,
                      },
                    });
                    
                    // Update URL with debouncing
                    updateUrlDebounced(actualCommentId);
                  }
                }}
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
      
      {/* Optimized Comment Modal - always mounted, just swaps content */}
      <CommentModalOptimized
        comments={modalComments}
        currentCommentId={evaluationState.modalComment?.commentId || null}
        isOpen={!!evaluationState.modalComment}
        onClose={() => {
          // Clear state immediately
          onEvaluationStateChange?.({
            ...evaluationState,
            modalComment: null,
          });
          
          // Update URL with debouncing
          updateUrlDebounced(null);
        }}
        onNavigate={(nextCommentId) => {
          const commentData = aiCommentsMap.get(nextCommentId);
          if (commentData) {
            // Update state immediately
            onEvaluationStateChange?.({
              ...evaluationState,
              modalComment: {
                comment: commentData.comment,
                agentName: commentData.agentName,
                commentId: nextCommentId,
              },
            });
            
            // Update URL with debouncing (waits 500ms after last navigation)
            updateUrlDebounced(nextCommentId);
          }
        }}
      />
    </>
  );
}
