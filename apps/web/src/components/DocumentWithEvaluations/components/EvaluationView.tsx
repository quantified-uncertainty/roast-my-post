"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Comment as DbComment } from "@/shared/types/databaseTypes";
import { dbCommentToAiComment } from "@/shared/utils/typeAdapters";
import { getValidAndSortedComments } from "@/shared/utils/ui/commentUtils";
import type { Comment } from "@roast/ai";

import { LAYOUT } from "../constants";
import { LocalCommentsUIProvider } from "../context/LocalCommentsUIContext";
import { EvaluationViewProps } from "../types";
import { CommentModalOptimized } from "./CommentModalOptimized";
import { CommentsColumn } from "./CommentsColumn";
import { DocumentContent } from "./DocumentContent";
import { DocumentMetadata } from "./DocumentMetadata";
import { EvaluationAnalysisSection } from "./EvaluationAnalysisSection";
import { EvaluationCardsHeader } from "./EvaluationCardsHeader";

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
  runningEvals: _runningEvals = new Set(),
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

  // Header expand/collapse tied to scroll (now handled inside header component as well)
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

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
  }, [allComments, localShowDebugComments]) as Array<
    DbComment & { agentName: string }
  >;

  // Pre-convert all comments to AI format and create lookup maps for O(1) access
  const { aiCommentsMap, modalComments } = useMemo(() => {
    const commentsMap = new Map<
      string,
      {
        comment: Comment;
        agentName: string;
      }
    >();
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
      modalComments: modalCommentsArray,
    };
  }, [displayComments]);

  // Track whether we're in "navigation mode" (using arrows) or "direct mode" (from URL)
  const isNavigationMode = useRef(false);

  // Scroll listener to hide header when evaluations section reaches the top
  useEffect(() => {
    const container = scrollContainerRef.current;
    const evaluationsSection = evaluationsSectionRef.current;
    if (!container || !evaluationsSection) return;

    const handleScroll = () => {
      const evalRect = evaluationsSection.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Hide header when top of evaluations section reaches top of container
      // Add small offset (50px) so it triggers slightly before reaching the exact top
      const isAtTop = evalRect.top <= containerRect.top + 50;
      setIsHeaderVisible(!isAtTop);
    };

    // Check initial state
    handleScroll();

    // Listen for scroll events
    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Handle URL-based navigation (when user shares a link or manually changes URL)
  const commentIdFromUrl = searchParams.get("comment");

  useEffect(() => {
    if (commentIdFromUrl && aiCommentsMap.size > 0) {
      // We're in "direct mode" - showing a specific comment from URL
      isNavigationMode.current = false;

      const commentData = aiCommentsMap.get(commentIdFromUrl);
      if (
        commentData &&
        evaluationState.modalComment?.commentId !== commentIdFromUrl
      ) {
        onEvaluationStateChange?.({
          ...evaluationState,
          modalComment: {
            comment: commentData.comment,
            agentName: commentData.agentName,
            commentId: commentIdFromUrl,
          },
        });
      }
    } else if (
      !commentIdFromUrl &&
      evaluationState.modalComment &&
      !isNavigationMode.current
    ) {
      // URL cleared externally, close modal
      onEvaluationStateChange?.({
        ...evaluationState,
        modalComment: null,
      });
    }
  }, [
    commentIdFromUrl,
    aiCommentsMap,
    evaluationState,
    onEvaluationStateChange,
  ]);

  // Filter comments with valid highlights once
  const commentsWithHighlights = useMemo(
    () =>
      displayComments.filter(
        (
          comment
        ): comment is typeof comment & {
          highlight: NonNullable<typeof comment.highlight>;
        } =>
          comment.highlight != null &&
          comment.highlight.startOffset != null &&
          comment.highlight.endOffset != null
      ),
    [displayComments]
  );

  const highlights = useMemo(() => {
    return commentsWithHighlights.map((comment) => {
      const originalIndex = displayComments.indexOf(comment);
      return {
        startOffset: comment.highlight.startOffset!,
        endOffset: comment.highlight.endOffset!,
        quotedText: comment.highlight.quotedText || "",
        tag: originalIndex.toString(),
        color: getLevelHighlightColor(comment.level),
      };
    });
  }, [commentsWithHighlights, displayComments]);

  // (Scroll behavior logic moved into useScrollHeaderBehavior hook)

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Fixed Evaluation Cards Header Bar */}
      <Card
        className={cn(
          "sticky top-0 z-50 mx-6 mt-2 transition-all duration-200",
          !isHeaderVisible &&
            "pointer-events-none h-0 overflow-hidden opacity-0"
        )}
      >
        <EvaluationCardsHeader
          document={document}
          evaluationState={evaluationState}
          onEvaluationStateChange={onEvaluationStateChange}
          scrollContainerRef={scrollContainerRef}
          showDebugComments={localShowDebugComments}
          onToggleDebugComments={handleToggleDebugComments}
          isOwner={isOwner}
          onRerun={onRerun}
        />
      </Card>

      {/* Main content container */}
      <div className="flex h-full min-h-0 flex-col overflow-x-hidden">
        {/* Unified scroll container for all content */}
        <div
          ref={scrollContainerRef}
          className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden overscroll-contain px-8 pb-8 pt-4"
        >
          {/* Document metadata header - now part of scrollable content */}
          <DocumentMetadata
            document={document}
            isFullWidth={isFullWidth}
            onToggleFullWidth={() => setIsFullWidth(!isFullWidth)}
          />
          {/* Document content and comments section */}
          <div
            className={cn(
              "flex min-h-screen",
              isFullWidth ? "" : "justify-center"
            )}
          >
            <LocalCommentsUIProvider>
              {/* Main content area */}
              <DocumentContent
                document={document}
                contentWithMetadataPrepend={contentWithMetadataPrepend}
                highlights={highlights}
                onHighlightClick={(tagIndex) => {
                  // tagIndex is the index as a string (e.g., "0", "1", etc.)
                  const commentIndex = parseInt(tagIndex);
                  const comment = commentsWithHighlights[commentIndex];

                  if (comment) {
                    // Find the original index to correctly construct a temporary ID if needed
                    const originalIndex = displayComments.indexOf(comment);
                    const actualCommentId =
                      comment.id || `temp-${originalIndex}`;
                    const commentData = aiCommentsMap.get(actualCommentId);

                    if (commentData) {
                      // Enter navigation mode (same as when clicking sidebar comment)
                      isNavigationMode.current = true;

                      // Open modal immediately for instant response
                      onEvaluationStateChange?.({
                        ...evaluationState,
                        modalComment: {
                          comment: commentData.comment,
                          agentName: commentData.agentName,
                          commentId: actualCommentId,
                        },
                      });
                    }
                  }
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
                <CommentsColumn
                  comments={displayComments}
                  contentRef={contentRef}
                  selectedCommentId={evaluationState.expandedCommentId}
                  onCommentClick={(commentIndex, comment) => {
                    const actualCommentId =
                      comment.id || `temp-${commentIndex}`;
                    const commentData = aiCommentsMap.get(actualCommentId);

                    if (commentData) {
                      // Enter navigation mode
                      isNavigationMode.current = true;

                      // Open modal immediately for instant response
                      onEvaluationStateChange?.({
                        ...evaluationState,
                        modalComment: {
                          comment: commentData.comment,
                          agentName: commentData.agentName,
                          commentId: actualCommentId,
                        },
                      });
                    }
                  }}
                  showDebugComments={localShowDebugComments}
                />
              </div>
            </LocalCommentsUIProvider>
          </div>

          {/* Evaluation Analysis Section */}
          <div ref={evaluationsSectionRef}>
            <EvaluationAnalysisSection
              document={document}
              evaluations={document.reviews}
            />
          </div>
        </div>
      </div>

      {/* Optimized Comment Modal - always mounted, just swaps content */}
      <CommentModalOptimized
        comments={modalComments}
        currentCommentId={evaluationState.modalComment?.commentId || null}
        isOpen={!!evaluationState.modalComment}
        hideNavigation={!!commentIdFromUrl && !isNavigationMode.current}
        onClose={() => {
          // Reset navigation mode
          isNavigationMode.current = false;

          // Clear URL if present
          if (commentIdFromUrl) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("comment");
            router.replace(`?${params.toString()}`, { scroll: false });
          }

          // Clear state
          onEvaluationStateChange?.({
            ...evaluationState,
            modalComment: null,
          });
        }}
        onNavigate={(nextCommentId) => {
          // Enter navigation mode
          isNavigationMode.current = true;

          const commentData = aiCommentsMap.get(nextCommentId);
          if (commentData) {
            // Update state immediately for instant navigation
            onEvaluationStateChange?.({
              ...evaluationState,
              modalComment: {
                comment: commentData.comment,
                agentName: commentData.agentName,
                commentId: nextCommentId,
              },
            });
          }
        }}
        onGetShareLink={(commentId) => {
          // Generate the shareable URL with the comment ID
          const params = new URLSearchParams(searchParams.toString());
          params.set("comment", commentId);
          const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
          return url;
        }}
      />
    </div>
  );
}
