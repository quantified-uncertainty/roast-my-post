"use client";

import { useRef, useState, useMemo } from "react";
import Link from "next/link";

// @ts-ignore - ESM modules are handled by Next.js
import ReactMarkdown from "react-markdown";
// @ts-ignore - ESM modules are handled by Next.js
import rehypeRaw from "rehype-raw";
// @ts-ignore - ESM modules are handled by Next.js
import remarkGfm from "remark-gfm";

import SlateEditor from "@/components/SlateEditor";
import { CommentsColumn } from "@/components/CommentsColumn";
import { EvaluationAnalysisModal } from "@/components/EvaluationAnalysisModal";
import { GradeBadge } from "@/components/GradeBadge";
import { getValidAndSortedComments } from "@/utils/ui/commentUtils";
import type { Comment } from "@/types/documentSchema";
import { EvaluationViewProps } from "../types";

export function EvaluationView({
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
    ? document.reviews.filter((r) =>
        evaluationState.selectedAgentIds.has(r.agentId)
      )
    : [evaluation];

  // Merge comments if in multi-agent mode
  const displayComments = useMemo(() => {
    if (!evaluationState.isMultiAgentMode) {
      return evaluation.comments;
    }

    const allComments: Array<Comment & { agentName: string }> = [];
    selectedEvaluations.forEach((evaluation) => {
      evaluation.comments.forEach((comment) => {
        allComments.push({
          ...comment,
          agentName: evaluation.agent.name,
        });
      });
    });

    return getValidAndSortedComments(allComments);
  }, [
    evaluationState.isMultiAgentMode,
    selectedEvaluations,
    evaluation.comments,
  ]);

  const highlights = useMemo(
    () =>
      displayComments.map((comment: any, index: number) => ({
        startOffset: comment.highlight.startOffset,
        endOffset: comment.highlight.endOffset,
        tag: index.toString(),
        color: commentColorMap[index]?.background.substring(1) ?? "#3b82f6",
      })),
    [displayComments, commentColorMap]
  );

  // Get only selected evaluations for the analysis section
  const selectedEvaluationsForAnalysis = evaluationState.isMultiAgentMode
    ? document.reviews.filter((r) =>
        evaluationState.selectedAgentIds.has(r.agentId)
      )
    : document.reviews;

  return (
    <div className="flex h-full flex-col overflow-x-hidden">
      {/* Agent info section at top */}
      {!evaluationState.isMultiAgentMode && (
        <div className="border-b border-gray-200 bg-white px-4 py-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">
                  {evaluation.agent.name}
                </h3>
                {evaluation.agent.description && (
                  <p className="mt-0.5 text-xs text-gray-600">
                    {evaluation.agent.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowAnalysisModal(true)}
                className="ml-4 inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Analysis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified scroll container for all content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
        {/* Document content and comments section */}
        <div className="flex">
          {/* Main content area */}
          <div ref={contentRef} className="relative flex-1 p-4">
            <article className="prose prose-lg prose-slate mx-auto max-w-3xl">
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

        {/* Evaluation Analysis Section */}
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 py-8">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">
              Evaluation Analysis
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
                    <div className="mb-4 flex items-start justify-between">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {evaluation.agent.name}
                        {evaluation.grade !== undefined && (
                          <span className="ml-3">
                            <GradeBadge
                              grade={evaluation.grade}
                              variant="light"
                            />
                          </span>
                        )}
                      </h3>
                      <Link
                        href={`/docs/${document.id}/evals/${evaluation.agentId}`}
                        className="inline-flex items-center rounded-md border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
                      >
                        Details
                      </Link>
                    </div>

                    {/* Summary Section */}
                    {evaluation.summary && (
                      <div
                        className="mb-6"
                        id={`eval-${evaluation.agentId}-summary`}
                      >
                        <h4 className="mb-2 text-lg font-medium text-gray-700">
                          Summary
                        </h4>
                        <div className="prose prose-sm max-w-none text-gray-600">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                          >
                            {evaluation.summary}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {/* Analysis Section */}
                    {evaluation.analysis && (
                      <div id={`eval-${evaluation.agentId}-analysis`}>
                        <h4 className="mb-2 text-lg font-medium text-gray-700">
                          Analysis
                        </h4>
                        <div className="prose prose-sm max-w-none text-gray-600">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                          >
                            {evaluation.analysis}
                          </ReactMarkdown>
                        </div>
                      </div>
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