"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { logger } from "@/lib/logger";
import { useRouter } from "next/navigation";
// @ts-ignore - ESM modules are handled by Next.js
import ReactMarkdown from "react-markdown";
// @ts-ignore - ESM modules are handled by Next.js
import rehypeRaw from "rehype-raw";
// @ts-ignore - ESM modules are handled by Next.js
import remarkGfm from "remark-gfm";

import {
  deleteDocument,
  reuploadDocument,
} from "@/app/docs/[docId]/preview/actions";
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
import { formatWordCount } from "@/utils/ui/documentUtils";
import { getDocumentFullContent } from "@/utils/documentContentHelpers";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ClipboardDocumentListIcon,
  ListBulletIcon,
  PencilIcon,
  TrashIcon,
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
import { AgentSelector, QuickAgentButtons } from "./AgentSelector";

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
                          {comment.title}
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
                    {comment.description && (
                      <div
                        className={`mt-1 ${
                          expandedTag === tag
                            ? "text-gray-800"
                            : "line-clamp-1 text-gray-600"
                        }`}
                      >
                        <MarkdownRenderer>
                          {comment.description}
                        </MarkdownRenderer>
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
  hoveredCommentId: string | null;
  expandedCommentId: string | null;
  activeTab: "analysis" | "comments" | "thinking" | "selfCritique";
}

interface UIState {
  isHomeView: boolean;
  showEvaluationSelector: boolean;
  deleteError: string | null;
  isReuploadingDocument: boolean;
  evaluationCreationError: string | null;
  successMessage: string | null;
}

interface HomeViewProps {
  document: Document;
  isOwner?: boolean;
  onEvaluationSelect: (index: number) => void;
  activeEvaluationIndex: number | null;
  isReuploadingDocument: boolean;
  onReupload: () => Promise<void>;
  onCreateEvaluation: (agentId: string) => Promise<void>;
  onCreateMultipleEvaluations: (agentIds: string[]) => Promise<void>;
}

function HomeView({
  document,
  isOwner = false,
  onEvaluationSelect,
  activeEvaluationIndex,
  isReuploadingDocument,
  onReupload,
  onCreateEvaluation,
  onCreateMultipleEvaluations,
}: HomeViewProps) {
  const router = useRouter();

  return (
    <div className="h-full p-8">
      <EvaluationSelector
        document={document}
        activeEvaluationIndex={activeEvaluationIndex}
        onEvaluationSelect={onEvaluationSelect}
      />
    </div>
  );
}

interface TabNavigationProps {
  activeTab: "analysis" | "comments" | "thinking" | "selfCritique";
  onTabChange: (tab: "analysis" | "comments" | "thinking" | "selfCritique") => void;
}

function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex border-b border-gray-200">
      <button
        className={`px-4 py-2 text-sm font-medium ${
          activeTab === "analysis"
            ? "border-b-2 border-blue-500 text-blue-600"
            : "text-gray-500 hover:text-blue-600"
        }`}
        onClick={() => onTabChange("analysis")}
      >
        Analysis
      </button>
      <button
        className={`px-4 py-2 text-sm font-medium ${
          activeTab === "comments"
            ? "border-b-2 border-blue-500 text-blue-600"
            : "text-gray-500 hover:text-blue-600"
        }`}
        onClick={() => onTabChange("comments")}
      >
        Comments
      </button>
    </div>
  );
}

interface EvaluationViewProps {
  evaluation: Evaluation;
  evaluationState: EvaluationState;
  onEvaluationStateChange: (newState: EvaluationState) => void;
  onBackToHome: () => void;
  onShowEvaluationSelector: () => void;
  commentColorMap: Record<number, { background: string; color: string }>;
  onRerunEvaluation: (agentId: string) => Promise<void>;
}

