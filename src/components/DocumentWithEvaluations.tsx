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
  getCommentColorByGrade,
  getGradeColor,
  getLetterGrade,
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
                          className={`h-4 w-4 text-gray-300 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                        />
                      </div>
                    </div>
                    {comment.description && (
                      <div
                        className={`mt-1 text-gray-600 ${isExpanded ? "" : "line-clamp-1"}`}
                      >
                        {comment.description}
                        {isExpanded && (
                          <div className="mt-2 text-xs text-gray-400">
                            {comment.grade !== undefined && (
                              <span className="mr-4">
                                Grade:{" "}
                                <span className="font-medium">
                                  <span style={getGradeColor(comment.grade)}>
                                    {comment.grade}
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
                  className={`mr-3 flex items-center justify-center rounded-full p-1 ${isActive ? "bg-blue-100" : "bg-gray-100"} `}
                >
                  <Icon
                    className={`h-5 w-5 ${
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
                    <div className="flex items-center gap-3">
                      {hasGradeInstructions && grade !== undefined && (
                        <span
                          className="rounded-sm px-1.5 text-xs font-medium"
                          style={getGradeColor(grade)}
                        >
                          {getLetterGrade(grade)}
                        </span>
                      )}
                      <span
                        className={`flex items-center gap-1 rounded-full px-1 text-xs ${
                          isActive ? "text-blue-700" : "text-gray-600"
                        } `}
                      >
                        <ChatBubbleLeftIcon className="h-3 w-3" />
                        {commentCount}
                      </span>
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
            allImportances
          );
        } else {
          map[index] = getCommentColorByGrade(undefined, undefined, false);
        }
        return map;
      },
      {} as Record<number, { background: string; color: string }>
    );
  }, [activeReview, evaluationAgents]);

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
                    <div className="flex items-center">
                      <h3 className="text-sm font-medium text-gray-700">
                        Analysis
                      </h3>
                      {activeReview.grade &&
                        evaluationAgents.find(
                          (a) => a.id === activeReview.agentId
                        )?.gradeInstructions && (
                          <div className="ml-4 flex items-center gap-1 text-sm">
                            <span className="text-gray-500">Grade:</span>
                            <span
                              className="rounded-sm px-2 text-sm"
                              style={getGradeColor(activeReview.grade)}
                            >
                              {getLetterGrade(activeReview.grade)}
                            </span>
                          </div>
                        )}
                    </div>
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
                          <div className="mt-4 border-t border-gray-100 pt-4 text-sm">
                            <h4 className="mb-2 font-semibold text-gray-700">
                              Thinking:
                            </h4>
                            <div className="text-gray-400">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw]}
                              >
                                {activeReview.thinking}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}
                        {activeReview.runDetails && (
                          <div className="mt-4 border-t border-gray-100 pt-4 text-sm">
                            <h4 className="mb-2 font-semibold text-gray-700">
                              Run Details:
                            </h4>
                            <pre className="mt-2 overflow-x-auto rounded-md bg-gray-50 p-3 font-mono text-xs text-gray-600">
                              {typeof activeReview.runDetails === "string"
                                ? activeReview.runDetails
                                : JSON.stringify(
                                    activeReview.runDetails,
                                    null,
                                    2
                                  )}
                            </pre>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
