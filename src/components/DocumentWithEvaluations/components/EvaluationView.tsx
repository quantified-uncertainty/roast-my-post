"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";
// @ts-ignore - ESM modules are handled by Next.js
import ReactMarkdown from "react-markdown";
// @ts-ignore - ESM modules are handled by Next.js
import rehypeRaw from "rehype-raw";
// @ts-ignore - ESM modules are handled by Next.js
import remarkGfm from "remark-gfm";

import { CommentsColumn } from "@/components/DocumentWithEvaluations/components/CommentsColumn";
import { GradeBadge } from "@/components/GradeBadge";
import SlateEditor from "@/components/SlateEditor";
import type { Comment } from "@/types/documentSchema";
import { getValidAndSortedComments } from "@/utils/ui/commentUtils";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/20/solid";

import { EvaluationViewProps } from "../types";
import { EvaluationCardsHeader } from "./EvaluationCardsHeader";

export function EvaluationView({
  evaluationState,
  onEvaluationStateChange,
  document,
  contentWithMetadataPrepend,
}: EvaluationViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isLargeMode, setIsLargeMode] = useState(true);
  const [headerVisible, setHeaderVisible] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const evaluationsSectionRef = useRef<HTMLDivElement>(null);

  // Get selected evaluations
  const selectedEvaluations = document.reviews.filter((r) =>
    evaluationState.selectedAgentIds.has(r.agentId)
  );

  // Add scroll detection
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    let lastScrollTop = 0;
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop;

      // Clear any existing timeout
      clearTimeout(scrollTimeout);

      // Check if evaluations section is in view
      if (evaluationsSectionRef.current) {
        const evalSection = evaluationsSectionRef.current;
        const evalSectionTop = evalSection.offsetTop;
        const scrollBottom = scrollTop + scrollContainer.clientHeight;

        // Hide header when evaluations section comes into view
        if (scrollTop >= evalSectionTop - 100) {
          setHeaderVisible(false);
        } else {
          setHeaderVisible(true);
        }
      }

      // If at the very top, show large mode with a slight delay
      if (scrollTop <= 10) {
        scrollTimeout = setTimeout(() => {
          setIsLargeMode(true);
        }, 200);
      }
      // If scrolling down from near the top, hide large mode
      else if (scrollTop > lastScrollTop && scrollTop > 50 && isLargeMode) {
        setIsLargeMode(false);
      }

      lastScrollTop = scrollTop;
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [isLargeMode]);

  // Merge comments from all selected evaluations
  const displayComments = useMemo(() => {
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
  }, [selectedEvaluations]);

  const highlights = useMemo(
    () =>
      displayComments.map((comment: any, index: number) => ({
        startOffset: comment.highlight.startOffset,
        endOffset: comment.highlight.endOffset,
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
          headerVisible ? "max-h-[1000px]" : "max-h-0 overflow-hidden"
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
          <div className="flex min-h-screen justify-center py-5">
            {/* Main content area */}
            <div ref={contentRef} className="relative max-w-3xl flex-1 p-0">
              {/* Document metadata section */}
              <div className="flex items-center justify-between px-6">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {document.submittedBy && (
                    <span>
                      Uploaded from{" "}
                      <Link
                        href={`/users/${document.submittedBy.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {document.submittedBy.name ||
                          document.submittedBy.email ||
                          "Unknown"}
                      </Link>{" "}
                      on {new Date(document.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/docs/${document.id}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300"
                  >
                    Detailed Analysis
                  </Link>
                  {(document.importUrl || document.url) && (
                    <Link
                      href={document.importUrl || document.url}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300"
                    >
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                      Source
                    </Link>
                  )}
                </div>
              </div>

              <article className="prose prose-lg prose-slate mx-auto rounded-lg p-8">
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
                />
              </article>
            </div>
            {/* Comments column with positioned comments */}
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
                            href={`http://localhost:3001/agents/${evaluation.agentId}`}
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
      </div>
    </>
  );
}