function EvaluationView({
  evaluation,
  evaluationState,
  onEvaluationStateChange,
  onBackToHome,
  onShowEvaluationSelector,
  commentColorMap,
  onRerunEvaluation,
}: EvaluationViewProps) {
  return (
    <div className="h-full">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-full items-center gap-2 px-3 py-0 text-base font-medium transition hover:bg-gray-100 focus:outline-none"
            onClick={onShowEvaluationSelector}
          >
            {evaluation.grade && (
              <GradeBadge grade={evaluation.grade} variant="light" />
            )}
            <span className="ml-2 mr-1 font-semibold text-gray-900">
              {evaluation.agent.name}
            </span>
            <ChevronDownIcon className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToHome}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back
          </button>
        </div>
      </div>

      <TabNavigation
        activeTab={evaluationState.activeTab}
        onTabChange={(tab) =>
          onEvaluationStateChange({ ...evaluationState, activeTab: tab })
        }
      />

      {evaluationState.activeTab === "analysis" && (
        <div className="prose-md prose max-w-none px-8 py-0.5">
          <div className="mb-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              Summary
            </h2>
            <MarkdownRenderer>{evaluation.summary}</MarkdownRenderer>
          </div>
          {evaluation.analysis && (
            <>
              <div className="my-6 h-px bg-gray-200" />
              <div>
                <h2 className="mb-3 text-lg font-semibold text-gray-900">
                  Analysis
                </h2>
                <MarkdownRenderer>{evaluation.analysis}</MarkdownRenderer>
              </div>
            </>
          )}
        </div>
      )}
      {evaluationState.activeTab === "thinking" && evaluation.thinking && (
        <div className="prose-md prose max-w-none px-8 py-0.5">
          <MarkdownRenderer>{evaluation.thinking}</MarkdownRenderer>
        </div>
      )}
      {evaluationState.activeTab === "selfCritique" && evaluation.selfCritique && (
        <div className="prose-md prose max-w-none px-8 py-0.5">
          <div className="mb-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              Self-Critique
            </h2>
            <MarkdownRenderer>{evaluation.selfCritique}</MarkdownRenderer>
          </div>
        </div>
      )}
      {evaluationState.activeTab === "comments" && (
        <CommentsSidebar
          comments={evaluation.comments}
          activeTag={evaluationState.hoveredCommentId}
          expandedTag={evaluationState.expandedCommentId}
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
              activeTab: "comments",
            });
          }}
          evaluation={evaluation}
          commentColorMap={commentColorMap}
        />
      )}
    </div>
  );
}

interface LoadingModalProps {
  isOpen: boolean;
  message: string;
}

