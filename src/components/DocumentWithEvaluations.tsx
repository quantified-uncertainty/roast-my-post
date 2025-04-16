"use client";

import { useMemo, useRef, useState } from "react";

// @ts-ignore - ESM modules are handled by Next.js
import ReactMarkdown from "react-markdown";
// @ts-ignore - ESM modules are handled by Next.js
import rehypeRaw from "rehype-raw";
// @ts-ignore - ESM modules are handled by Next.js
import remarkGfm from "remark-gfm";

import { evaluationAgents } from "@/data/agents/index";
import type { Comment, DocumentReview } from "@/types/documentReview";
import type { Document } from "@/types/documents";
import {
  getCommentColorByEvaluation,
  getEvaluationColor,
  getValidAndSortedComments,
} from "@/utils/commentUtils";
import { getIcon } from "@/utils/iconMap";
import {
  ChatBubbleLeftIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";
import {
  CheckCircleIcon,
  StarIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";

import SlateEditor from "./SlateEditor";

function getReviewsWithGrades(reviews: DocumentReview[]) {
  return reviews.filter((review) => {
    const agent = evaluationAgents.find((a) => a.id === review.agentId);
    return agent?.gradeInstructions && review.grade !== undefined;
  });
}

interface CommentsSidebarProps {
  comments: Comment[];
  activeTag: string | null;
  expandedTag: string | null;
  onTagHover: (tag: string | null) => void;
  onTagClick: (tag: string | null) => void;
  review: DocumentReview;
  commentColorMap: Record<number, { background: string; color: string }>;
}

function CommentsSidebar({
  comments,
  expandedTag,
  onTagHover,
  onTagClick,
  review,
  commentColorMap,
}: CommentsSidebarProps & { review: DocumentReview }) {
  // Get valid and sorted comments
  const sortedComments = getValidAndSortedComments(comments);

  return (
    <div className="rounded-lg bg-white shadow-sm">
      <h2 className="border-b border-gray-100 px-4 py-2 text-base font-medium text-gray-600">
        Highlights
      </h2>
      <div className="divide-y divide-gray-100">
        {sortedComments.map((comment, index) => {
          const tag = index.toString();
          const isExpanded = expandedTag === tag;
          const hasGradeInstructions = evaluationAgents.find(
            (a) => a.id === review.agentId
          )?.gradeInstructions;

          return (
            <div
              key={tag}
              className="cursor-pointer hover:bg-gray-50"
              onMouseEnter={() => onTagHover(tag)}
              onMouseLeave={() => onTagHover(null)}
              onClick={() => onTagClick(tag)}
            >
              <div className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium select-none"
                    style={{
                      backgroundColor: commentColorMap[index].background,
                      color: commentColorMap[index].color,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-medium text-gray-900">
                        {comment.title}
                      </h3>
                      <div className="flex shrink-0 items-center gap-2">
                        {hasGradeInstructions && (
                          <>
                            {comment.evaluation && comment.evaluation > 70 && (
                              <CheckCircleIcon className="h-5 w-5 text-green-500 opacity-40" />
                            )}
                            {comment.evaluation && comment.evaluation < 30 && (
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
                          className={`h-4 w-4 text-gray-300 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                        />
                      </div>
                    </div>
                    {comment.description && (
                      <div
                        className={`mt-1 text-gray-600 ${isExpanded ? "" : "line-clamp-1"}`}
                      >
                        {comment.description}
                        {isExpanded && hasGradeInstructions && (
                          <div className="mt-2 text-xs text-gray-400">
                            {comment.evaluation !== undefined && (
                              <span className="mr-4">
                                Evaluation:{" "}
                                <span className="font-medium">
                                  <span
                                    style={getEvaluationColor(
                                      comment.evaluation
                                    )}
                                  >
                                    {comment.evaluation}
                                  </span>
                                  <span className="text-gray-400">/100</span>
                                </span>
                              </span>
                            )}
                            {comment.importance !== undefined && (
                              <span>
                                Importance: <span>{comment.importance}</span>
                                <span className="text-gray-400">/100</span>
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

interface ReviewSelectorProps {
  document: Document;
  activeReviewIndex: number;
  onReviewSelect: (index: number) => void;
}

function ReviewSelector({
  document,
  activeReviewIndex,
  onReviewSelect,
}: ReviewSelectorProps) {
  return (
    <div className="mb-6">
      <h3 className="mb-3 text-sm font-medium text-gray-700">
        Document Evaluations
      </h3>
      <div className="grid grid-cols-4 gap-3 md:grid-cols-4">
        {document.reviews.map((review, index) => {
          const agent = evaluationAgents.find((a) => a.id === review.agentId);
          const Icon = agent ? getIcon(agent.iconName) : ChatBubbleLeftIcon;
          const isActive = activeReviewIndex === index;
          const commentCount = Object.keys(review.comments).length;
          const hasGradeInstructions = agent?.gradeInstructions;
          const grade = review.grade;

          return (
            <div
              key={index}
              className={`cursor-pointer rounded-lg border transition-all duration-150 ${
                isActive
                  ? "border-blue-300 bg-blue-50 shadow-sm"
                  : "border-gray-200 hover:border-blue-200 hover:bg-blue-50/30"
              } `}
              onClick={() => onReviewSelect(index)}
            >
              <div className="flex h-full items-center p-1.5">
                <div
                  className={`mr-2 flex items-center justify-center rounded-full p-1 ${isActive ? "bg-blue-100" : "bg-gray-100"} `}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      isActive ? "text-blue-600" : "text-gray-500"
                    }`}
                  />
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  {agent && (
                    <span
                      className={`mb-1 truncate text-sm font-medium ${isActive ? "text-blue-700" : "text-gray-700"} `}
                    >
                      {agent.name}
                    </span>
                  )}

                  {agent && (
                    <div className="flex items-center">
                      <span
                        className={`flex items-center gap-1 rounded-full px-1 text-xs ${
                          isActive
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        } `}
                      >
                        <ChatBubbleLeftIcon className="h-3 w-3" />
                        {commentCount}
                      </span>
                      {hasGradeInstructions && grade !== undefined && (
                        <span className="ml-2 text-xs font-medium">
                          {grade}/100
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DocumentWithReviewsProps {
  document: Document;
}

export function DocumentWithEvaluations({
  document,
}: DocumentWithReviewsProps) {
  const [activeReviewIndex, setActiveReviewIndex] = useState<number>(0);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [expandedTag, setExpandedTag] = useState<string | null>(null);
  const documentRef = useRef<HTMLDivElement>(null);

  // Handle case when there are no reviews
  const hasReviews = document.reviews && document.reviews.length > 0;
  const activeReview = hasReviews ? document.reviews[activeReviewIndex] : null;

  // Create a stable color map for all comments
  const commentColorMap = useMemo(() => {
    if (!activeReview) return {};
    const sortedComments = getValidAndSortedComments(activeReview.comments);
    const hasGradeInstructions = evaluationAgents.find(
      (a) => a.id === activeReview.agentId
    )?.gradeInstructions;
    return sortedComments.reduce(
      (map, comment, index) => {
        if (hasGradeInstructions && comment.evaluation !== undefined) {
          map[index] = getCommentColorByEvaluation(
            comment.evaluation,
            comment.importance,
            true
          );
        } else {
          map[index] = getCommentColorByEvaluation(undefined, undefined, false);
        }
        return map;
      },
      {} as Record<number, { background: string; color: string }>
    );
  }, [activeReview]);

  const scrollToHighlight = (tag: string) => {
    const element = window.document.getElementById(`highlight-${tag}`);
    if (element && documentRef.current) {
      const containerRect = documentRef.current.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const scrollTop =
        elementRect.top -
        containerRect.top +
        documentRef.current.scrollTop -
        100;

      documentRef.current.scrollTo({
        top: scrollTop,
        behavior: "smooth",
      });
    }
  };

  const handleCommentClick = (tag: string | null) => {
    setExpandedTag(expandedTag === tag ? null : tag);
    if (tag) scrollToHighlight(tag);
  };

  const handleHighlightClick = (tag: string) => {
    setExpandedTag(expandedTag === tag ? null : tag);
  };

  const handleReviewSelect = (index: number) => {
    setActiveReviewIndex(index);
    setActiveTag(null);
    setExpandedTag(null);
    // Remove auto-scrolling behavior when switching reviews
    // This allows the user to maintain their scroll position
  };

  return (
    <div className="flex h-screen bg-white">
      <div ref={documentRef} className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">{document.title}</h1>
              <div className="text-sm text-gray-500">
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
              </div>
            </div>
          </div>

          <article className="prose prose-slate prose-lg max-w-none">
            <SlateEditor
              content={document.content}
              onHighlightHover={(tag) => setActiveTag(tag)}
              onHighlightClick={handleHighlightClick}
              highlights={
                activeReview
                  ? getValidAndSortedComments(activeReview.comments).map(
                      (comment, index) => ({
                        startOffset: comment.highlight.startOffset,
                        endOffset: comment.highlight.endOffset,
                        tag: index.toString(),
                        color: commentColorMap[index].background.substring(1),
                      })
                    )
                  : []
              }
              activeTag={activeTag}
            />
          </article>
        </div>
      </div>

      <div className="w-72 flex-1 overflow-y-auto border-l border-gray-200 bg-gray-50 px-4 py-2">
        <div className="space-y-4">
          {hasReviews && (
            <ReviewSelector
              document={document}
              activeReviewIndex={activeReviewIndex}
              onReviewSelect={handleReviewSelect}
            />
          )}

          {activeReview && (
            <>
              {/* About section */}
              <div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="px-2 py-1 text-xs text-gray-500">
                      Run cost: ${(activeReview.costInCents / 100).toFixed(2)} •
                      Run Date: {activeReview.createdAt.toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center p-1">
                        {activeReview.agentId &&
                          (() => {
                            const agent = evaluationAgents.find(
                              (a) => a.id === activeReview.agentId
                            );
                            const Icon = agent ? getIcon(agent.iconName) : null;
                            return Icon ? (
                              <Icon className="h-4 w-4 text-gray-500" />
                            ) : null;
                          })()}
                      </div>
                      <a
                        href={`/agents/${activeReview.agentId}`}
                        className="text-xs text-blue-500"
                      >
                        {activeReview.agentId
                          ? evaluationAgents.find(
                              (a) => a.id === activeReview.agentId
                            )?.name || "Unknown Agent"
                          : "Unknown Agent"}
                        {activeReview.agentId && (
                          <span className="ml-1 text-gray-500">
                            •{" "}
                            {evaluationAgents.find(
                              (a) => a.id === activeReview.agentId
                            )?.purpose || "Unknown Purpose"}
                          </span>
                        )}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analysis section */}
              {activeReview.summary && (
                <div className="rounded-lg bg-white shadow-sm">
                  <div
                    className="flex cursor-pointer items-center justify-between px-4 py-1.5 select-none hover:bg-gray-50"
                    onClick={() =>
                      setExpandedTag(
                        expandedTag === "analysis" ? null : "analysis"
                      )
                    }
                  >
                    <h3 className="text-sm font-medium text-gray-700">
                      Analysis
                      {activeReview.grade &&
                        evaluationAgents.find(
                          (a) => a.id === activeReview.agentId
                        )?.gradeInstructions && (
                          <span className="text-md ml-2 font-bold text-gray-900">
                            Grade: {activeReview.grade}/100
                          </span>
                        )}
                    </h3>
                    {expandedTag === "analysis" ? (
                      <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronLeftIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <div className="prose prose-md max-w-none border-t border-gray-100 px-4 py-1.5">
                    {expandedTag === "analysis" ? (
                      <>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                        >
                          {activeReview.summary}
                        </ReactMarkdown>
                        {activeReview.thinking && (
                          <div className="mt-4 text-sm text-gray-400">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeRaw]}
                            >
                              {activeReview.thinking}
                            </ReactMarkdown>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="line-clamp-3">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                        >
                          {activeReview.summary}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <CommentsSidebar
                comments={activeReview.comments}
                activeTag={activeTag}
                expandedTag={expandedTag}
                onTagHover={setActiveTag}
                onTagClick={handleCommentClick}
                review={activeReview}
                commentColorMap={commentColorMap}
              />

              {activeReview.grade !== undefined && (
                <div className="mt-2 text-sm text-gray-500">
                  <div className="mb-2">
                    <div className="font-medium">
                      Grade: {activeReview.grade}/100
                    </div>
                    {activeReview.grade >= 90 &&
                      "Exceptional, groundbreaking work"}
                    {activeReview.grade >= 80 &&
                      activeReview.grade < 90 &&
                      "Very strong, significant contribution"}
                    {activeReview.grade >= 70 &&
                      activeReview.grade < 80 &&
                      "Good, solid work"}
                    {activeReview.grade >= 60 &&
                      activeReview.grade < 70 &&
                      "Decent, some value"}
                    {activeReview.grade >= 50 &&
                      activeReview.grade < 60 &&
                      "Mediocre, limited value"}
                    {activeReview.grade >= 40 &&
                      activeReview.grade < 50 &&
                      "Poor, significant issues"}
                    {activeReview.grade >= 30 &&
                      activeReview.grade < 40 &&
                      "Very poor, major problems"}
                    {activeReview.grade < 30 && "Unacceptable quality"}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Document Reviews</h2>
            {getReviewsWithGrades(document.reviews).length > 0 && (
              <div className="flex space-x-2">
                {getReviewsWithGrades(document.reviews).map((review) => {
                  const agent = evaluationAgents.find(
                    (a) => a.id === review.agentId
                  );
                  if (!agent) return null;
                  return (
                    <div
                      key={review.agentId}
                      className="flex items-center space-x-1"
                    >
                      <span className="text-sm font-medium">{agent.name}:</span>
                      {review.grade !== undefined && (
                        <span className="text-sm font-medium">
                          {review.grade}
                          /100
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
