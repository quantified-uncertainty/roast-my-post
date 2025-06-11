"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
// @ts-ignore - ESM modules are handled by Next.js
import ReactMarkdown from "react-markdown";
// @ts-ignore - ESM modules are handled by Next.js
import rehypeRaw from "rehype-raw";
// @ts-ignore - ESM modules are handled by Next.js
import remarkGfm from "remark-gfm";

import { deleteDocument } from "@/app/docs/[docId]/actions";
import { Button } from "@/components/Button";
import type {
  Comment,
  Document,
  Evaluation,
} from "@/types/documentSchema";
import {
  getCommentColorByGrade,
  getGradeColorStrong,
  getGradeColorWeak,
  getGradeLabel,
  getLetterGrade,
  getValidAndSortedComments,
} from "@/utils/commentUtils";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ListBulletIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  CheckCircleIcon,
  StarIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";

import SlateEditor from "./SlateEditor";

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

function getGradePhrase(grade: number): string {
  if (grade >= 80) return "Strongly positive";
  if (grade >= 60) return "Positive";
  if (grade >= 40) return "Neutral";
  if (grade >= 20) return "Negative";
  return "Strongly negative";
}

function getImportancePhrase(importance: number): string {
  if (importance >= 96) return "Very High";
  if (importance >= 90) return "High";
  if (importance >= 80) return "Medium";
  if (importance >= 45) return "Low";
  return "Very Low";
}

interface CommentsSidebarProps {
  comments: Comment[];
  activeTag: string | null;
  expandedTag: string | null;
  onTagHover: (tag: string | null) => void;
  onTagClick: (tag: string | null) => void;
  evaluation: Evaluation;
  commentColorMap: Record<number, { background: string; color: string }>;
}

