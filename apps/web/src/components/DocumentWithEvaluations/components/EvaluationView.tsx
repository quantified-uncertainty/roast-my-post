"use client";

import {
  useMemo,
  useRef,
  useState,
} from "react";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import {
  CommentsColumn,
} from "@/components/DocumentWithEvaluations/components/CommentsColumn";
import { GradeBadge } from "@/components/GradeBadge";
import SlateEditor from "@/components/SlateEditor";
import type { Comment } from "@/types/documentSchema";
import { getValidAndSortedComments } from "@/utils/ui/commentUtils";

import { useScrollBehavior } from "../hooks/useScrollBehavior";
import { EvaluationViewProps } from "../types";
import { DocumentMetadata } from "./DocumentMetadata";
import { EvaluationCardsHeader } from "./EvaluationCardsHeader";
import { CommentFilters } from "./CommentFilters";
import { CommentStats } from "./CommentStats";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { EvaluationComments } from "@/components/EvaluationComments";
import { MARKDOWN_COMPONENTS } from "../config/markdown";
import { CopyButton } from "@/components/CopyButton";
import { UI_LAYOUT, ANIMATION } from "../constants/uiConstants";

export function EvaluationView({
  evaluationState,
  onEvaluationStateChange,
  document,
  contentWithMetadataPrepend,
}: EvaluationViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const evaluationsSectionRef = useRef<HTMLDivElement>(null);
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [filteredComments, setFilteredComments] = useState<Array<Comment & { agentName: string }>>([]);

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
    const comments: Array<Comment & { agentName: string }> = [];
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

  // Use filtered comments if available, otherwise use all comments
  const displayComments = filteredComments.length > 0 || allComments.length === 0 ? filteredComments : allComments;

  const highlights = useMemo(
    () =>
      displayComments.map((comment, index) => ({
        startOffset: comment.highlight.startOffset,
        endOffset: comment.highlight.endOffset,
        quotedText: comment.highlight.quotedText,
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
        className={`transition-all duration-[${ANIMATION.TRANSITION_DURATION}ms] ease-in-out ${
          headerVisible ? `max-h-[${UI_LAYOUT.HEADER_MAX_HEIGHT}px]` : "max-h-0 overflow-hidden"
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
            <div
              ref={contentRef}
              className={`relative p-0 ${isFullWidth ? "pr-4" : "max-w-3xl flex-1"}`}
              style={
                isFullWidth
                  ? { width: `calc(100% - ${UI_LAYOUT.COMMENT_COLUMN_WIDTH}px)`, overflow: "hidden" }
                  : {}
              }
            >
              {/* Document metadata section */}
              <DocumentMetadata
                document={document}
                showDetailedAnalysisLink={true}
                isFullWidth={isFullWidth}
                onToggleFullWidth={() => setIsFullWidth(!isFullWidth)}
              />

              <article
                className={`prose prose-lg prose-slate ${isFullWidth ? `max-w-none [&_pre]:!max-w-[calc(100vw-${UI_LAYOUT.COMMENT_COLUMN_WIDTH}px-${UI_LAYOUT.CONTENT_SIDE_PADDING}px)] [&_pre]:overflow-x-auto` : "mx-auto"} rounded-lg px-4 py-8`}
              >
                <SlateEditor
                  content={contentWithMetadataPrepend}
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
                  hoveredTag={evaluationState.hoveredCommentId}
                />
              </article>
            </div>
            {/* Comments column with filters and positioned comments */}
            <div style={{ width: `${UI_LAYOUT.COMMENT_COLUMN_WIDTH}px`, flexShrink: 0 }}>
              <div className="sticky top-20 z-40 mb-4 space-y-3">
                <CommentStats comments={allComments} />
                <CommentFilters 
                  comments={allComments}
                  onFilteredCommentsChange={setFilteredComments}
                />
              </div>
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
                document={document}
                evaluationState={evaluationState}
                onEvaluationStateChange={onEvaluationStateChange}
              />
            </div>
          </div>

          {/* Evaluation Analysis Section */}
          <div ref={evaluationsSectionRef}>
            <div className="mx-auto max-w-7xl px-4 py-8">
              <h2 className="mb-6 text-2xl font-bold text-gray-900">
                Full AI Evaluations
              </h2>
              <div className="flex gap-8">
                {/* Main content */}
                <div className="flex-1 space-y-8">
                  {selectedEvaluationsForAnalysis.map((evaluation) => (
                    <div
                      key={evaluation.agentId}
                      id={`eval-${evaluation.agentId}`}
                      className="rounded-lg bg-white p-6 shadow"
                    >
                      <div className="mb-4 flex items-start justify-between border-b border-gray-200 pb-4">
                        <div className="flex items-center gap-2">
                          {evaluation.grade !== undefined && (
                            <span className="ml-3">
                              <GradeBadge
                                grade={evaluation.grade}
                                variant="light"
                              />
                            </span>
                          )}
                          <Link
                            href={`/agents/${evaluation.agentId}`}
                            className="text-gray-700 hover:underline"
                          >
                            {evaluation.agent.name}
                          </Link>
                        </div>
                        <Link
                          href={`/docs/${document.id}/evals/${evaluation.agentId}`}
                          className="inline-flex items-center rounded-md border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
                        >
                          Details
                        </Link>
                      </div>

                      {/* Summary Section */}
                      {evaluation.summary && (
                        <CollapsibleSection
                          id={`eval-${evaluation.agentId}-summary`}
                          title="Summary"
                          defaultOpen={true}
                          action={<CopyButton text={evaluation.summary} />}
                        >
                          <div className="prose prose-sm max-w-none text-gray-600">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeRaw]}
                              components={MARKDOWN_COMPONENTS}
                            >
                              {evaluation.summary}
                            </ReactMarkdown>
                          </div>
                        </CollapsibleSection>
                      )}

                      {/* Analysis Section */}
                      {evaluation.analysis && (
                        <CollapsibleSection
                          id={`eval-${evaluation.agentId}-analysis`}
                          title="Analysis"
                          defaultOpen={true}
                          action={<CopyButton text={evaluation.analysis} />}
                        >
                          <div className="prose prose-sm max-w-none text-gray-600">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeRaw]}
                              components={MARKDOWN_COMPONENTS}
                            >
                              {evaluation.analysis}
                            </ReactMarkdown>
                          </div>
                        </CollapsibleSection>
                      )}

                      {/* Comments Section */}
                      {evaluation.comments && evaluation.comments.length > 0 && (
                        <CollapsibleSection
                          id={`eval-${evaluation.agentId}-comments`}
                          title={`Comments (${evaluation.comments.length})`}
                          defaultOpen={false}
                        >
                          <EvaluationComments 
                            comments={evaluation.comments.map((comment, index) => ({
                              id: `${evaluation.agentId}-comment-${index}`,
                              description: comment.description,
                              importance: comment.importance ?? null,
                              grade: comment.grade ?? null,
                              evaluationVersionId: evaluation.id || '',
                              highlightId: `${evaluation.agentId}-highlight-${index}`,
                              highlight: {
                                id: `${evaluation.agentId}-highlight-${index}`,
                                startOffset: comment.highlight.startOffset,
                                endOffset: comment.highlight.endOffset,
                                quotedText: comment.highlight.quotedText,
                                isValid: comment.highlight.isValid,
                                prefix: comment.highlight.prefix ?? null,
                                error: comment.error ?? null,
                              }
                            }))} 
                          />
                        </CollapsibleSection>
                      )}
                    </div>
                  ))}
                </div>

                {/* Table of Contents */}
                <div className="w-64 flex-shrink-0">
                  <div className="sticky top-20">
                    <nav className="space-y-1">
                      <h3 className="mb-3 font-semibold text-gray-900">
                        On this page
                      </h3>
                      <ul className="space-y-3">
                        {selectedEvaluationsForAnalysis.map((evaluation) => (
                          <li key={evaluation.agentId}>
                            <a
                              href={`#eval-${evaluation.agentId}`}
                              className="text-sm font-medium text-gray-700 hover:text-gray-900"
                            >
                              {evaluation.agent.name}
                            </a>
                            <ul className="ml-4 mt-2 space-y-1">
                              {evaluation.summary && (
                                <li>
                                  <a
                                    href={`#eval-${evaluation.agentId}-summary`}
                                    className="text-sm text-gray-600 hover:text-gray-900"
                                  >
                                    Summary
                                  </a>
                                </li>
                              )}
                              {evaluation.analysis && (
                                <li>
                                  <a
                                    href={`#eval-${evaluation.agentId}-analysis`}
                                    className="text-sm text-gray-600 hover:text-gray-900"
                                  >
                                    Analysis
                                  </a>
                                </li>
                              )}
                              {evaluation.comments && evaluation.comments.length > 0 && (
                                <li>
                                  <a
                                    href={`#eval-${evaluation.agentId}-comments`}
                                    className="text-sm text-gray-600 hover:text-gray-900"
                                  >
                                    Comments ({evaluation.comments.length})
                                  </a>
                                </li>
                              )}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
