"use client";

import {
  useRef,
  useState,
} from 'react';

import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import { HighlightedMarkdown } from '@/components/HighlightedMarkdown';
import { evaluationAgents } from '@/data/agents/index';
import type { Comment } from '@/types/documentReview';
import type { Document } from '@/types/documents';
import { getIcon } from '@/utils/iconMap';
import {
  ChatBubbleLeftIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';

interface CommentsSidebarProps {
  comments: Comment[];
  activeTag: string | null;
  expandedTag: string | null;
  onTagHover: (tag: string | null) => void;
  onTagClick: (tag: string | null) => void;
}

// Available colors for comments
const COMMENT_COLORS = [
  "bg-emerald-100 text-emerald-800",
  "bg-indigo-100 text-indigo-800",
  "bg-amber-100 text-amber-800",
  "bg-violet-100 text-violet-800",
  "bg-lime-100 text-lime-800",
  "bg-rose-100 text-rose-800",
  "bg-cyan-100 text-cyan-800",
  "bg-purple-100 text-purple-800",
  "bg-yellow-100 text-yellow-800",
  "bg-sky-100 text-sky-800",
  "bg-orange-100 text-orange-800",
  "bg-teal-100 text-teal-800",
  "bg-pink-100 text-pink-800",
  "bg-green-100 text-green-800",
  "bg-fuchsia-100 text-fuchsia-800",
  "bg-blue-100 text-blue-800",
  "bg-red-100 text-red-800",
];

function getCommentColorByIndex(index: number): string {
  return COMMENT_COLORS[index % COMMENT_COLORS.length];
}

function getCommentHighlightColor(index: number): string {
  const colorClass = getCommentColorByIndex(index);
  return colorClass.split(" ")[0].replace("bg-", "");
}

function sortCommentsByOffset(comments: Comment[]): Comment[] {
  return [...comments].sort((a, b) => {
    const aOffset = a.highlight?.startOffset || 0;
    const bOffset = b.highlight?.startOffset || 0;
    return aOffset - bOffset;
  });
}

function CommentsSidebar({
  comments,
  expandedTag,
  onTagHover,
  onTagClick,
}: CommentsSidebarProps) {
  const sortedComments = sortCommentsByOffset(comments);

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <h2 className="text-base font-medium text-gray-600 px-4 py-2 border-b border-gray-100">
        Highlights
      </h2>
      <div>
        {sortedComments.map((comment, index) => {
          const tag = index.toString();
          const isExpanded = expandedTag === tag;

          return (
            <div
              key={tag}
              className={`
                transition-colors duration-150 cursor-pointer 
                ${isExpanded ? "bg-white" : "hover:bg-white bg-gray-50"}
              `}
              onMouseEnter={() => onTagHover(tag)}
              onMouseLeave={() => onTagHover(null)}
              onClick={() => onTagClick(tag)}
            >
              <div className="px-4 py-3">
                {/* Comment header with number, icon and title */}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-sm font-medium select-none ${getCommentColorByIndex(
                      index
                    )}`}
                  >
                    {index + 1}
                  </div>

                  <div className="font-semibold text-gray-600 select-none">
                    {comment.title}
                  </div>
                  <div className="ml-auto select-none">
                    {isExpanded ? (
                      <ChevronDownIcon className="h-4 w-4 text-gray-300" />
                    ) : (
                      <ChevronLeftIcon className="h-4 w-4 text-gray-300" />
                    )}
                  </div>
                </div>

                {/* Comment description */}
                {comment.description && (
                  <div className="ml-8 mt-1 text-md text-gray-600">
                    <div className={isExpanded ? "" : "line-clamp-1"}>
                      {comment.description}
                    </div>
                  </div>
                )}
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
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        Document Evaluations
      </h3>
      <div className="grid grid-cols-4 md:grid-cols-4 gap-3">
        {document.reviews.map((review, index) => {
          const agent = evaluationAgents.find((a) => a.id === review.agentId);
          const Icon = agent ? getIcon(agent.iconName) : ChatBubbleLeftIcon;
          const isActive = activeReviewIndex === index;
          const commentCount = Object.keys(review.comments).length;

          return (
            <div
              key={index}
              className={`
                transition-all duration-150 rounded-lg cursor-pointer border 
                ${
                  isActive
                    ? "bg-blue-50 border-blue-300 shadow-sm"
                    : "border-gray-200 hover:border-blue-200 hover:bg-blue-50/30"
                }
              `}
              onClick={() => onReviewSelect(index)}
            >
              <div className="p-1.5 flex h-full items-center">
                <div
                  className={`
                  flex items-center justify-center p-1 rounded-full mr-2
                  ${isActive ? "bg-blue-100" : "bg-gray-100"}
                `}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      isActive ? "text-blue-600" : "text-gray-500"
                    }`}
                  />
                </div>

                <div className="flex flex-col justify-between flex-1 min-w-0">
                  {agent && (
                    <span
                      className={`
                      text-sm font-medium truncate mb-1
                      ${isActive ? "text-blue-700" : "text-gray-700"}
                    `}
                    >
                      {agent.name}
                    </span>
                  )}

                  {agent && (
                    <div className="flex items-center">
                      <span
                        className={`
                        text-xs px-1 rounded-full flex items-center gap-1
                        ${
                          isActive
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }
                      `}
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

  const activeReview =
    document.reviews[activeReviewIndex] || document.reviews[0];

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

  const sortedComments = sortCommentsByOffset(activeReview.comments);

  return (
    <div className="flex h-screen bg-white">
      <div ref={documentRef} className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">{document.title}</h1>
              <div className="text-sm text-gray-500">
                By {document.author} •{" "}
                {new Date(document.publishedDate).toLocaleDateString()}
              </div>
            </div>
          </div>

          <article className="prose prose-slate prose-lg max-w-none">
            <HighlightedMarkdown
              content={document.content}
              onHighlightHover={(tag) => setActiveTag(tag)}
              onHighlightClick={handleHighlightClick}
              highlightColors={Object.fromEntries(
                sortedComments.map((_, index) => [
                  index.toString(),
                  getCommentHighlightColor(index),
                ])
              )}
              activeTag={activeTag}
              highlights={sortedComments}
            />
          </article>
        </div>
      </div>

      <div className="w-72 border-l border-gray-200 bg-gray-50 px-4 py-2 flex-1 overflow-y-auto">
        <div className="space-y-4">
          <ReviewSelector
            document={document}
            activeReviewIndex={activeReviewIndex}
            onReviewSelect={handleReviewSelect}
          />

          {/* About section */}
          <div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500 px-2 py-1">
                  Run cost: ${(activeReview.costInCents / 100).toFixed(2)} • Run
                  Date: {activeReview.createdAt.toLocaleDateString()}
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
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Analysis section */}
          {activeReview.summary && (
            <div className="bg-white rounded-lg shadow-sm">
              <div
                className="px-4 py-1.5 flex items-center justify-between cursor-pointer select-none hover:bg-gray-50"
                onClick={() =>
                  setExpandedTag(expandedTag === "analysis" ? null : "analysis")
                }
              >
                <h3 className="text-sm font-medium text-gray-700">Analysis</h3>
                {expandedTag === "analysis" ? (
                  <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronLeftIcon className="h-4 w-4 text-gray-400" />
                )}
              </div>
              <div className="px-4 py-1.5 prose prose-md max-w-none border-t border-gray-100">
                {expandedTag === "analysis" ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                  >
                    {activeReview.summary}
                  </ReactMarkdown>
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
          />
        </div>
      </div>
    </div>
  );
}
