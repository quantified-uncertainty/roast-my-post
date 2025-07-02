"use client";

import {
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";

import Link from "next/link";
import { logger } from "@/lib/logger";
// @ts-ignore - ESM modules are handled by Next.js
import ReactMarkdown from "react-markdown";
// @ts-ignore - ESM modules are handled by Next.js
import rehypeRaw from "rehype-raw";
// @ts-ignore - ESM modules are handled by Next.js
import remarkGfm from "remark-gfm";

import { Button } from "@/components/Button";
import type {
  Comment,
  Document,
  Evaluation,
} from "@/types/documentSchema";
import {
  getCommentColorByGrade,
  getValidAndSortedComments,
} from "@/utils/ui/commentUtils";
import { HEADER_HEIGHT_PX } from "@/utils/ui/constants";
import { getDocumentFullContent } from "@/utils/documentContentHelpers";
import {
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ClipboardDocumentListIcon,
  ListBulletIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import {
  CheckCircleIcon,
  CheckIcon,
  StarIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";

import { GradeBadge } from "./GradeBadge";
import SlateEditor from "./SlateEditor";
import { QuickAgentButtons } from "./AgentSelector";
import { EvaluationAnalysisModal } from "./EvaluationAnalysisModal";
import { CommentsColumn } from "./CommentsColumn";

function MarkdownRenderer({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  const isInline = className.includes("inline");
  return (
    <div className={`${className} ${isInline ? "[&_p]:m-0 [&_p]:inline" : ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          a: ({ node, ...props }) => (
            <a
              {...props}
              className="text-blue-600 hover:text-blue-800 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            />
          ),
          p: ({ children }) => (isInline ? <>{children}</> : <p>{children}</p>),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

function getImportancePhrase(importance: number): string {
  if (importance >= 96) return "Very High";
  if (importance >= 90) return "High";
  if (importance >= 80) return "Medium";
  if (importance >= 45) return "Low";
  return "Very Low";
}

/**
 * Handles hover and click interactions for comments in the sidebar.
 * Note: Comments can be interacted with in two places:
 * 1. In the document content (via SlateEditor's onHighlightHover and onHighlightClick)
 * 2. In this sidebar (via onCommentHover and onCommentClick)
 * Both hover interactions update the same hoveredCommentId state
 * Both click interactions update the same expandedCommentId state
 */
interface CommentsSidebarProps {
  comments: Comment[];
  activeTag: string | null;
  expandedTag: string | null;
  onCommentHover: (tag: string | null) => void;
  onCommentClick: (tag: string | null) => void;
  evaluation: Evaluation;
  commentColorMap: Record<number, { background: string; color: string }>;
}

function CommentsSidebar({
  comments,
  activeTag,
  expandedTag,
  onCommentHover,
  onCommentClick,
  evaluation,
  commentColorMap,
}: CommentsSidebarProps) {
  // Get valid and sorted comments
  const sortedComments = getValidAndSortedComments(comments);

  return (
    <div className="px-4">
      <div className="divide-y divide-gray-100">
        {sortedComments.map((comment: Comment, index: number) => {
          const tag = index.toString();
          const hasGradeInstructions = evaluation.agent.providesGrades ?? false;

          return (
            <div
              key={tag}
              className={`transition-all duration-200 ${
                expandedTag === tag ? "shadow-sm" : "hover:bg-gray-50"
              }`}
              onMouseEnter={() => onCommentHover(tag)}
              onMouseLeave={() => onCommentHover(null)}
              onClick={() => onCommentClick(tag)}
            >
              <div
                className={`px-4 py-3 ${expandedTag === tag ? "border-l-2 border-blue-400" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`} flex h-6 w-6 select-none items-center justify-center rounded-full text-sm font-medium transition-all duration-200`}
                    style={{
                      backgroundColor: commentColorMap[index].background,
                      color: commentColorMap[index].color,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        className={`font-medium ${expandedTag === tag ? "text-blue-900" : "text-gray-900"}`}
                      >
                        <MarkdownRenderer className="inline">
                          {comment.description.split('\n').slice(0, 2).join('\n')}
                        </MarkdownRenderer>
                      </h3>
                      <div className="flex shrink-0 items-center gap-2">
                        {hasGradeInstructions && (
                          <>
                            {comment.grade !== undefined && comment.grade > 70 && (
                              <CheckCircleIcon className="h-5 w-5 text-green-500 opacity-40" />
                            )}
                            {comment.grade !== undefined && comment.grade < 30 && (
                              <XCircleIcon className="h-5 w-5 text-red-500 opacity-40" />
                            )}
                          </>
                        )}
                        {comment.importance && comment.importance > 90 && (
                          <>
                            <StarIcon className="h-4 w-4 text-gray-300" />
                            <StarIcon className="h-4 w-4 text-gray-300" />
                          </>
                        )}
                        {comment.importance &&
                          comment.importance > 60 &&
                          comment.importance <= 90 && (
                            <StarIcon className="h-4 w-4 text-gray-300" />
                          )}
                        <ChevronLeftIcon
                          className={`h-4 w-4 transition-transform duration-200 ${
                            expandedTag === tag
                              ? "-rotate-90 text-gray-400"
                              : "text-gray-300"
                          }`}
                        />
                      </div>
                    </div>
                    {expandedTag === tag && comment.description.split('\n').length > 2 && (
                      <div className="mt-1 text-gray-800">
                        <MarkdownRenderer className="text-sm">
                          {comment.description.split('\n').slice(2).join('\n')}
                        </MarkdownRenderer>
                      </div>
                    )}
                    {expandedTag === tag && (
                      <div className="mt-2 text-xs text-gray-400">
                        {comment.grade !== undefined && (
                          <span className="mr-4">
                            Grade:{" "}
                            <GradeBadge
                              grade={comment.grade}
                              variant="light"
                              size="xs"
                            />
                          </span>
                        )}
                        {comment.importance !== undefined && (
                          <span>
                            Importance:{" "}
                            <span>
                              {getImportancePhrase(comment.importance)}
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface EvaluationSelectorProps {
  document: Document;
  activeEvaluationIndex: number | null;
  onEvaluationSelect: (index: number) => void;
}

function EvaluationSelector({
  document,
  activeEvaluationIndex,
  onEvaluationSelect,
}: EvaluationSelectorProps) {
  // Handle case where there are no evaluations
  if (!document.reviews || document.reviews.length === 0) {
    return (
      <div className="overflow-hidden border border-gray-200 bg-white p-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <ClipboardDocumentListIcon className="h-12 w-12" />
          </div>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">
            No evaluations yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            This document hasn't been evaluated by any agents yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="overflow-hidden border border-gray-200 bg-white">
      {document.reviews.map((evaluation, index) => {
        const isActive = index === activeEvaluationIndex;
        const grade = evaluation.grade;
        const highlightsCount = evaluation.comments.length;
        const isLast = index === document.reviews.length - 1;
        return (
          <li
            key={evaluation.agentId}
            className={
              `${!isLast ? "border-b border-gray-200" : ""} ` +
              (!isActive ? "transition-colors hover:bg-gray-100" : "")
            }
          >
            <button
              onClick={() => onEvaluationSelect(index)}
              className={`relative flex w-full flex-col gap-0 px-6 py-4 text-left transition-all duration-200 focus:outline-none ${
                isActive ? "bg-blue-50 ring-2 ring-blue-200" : "bg-transparent"
              }`}
              style={{ borderRadius: 0 }}
            >
              <div className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-semibold text-gray-900">
                    {evaluation.agent.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {evaluation.summary}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {grade !== undefined && (
                      <GradeBadge grade={grade} variant="light" />
                    )}
                    <span className="text-sm text-gray-500">
                      {highlightsCount} highlights
                    </span>
                  </div>
                </div>
                {isActive && (
                  <span className="absolute right-4 top-4 flex items-center justify-center">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-500">
                      <CheckIcon className="h-4 w-4 text-white" />
                    </span>
                  </span>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

interface DocumentWithReviewsProps {
  document: Document;
  isOwner?: boolean;
}

interface EvaluationState {
  selectedReviewIndex: number;
  selectedAgentIds: Set<string>;
  hoveredCommentId: string | null;
  expandedCommentId: string | null;
  isMultiAgentMode: boolean;
}

interface UIState {
  showEvaluationSelector: boolean;
  deleteError: string | null;
  evaluationCreationError: string | null;
  successMessage: string | null;
}



interface EvaluationViewProps {
  evaluation: Evaluation;
  evaluationState: EvaluationState;
  onEvaluationStateChange: (newState: EvaluationState) => void;
  onShowEvaluationSelector: () => void;
  commentColorMap: Record<number, { background: string; color: string }>;
  onRerunEvaluation: (agentId: string) => Promise<void>;
  document: Document;
  onEvaluationSelect: (index: number) => void;
  contentWithMetadata: string;
}

interface MultiAgentEvaluationViewProps {
  document: Document;
  evaluationState: EvaluationState;
  onEvaluationStateChange: (newState: EvaluationState) => void;
  contentWithMetadata: string;
  onRerunEvaluation: (agentId: string) => Promise<void>;
}

function EvaluationView({
  evaluation,
  evaluationState,
  onEvaluationStateChange,
  onShowEvaluationSelector,
  commentColorMap,
  onRerunEvaluation,
  document,
  onEvaluationSelect,
  contentWithMetadata,
}: EvaluationViewProps) {
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Get selected evaluations for multi-agent mode
  const selectedEvaluations = evaluationState.isMultiAgentMode
    ? document.reviews.filter(r => evaluationState.selectedAgentIds.has(r.agentId))
    : [evaluation];
  
  // Merge comments if in multi-agent mode
  const displayComments = useMemo(() => {
    if (!evaluationState.isMultiAgentMode) {
      return evaluation.comments;
    }
    
    const allComments: Array<Comment & { agentName: string }> = [];
    selectedEvaluations.forEach(evaluation => {
      evaluation.comments.forEach(comment => {
        allComments.push({
          ...comment,
          agentName: evaluation.agent.name,
        });
      });
    });
    
    return getValidAndSortedComments(allComments);
  }, [evaluationState.isMultiAgentMode, selectedEvaluations, evaluation.comments]);
  
  const highlights = useMemo(() => 
    displayComments.map(
      (comment: any, index: number) => ({
        startOffset: comment.highlight.startOffset,
        endOffset: comment.highlight.endOffset,
        tag: index.toString(),
        color: commentColorMap[index]?.background.substring(1) ?? "#3b82f6",
      })
    ),
    [displayComments, commentColorMap]
  );
  
  return (
    <div className="h-full flex flex-col overflow-x-hidden">

      {/* Agent info section at top */}
      {!evaluationState.isMultiAgentMode && (
        <div className="border-b border-gray-200 bg-white px-4 py-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">{evaluation.agent.name}</h3>
                {evaluation.agent.description && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    {evaluation.agent.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowAnalysisModal(true)}
                className="ml-4 inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Analysis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified scroll container for content and comments */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
        <div className="flex min-h-full">
          {/* Main content area */}
          <div ref={contentRef} className="flex-1 relative p-4">
            <article className="prose prose-lg prose-slate max-w-3xl mx-auto">
              <SlateEditor
                content={contentWithMetadata}
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
                highlights={highlights}
                activeTag={evaluationState.hoveredCommentId}
              />
            </article>
          </div>
          
          {/* Comments column with positioned comments */}
          <CommentsColumn
            comments={displayComments}
            evaluation={evaluation}
            contentRef={contentRef}
            selectedCommentId={evaluationState.expandedCommentId}
            hoveredCommentId={evaluationState.hoveredCommentId}
            commentColorMap={commentColorMap}
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
            document={document}
            evaluationState={evaluationState}
            onEvaluationStateChange={onEvaluationStateChange}
            onEvaluationSelect={onEvaluationSelect}
          />
        </div>
      </div>
      
      {/* Analysis Modal */}
      <EvaluationAnalysisModal
        isOpen={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        evaluation={evaluation}
        documentId={document.id}
      />
    </div>
  );
}

function MultiAgentEvaluationView({
  document,
  evaluationState,
  onEvaluationStateChange,
  contentWithMetadata,
  onRerunEvaluation,
}: MultiAgentEvaluationViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Get all selected evaluations
  const selectedEvaluations = document.reviews.filter(
    review => evaluationState.selectedAgentIds.has(review.agentId)
  );
  
  // Merge comments from all selected evaluations
  const mergedComments = useMemo(() => {
    const allComments: Array<Comment & { agentId: string; agentName: string }> = [];
    
    selectedEvaluations.forEach(evaluation => {
      evaluation.comments.forEach(comment => {
        allComments.push({
          ...comment,
          agentId: evaluation.agentId,
          agentName: evaluation.agent.name,
        });
      });
    });
    
    // Get valid comments and sort by position in document
    const validComments = getValidAndSortedComments(allComments);
    return validComments;
  }, [selectedEvaluations]);
  
  // Create color map for merged comments
  const commentColorMap = useMemo(() => {
    const colorMap: Record<number, { background: string; color: string }> = {};
    
    // Create a map of agent colors
    const agentColors: Record<string, string> = {};
    
    const baseColors = [
      "#3b82f6", // blue
      "#10b981", // green
      "#f59e0b", // amber
      "#ef4444", // red
      "#8b5cf6", // violet
      "#ec4899", // pink
      "#06b6d4", // cyan
      "#84cc16", // lime
    ];
    
    selectedEvaluations.forEach((evaluation, index) => {
      agentColors[evaluation.agentId] = baseColors[index % baseColors.length];
    });
    
    mergedComments.forEach((comment: any, index: number) => {
      const baseColor = agentColors[comment.agentId] || "#3b82f6";
      const hasGrade = comment.grade !== undefined;
      
      if (hasGrade && comment.grade !== undefined) {
        colorMap[index] = getCommentColorByGrade(
          comment.grade,
          comment.importance,
          true,
          [],
          index
        );
      } else {
        // Use agent-specific color
        colorMap[index] = {
          background: baseColor + "20", // 20% opacity
          color: baseColor,
        };
      }
    });
    
    return colorMap;
  }, [mergedComments, selectedEvaluations]);
  
  const highlights = useMemo(() => 
    mergedComments.map(
      (comment: any, index: number) => ({
        startOffset: comment.highlight.startOffset,
        endOffset: comment.highlight.endOffset,
        tag: index.toString(),
        color: commentColorMap[index]?.background.substring(1) ?? "3b82f6",
      })
    ),
    [mergedComments, commentColorMap]
  );
  
  // Toggle agent selection
  const toggleAgentSelection = (agentId: string) => {
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
  };
  
  return (
    <div className="h-full flex flex-col overflow-x-hidden">
      {/* Unified scroll container for content and comments */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
        <div className="flex min-h-full">
          {/* Main content area */}
          <div ref={contentRef} className="flex-1 relative p-4">
            <article className="prose prose-lg prose-slate max-w-3xl mx-auto">
              <SlateEditor
                content={contentWithMetadata}
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
                highlights={highlights}
                activeTag={evaluationState.hoveredCommentId}
              />
            </article>
          </div>
          
          {/* Comments column with agent pills */}
          <div className="border-l border-gray-200 bg-gray-50" style={{ width: "600px", flexShrink: 0 }}>
            {/* Sticky agent pills */}
            <div className="sticky top-0 z-20 border-b border-gray-200 bg-white px-4 py-3">
              <div className="flex flex-wrap gap-2">
                {document.reviews.map((review) => {
                  const isActive = evaluationState.selectedAgentIds.has(review.agentId);
                  return (
                    <button
                      key={review.agentId}
                      onClick={() => toggleAgentSelection(review.agentId)}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-blue-100 text-blue-700 ring-1 ring-blue-600"
                          : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                      }`}
                    >
                      {review.agent.name}
                      {review.grade !== undefined && (
                        <GradeBadge grade={review.grade} variant="light" size="xs" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Comments */}
            {mergedComments.length > 0 && selectedEvaluations.length > 0 ? (
              <CommentsColumn
                comments={mergedComments}
                evaluation={{
                  ...selectedEvaluations[0],
                  comments: mergedComments,
                  agent: {
                    ...selectedEvaluations[0].agent,
                    name: "Multiple Agents",
                  },
                } as any}
                contentRef={contentRef}
                selectedCommentId={evaluationState.expandedCommentId}
                hoveredCommentId={evaluationState.hoveredCommentId}
                commentColorMap={commentColorMap}
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
              />
            ) : (
              <div className="p-8 text-center text-gray-500">
                No comments from selected agents
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


interface EvaluationSelectorModalProps {
  document: Document;
  activeEvaluationIndex: number | null;
  onEvaluationSelect: (index: number) => void;
  onClose: () => void;
}

function EvaluationSelectorModal({
  document,
  activeEvaluationIndex,
  onEvaluationSelect,
  onClose,
}: EvaluationSelectorModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose} />
      <div className="relative z-50 w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Select Evaluation
          </h2>
          <button
            className="px-2 text-2xl font-bold text-gray-400 hover:text-gray-600"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <EvaluationSelector
          document={document}
          activeEvaluationIndex={activeEvaluationIndex}
          onEvaluationSelect={(index) => {
            onEvaluationSelect(index);
            onClose();
          }}
        />
      </div>
    </div>
  );
}


export function DocumentWithEvaluations({
  document,
  isOwner,
}: DocumentWithReviewsProps) {
  const [evaluationState, setEvaluationState] =
    useState<EvaluationState | null>(null);
  const [uiState, setUIState] = useState<UIState>({
    showEvaluationSelector: false,
    deleteError: null,
    evaluationCreationError: null,
    successMessage: null,
  });

  const hasEvaluations = document.reviews && document.reviews.length > 0;
  const activeEvaluation =
    hasEvaluations && evaluationState !== null
      ? document.reviews[evaluationState.selectedReviewIndex]
      : null;
      
  // Get the full content with prepend using the centralized helper
  const contentWithMetadata = useMemo(() => {
    const { content } = getDocumentFullContent(document);
    return content;
  }, [document]);

  // Automatically select the first evaluation on mount
  useEffect(() => {
    if (hasEvaluations && evaluationState === null) {
      handleEvaluationSelect(0);
    }
  }, [hasEvaluations]);

  // Create a stable color map for all comments
  const commentColorMap = useMemo(() => {
    if (!evaluationState) return {};
    
    // For multi-agent mode, create colors based on agent
    if (evaluationState.isMultiAgentMode) {
      const selectedEvaluations = document.reviews.filter(
        r => evaluationState.selectedAgentIds.has(r.agentId)
      );
      
      const allComments: Array<Comment & { agentId: string }> = [];
      selectedEvaluations.forEach(evaluation => {
        evaluation.comments.forEach(comment => {
          allComments.push({
            ...comment,
            agentId: evaluation.agentId,
          });
        });
      });
      
      const sortedComments = getValidAndSortedComments(allComments);
      const colorMap: Record<number, { background: string; color: string }> = {};
      
      // Define agent colors
      const agentColors: Record<string, string> = {};
      const baseColors = [
        "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
        "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"
      ];
      
      selectedEvaluations.forEach((evaluation, idx) => {
        agentColors[evaluation.agentId] = baseColors[idx % baseColors.length];
      });
      
      sortedComments.forEach((comment: any, index: number) => {
        const baseColor = agentColors[comment.agentId] || "#3b82f6";
        colorMap[index] = {
          background: baseColor + "20",
          color: baseColor,
        };
      });
      
      return colorMap;
    }
    
    // Single agent mode - original logic
    if (!activeEvaluation) return {};
    const sortedComments = getValidAndSortedComments(activeEvaluation.comments);
    const hasGradeInstructions = activeEvaluation.agent.providesGrades ?? false;

    // Get all importance values for percentile calculation
    const allImportances = sortedComments
      .map((comment: Comment) => comment.importance)
      .filter(
        (importance: number | undefined): importance is number =>
          importance !== undefined
      );

    return sortedComments.reduce(
      (
        map: Record<number, { background: string; color: string }>,
        comment: Comment,
        index: number
      ) => {
        if (hasGradeInstructions && comment.grade !== undefined) {
          map[index] = getCommentColorByGrade(
            comment.grade,
            comment.importance,
            true,
            allImportances,
            index
          );
        } else {
          map[index] = getCommentColorByGrade(
            undefined,
            comment.importance,
            false,
            allImportances,
            index
          );
        }
        return map;
      },
      {} as Record<number, { background: string; color: string }>
    );
  }, [activeEvaluation, evaluationState, document.reviews]);

  const handleEvaluationSelect = (index: number) => {
    // Initialize with all agent IDs selected for multi-agent mode
    const allAgentIds = new Set(document.reviews.map(r => r.agentId));
    setEvaluationState({
      selectedReviewIndex: index,
      selectedAgentIds: allAgentIds,
      hoveredCommentId: null,
      expandedCommentId: null,
      isMultiAgentMode: true,
    });
  };


  const handleCreateEvaluation = async (agentId: string) => {
    try {
      const response = await fetch(`/api/documents/${document.id}/evaluations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create evaluation');
      }

      const result = await response.json();
      
      // Show success notification
      setUIState((prev) => ({ 
        ...prev, 
        evaluationCreationError: null,
        successMessage: result.created 
          ? 'Evaluation created and queued for processing'
          : 'Evaluation re-queued for processing'
      }));

      // Clear success message after 5 seconds
      setTimeout(() => {
        setUIState((prev) => ({ ...prev, successMessage: null }));
      }, 5000);

    } catch (error) {
      logger.error('Error creating evaluation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create evaluation';
      setUIState((prev) => ({ 
        ...prev, 
        evaluationCreationError: errorMessage
      }));

      // Clear error message after 8 seconds
      setTimeout(() => {
        setUIState((prev) => ({ ...prev, evaluationCreationError: null }));
      }, 8000);
    }
  };



  // Close modal on Esc
  useEffect(() => {
    if (!uiState.showEvaluationSelector) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setUIState((prev) => ({ ...prev, showEvaluationSelector: false }));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [uiState.showEvaluationSelector]);

  return (
    <div 
      className="h-full bg-gray-50"
      style={{ height: `calc(100vh - ${HEADER_HEIGHT_PX}px)` }}
    >
      {activeEvaluation && evaluationState ? (
        <EvaluationView
          evaluation={activeEvaluation}
          evaluationState={evaluationState}
          onEvaluationStateChange={setEvaluationState}
          onShowEvaluationSelector={() =>
            setUIState((prev) => ({ ...prev, showEvaluationSelector: true }))
          }
          commentColorMap={commentColorMap}
          onRerunEvaluation={handleCreateEvaluation}
          document={document}
          onEvaluationSelect={handleEvaluationSelect}
          contentWithMetadata={contentWithMetadata}
        />
      ) : (
        <div className="flex min-h-screen flex-col items-center justify-center bg-white p-4">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            No evaluations available
          </h1>
          <p className="mb-8 text-gray-600">
            This document hasn't been evaluated yet.
          </p>
        </div>
      )}
      {uiState.showEvaluationSelector && (
        <EvaluationSelectorModal
          document={document}
          activeEvaluationIndex={evaluationState?.selectedReviewIndex ?? null}
          onEvaluationSelect={handleEvaluationSelect}
          onClose={() =>
            setUIState((prev) => ({ ...prev, showEvaluationSelector: false }))
          }
        />
      )}
      {uiState.successMessage && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg bg-green-50 p-4 shadow-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Success
              </h3>
              <div className="mt-2 text-sm text-green-700">
                {uiState.successMessage}
              </div>
              <div className="mt-3">
                <button
                  onClick={() => setUIState(prev => ({ ...prev, successMessage: null }))}
                  className="text-sm font-medium text-green-800 hover:text-green-900"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {uiState.evaluationCreationError && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg bg-red-50 p-4 shadow-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircleIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Evaluation Creation Failed
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {uiState.evaluationCreationError}
              </div>
              <div className="mt-3">
                <button
                  onClick={() => setUIState(prev => ({ ...prev, evaluationCreationError: null }))}
                  className="text-sm font-medium text-red-800 hover:text-red-900"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