function LoadingModal({ isOpen, message }: LoadingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" />
      <div className="relative z-50 rounded-lg bg-white p-8 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{message}</h2>
            <p className="text-sm text-gray-600">
              This may take a few moments...
            </p>
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

function DocumentContentPanel({
  document: doc,
  evaluationState,
  setEvaluationState,
  activeEvaluation,
  commentColorMap,
}: {
  document: Document;
  evaluationState: EvaluationState | null;
  setEvaluationState: (state: EvaluationState) => void;
  activeEvaluation: Evaluation | null;
  commentColorMap: Record<number, { background: string; color: string }>;
}) {
  // Add effect to scroll to selected comment
  useEffect(() => {
    if (evaluationState?.expandedCommentId) {
      const element = document.getElementById(
        `highlight-${evaluationState.expandedCommentId}`
      );
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [evaluationState?.expandedCommentId]);

  // Get the full content with prepend using the centralized helper
  const contentWithMetadata = useMemo(() => {
    const { content } = getDocumentFullContent(doc);
    return content;
  }, [doc]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <article className="prose prose-lg prose-slate max-w-none">
        <SlateEditor
          content={contentWithMetadata}
          onHighlightHover={(commentId) => {
            if (!evaluationState) return;
            setEvaluationState({
              ...evaluationState,
              hoveredCommentId: commentId,
            });
          }}
          onHighlightClick={(commentId) => {
            if (!evaluationState) return;
            setEvaluationState({
              ...evaluationState,
              expandedCommentId: commentId,
              activeTab: "comments",
            });
          }}
          highlights={
            activeEvaluation
              ? getValidAndSortedComments(activeEvaluation.comments).map(
                  (comment: Comment, index: number) => ({
                    startOffset: comment.highlight.startOffset,
                    endOffset: comment.highlight.endOffset,
                    tag: index.toString(),
                    color:
                      commentColorMap[index]?.background.substring(1) ??
                      "#3b82f6",
                  })
                )
              : []
          }
          activeTag={evaluationState?.hoveredCommentId ?? null}
        />
      </article>
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
    isHomeView: true,
    showEvaluationSelector: false,
    deleteError: null,
    isReuploadingDocument: false,
    evaluationCreationError: null,
    successMessage: null,
  });

  const hasEvaluations = document.reviews && document.reviews.length > 0;
  const activeEvaluation =
    hasEvaluations && evaluationState !== null
      ? document.reviews[evaluationState.selectedReviewIndex]
      : null;

  // Create a stable color map for all comments
  const commentColorMap = useMemo(() => {
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
  }, [activeEvaluation]);

  const handleEvaluationSelect = (index: number) => {
    setEvaluationState({
      selectedReviewIndex: index,
      hoveredCommentId: null,
      expandedCommentId: null,
      activeTab: "analysis",
    });
    setUIState((prev) => ({ ...prev, isHomeView: false }));
  };

  const handleBackToHome = () => {
    setEvaluationState(null);
    setUIState((prev) => ({ ...prev, isHomeView: true }));
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

  const handleCreateMultipleEvaluations = async (agentIds: string[]) => {
    if (agentIds.length === 0) return;

    try {
      const response = await fetch(`/api/documents/${document.id}/evaluations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create evaluations');
      }

      const result = await response.json();
      
      // Show success notification
      const createdCount = result.evaluations?.filter((e: any) => !e.error).length || 0;
      const errorCount = result.evaluations?.filter((e: any) => e.error).length || 0;
      
      let message = `${createdCount} evaluation(s) queued for processing`;
      if (errorCount > 0) {
        message += `, ${errorCount} failed`;
      }
      
      setUIState((prev) => ({ 
        ...prev, 
        evaluationCreationError: null,
        successMessage: message
      }));

      // Clear success message after 5 seconds
      setTimeout(() => {
        setUIState((prev) => ({ ...prev, successMessage: null }));
      }, 5000);

    } catch (error) {
      logger.error('Error creating evaluations:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create evaluations';
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

  const handleReupload = async () => {
    setUIState((prev) => ({ ...prev, isReuploadingDocument: true }));

    try {
      const result = await reuploadDocument(document.id);

      if (result.success) {
        // Refresh the page to show the updated content
        window.location.reload();
      } else {
        setUIState((prev) => ({ ...prev, isReuploadingDocument: false }));
        alert(result.error || "Failed to re-upload document");
      }
    } catch (error) {
      setUIState((prev) => ({ ...prev, isReuploadingDocument: false }));
      alert("An unexpected error occurred while re-uploading");
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
    <div className="flex">
      <div
        className="flex-1 overflow-y-auto"
        style={{ height: `calc(100vh - ${HEADER_HEIGHT_PX}px)` }}
      >
        <DocumentContentPanel
          document={document}
          evaluationState={evaluationState}
          setEvaluationState={setEvaluationState}
          activeEvaluation={activeEvaluation}
          commentColorMap={commentColorMap}
        />
      </div>
      <div
        className="flex-1 overflow-y-auto border-l border-gray-200"
        style={{ height: `calc(100vh - ${HEADER_HEIGHT_PX}px)` }}
      >
        {uiState.isHomeView ? (
          <HomeView
            document={document}
            isOwner={isOwner}
            onEvaluationSelect={handleEvaluationSelect}
            activeEvaluationIndex={evaluationState?.selectedReviewIndex ?? null}
            isReuploadingDocument={uiState.isReuploadingDocument}
            onReupload={handleReupload}
            onCreateEvaluation={handleCreateEvaluation}
            onCreateMultipleEvaluations={handleCreateMultipleEvaluations}
          />
        ) : activeEvaluation && evaluationState ? (
          <EvaluationView
            evaluation={activeEvaluation}
            evaluationState={evaluationState}
            onEvaluationStateChange={setEvaluationState}
            onBackToHome={handleBackToHome}
            onShowEvaluationSelector={() =>
              setUIState((prev) => ({ ...prev, showEvaluationSelector: true }))
            }
            commentColorMap={commentColorMap}
            onRerunEvaluation={handleCreateEvaluation}
          />
        ) : null}
      </div>
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
      <LoadingModal
        isOpen={uiState.isReuploadingDocument}
        message="Re-uploading document..."
      />
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