function CommentsSidebar({
  comments,
  activeTag,
  expandedTag,
  onTagHover,
  onTagClick,
  evaluation,
  commentColorMap,
}: CommentsSidebarProps) {
  // Get valid and sorted comments
  const sortedComments = getValidAndSortedComments(comments);

  return (
    <div className="px-4">
      <div className="divide-y divide-gray-100">
        {sortedComments.map((comment, index) => {
          const tag = index.toString();
          const hasGradeInstructions = evaluation.agent.gradeInstructions;

          return (
            <div
              key={tag}
              className={`transition-all duration-200 ${
                expandedTag === tag ? "shadow-sm" : "hover:bg-gray-50"
              }`}
              onMouseEnter={() => onTagHover(tag)}
              onMouseLeave={() => onTagHover(null)}
              onClick={() => onTagClick(tag)}
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
                            {comment.grade && comment.grade > 70 && (
                              <CheckCircleIcon className="h-5 w-5 text-green-500 opacity-40" />
                            )}
                            {comment.grade && comment.grade < 30 && (
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
                                <span className="font-medium">
                                  <span
                                    className="rounded-full px-2 py-0.5 text-sm"
                                    style={getGradeColorWeak(comment.grade)}
                                  >
                                    {getGradePhrase(comment.grade)}
                                  </span>
                                </span>
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
  return (
    <ul className="overflow-hidden border border-gray-200 bg-white">
      {document.reviews.map((evaluation, index) => {
        const isActive = index === activeEvaluationIndex;
        const grade = evaluation.grade || 0;
        const gradeStyle = getGradeColorStrong(grade);
        const letterGrade = getLetterGrade(grade);
        const label = getGradeLabel(grade);
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
                  <div className="truncate text-sm text-gray-500">
                    {evaluation.agent.description}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className="rounded border px-2 py-0.5 text-sm font-semibold"
                      style={getGradeColorWeak(grade)}
                    >
                      {letterGrade}
                    </span>
                    <span className="text-sm text-gray-500">
                      · {highlightsCount} highlights
                    </span>
                  </div>
                </div>
                {isActive && (
                  <span className="absolute right-4 top-4 flex items-center justify-center">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-500">
                      <svg
                        className="h-4 w-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
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
  activeTab: "analysis" | "comments" | "thinking";
}

interface UIState {
  isHomeView: boolean;
  showEvaluationSelector: boolean;
  deleteError: string | null;
}

interface HomeViewProps {
  document: Document;
  isOwner?: boolean;
  onEvaluationSelect: (index: number) => void;
  activeEvaluationIndex: number | null;
}

function HomeView({
  document,
  isOwner = false,
  onEvaluationSelect,
  activeEvaluationIndex,
}: HomeViewProps) {
  const router = useRouter();

  return (
    <div className="h-full p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
        <div className="mt-2 text-sm text-gray-500">
          By {document.author} •{" "}
          {new Date(document.publishedDate).toLocaleDateString()}
          {document.url && (
            <>
              {" • "}
              <a
                href={document.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700"
              >
                View Original
              </a>
            </>
          )}
          {document.submittedById && (
            <>
              {" • "}
              <Link
                href={`/users/${document.submittedById}`}
                className="text-blue-500 hover:text-blue-700"
              >
                {document.submittedBy?.name || "View Owner"}
              </Link>
            </>
          )}
        </div>
        {isOwner && (
          <div className="mt-4 flex items-center gap-2">
            <Link href={`/docs/${document.id}/evaluations`}>
              <Button variant="secondary" className="flex items-center gap-2">
                <ListBulletIcon className="h-4 w-4" />
                Details
              </Button>
            </Link>
            <Link href={`/docs/${document.id}/edit`}>
              <Button className="flex items-center gap-2">
                <PencilIcon className="h-4 w-4" />
                Edit
              </Button>
            </Link>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  confirm(
                    "Are you sure you want to delete this document? This action cannot be undone."
                  )
                ) {
                  const result = await deleteDocument(document.id);

                  if (result.success) {
                    router.push("/docs");
                  } else {
                    // Handle error
                  }
                }
              }}
            >
              <Button
                type="submit"
                variant="danger"
                className="flex items-center gap-2"
              >
                <TrashIcon className="h-4 w-4" />
                Delete
              </Button>
            </form>
          </div>
        )}
      </div>

      <EvaluationSelector
        document={document}
        activeEvaluationIndex={activeEvaluationIndex}
        onEvaluationSelect={onEvaluationSelect}
      />
    </div>
  );
}

interface TabNavigationProps {
  activeTab: "analysis" | "comments" | "thinking";
  onTabChange: (tab: "analysis" | "comments" | "thinking") => void;
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
      <button
        className={`px-4 py-2 text-sm font-medium ${
          activeTab === "thinking"
            ? "border-b-2 border-blue-500 text-blue-600"
            : "text-gray-500 hover:text-blue-600"
        }`}
        onClick={() => onTabChange("thinking")}
      >
        Thinking
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
}

function EvaluationView({
  evaluation,
  evaluationState,
  onEvaluationStateChange,
  onBackToHome,
  onShowEvaluationSelector,
  commentColorMap,
}: EvaluationViewProps) {
  return (
    <div className="h-full">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-full items-center gap-2 px-3 py-0 text-base font-medium transition hover:bg-gray-100 focus:outline-none"
            onClick={onShowEvaluationSelector}
          >
            <span className="flex items-center rounded-md border border-orange-100 bg-orange-50 px-2 py-0.5 text-sm font-bold text-orange-800">
              {getLetterGrade(evaluation.grade || 0)}
            </span>
            <span className="ml-2 mr-1 font-semibold text-gray-900">
              {evaluation.agent.name}
            </span>
            <ChevronDownIcon className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          Back
        </button>
      </div>

      <TabNavigation
        activeTab={evaluationState.activeTab}
        onTabChange={(tab) =>
          onEvaluationStateChange({ ...evaluationState, activeTab: tab })
        }
      />

      {evaluationState.activeTab === "analysis" && evaluation.summary && (
        <div className="prose-md prose max-w-none px-8 py-0.5">
          <MarkdownRenderer>{evaluation.summary}</MarkdownRenderer>
        </div>
      )}
      {evaluationState.activeTab === "thinking" && evaluation.thinking && (
        <div className="prose-md prose max-w-none px-8 py-0.5">
          <MarkdownRenderer>{evaluation.thinking}</MarkdownRenderer>
        </div>
      )}
      {evaluationState.activeTab === "comments" && (
        <CommentsSidebar
          comments={evaluation.comments}
          activeTag={evaluationState.hoveredCommentId}
          expandedTag={evaluationState.expandedCommentId}
          onTagHover={(commentId) =>
            onEvaluationStateChange({
              ...evaluationState,
              hoveredCommentId: commentId,
            })
          }
          onTagClick={(commentId) => {
            onEvaluationStateChange({
              ...evaluationState,
              expandedCommentId:
                evaluationState.expandedCommentId === commentId
                  ? null
                  : commentId,
            });
          }}
          evaluation={evaluation}
          commentColorMap={commentColorMap}
        />
      )}
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
  const router = useRouter();
  const documentRef = useRef<HTMLDivElement>(null);

  const [evaluationState, setEvaluationState] =
    useState<EvaluationState | null>(null);
  const [uiState, setUIState] = useState<UIState>({
    isHomeView: true,
    showEvaluationSelector: false,
    deleteError: null,
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
    const hasGradeInstructions =
      activeEvaluation.agent.gradeInstructions ?? false;

    // Get all importance values for percentile calculation
    const allImportances = sortedComments
      .map((comment) => comment.importance)
      .filter((importance): importance is number => importance !== undefined);

    return sortedComments.reduce(
      (map, comment, index) => {
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
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <article className="prose prose-lg prose-slate max-w-none">
            <SlateEditor
              content={document.content}
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
                  expandedCommentId:
                    evaluationState.expandedCommentId === commentId
                      ? null
                      : commentId,
                });
              }}
              highlights={
                activeEvaluation
                  ? getValidAndSortedComments(activeEvaluation.comments).map(
                      (comment, index) => ({
                        startOffset: comment.highlight.startOffset,
                        endOffset: comment.highlight.endOffset,
                        tag: index.toString(),
                        color:
                          commentColorMap[index]?.background.substring(1) ??
                          "#000000",
                      })
                    )
                  : []
              }
              activeTag={evaluationState?.hoveredCommentId ?? null}
            />
          </article>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto border-l border-gray-200">
        {uiState.isHomeView ? (
          <HomeView
            document={document}
            isOwner={isOwner}
            onEvaluationSelect={handleEvaluationSelect}
            activeEvaluationIndex={evaluationState?.selectedReviewIndex ?? null}
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
    </div>
  );
}
