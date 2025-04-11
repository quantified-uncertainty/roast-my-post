"use client";

import {
  useRef,
  useState,
} from 'react';

import { HighlightedMarkdown } from '@/components/HighlightedMarkdown';
import { evaluationAgents } from '@/data/agents';
import type { Comment } from '@/types/documentReview';
import type { Document } from '@/types/documents';
import { getIcon } from '@/utils/iconMap';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';

interface CommentsSidebarProps {
  comments: Record<string, Comment>;
  activeTag: string | null;
  expandedTag: string | null;
  onTagHover: (tag: string | null) => void;
  onTagClick: (tag: string | null) => void;
}

function sortCommentsByOffset(comments: Record<string, Comment>) {
  return Object.entries(comments).sort(([_, a], [__, b]) => {
    const aOffset = a.highlight?.startOffset || 0;
    const bOffset = b.highlight?.startOffset || 0;
    return aOffset - bOffset;
  });
}
function CommentsSidebar({
  comments,
  activeTag,
  expandedTag,
  onTagHover,
  onTagClick,
}: CommentsSidebarProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm">
      <h2 className="text-base font-medium text-gray-700 p-4 border-b border-gray-100">
        Comments
      </h2>
      <div>
        {sortCommentsByOffset(comments).map(([tag, comment], index) => {
          const Icon = comment.icon;
          const isActive = activeTag === tag;
          const isExpanded = expandedTag === tag;

          return (
            <div
              key={tag}
              className={`
                transition-colors duration-150 cursor-pointer 
                ${isExpanded ? "bg-gray-200" : "hover:bg-gray-50"}
              `}
              onMouseEnter={() => onTagHover(tag)}
              onMouseLeave={() => onTagHover(null)}
              onClick={() => onTagClick(tag)}
            >
              <div className="px-4 py-3">
                {/* Comment header with number, icon and title */}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-sm font-medium ${comment.color.base}`}
                  >
                    {index + 1}
                  </div>

                  <Icon className="h-4 w-4 text-gray-500" />

                  <div className="font-medium text-gray-700">
                    {comment.title}
                  </div>
                </div>

                {/* Comment description */}
                {comment.description && (
                  <div className="ml-9 mt-1 text-sm text-gray-600">
                    <div className={isExpanded ? "" : "line-clamp-1"}>
                      {comment.description}
                    </div>
                  </div>
                )}

                {/* Show more/less toggle */}
                {comment.description && comment.description.length > 30 && (
                  <div className="ml-9 mt-1">
                    <button
                      className="text-xs text-gray-400 hover:text-gray-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTagClick(isExpanded ? null : tag);
                      }}
                    >
                      {isExpanded ? "Show less" : "Show more"}
                    </button>
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
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {document.reviews.map((review, index) => {
          const agent = evaluationAgents.find((a) => a.id === review.agentId);
          const Icon = agent ? getIcon(agent.iconName) : ChatBubbleLeftIcon;

          return (
            <div
              key={index}
              className={`p-2 rounded-lg cursor-pointer ${
                activeReviewIndex === index
                  ? "bg-blue-100"
                  : "hover:bg-gray-100"
              }`}
              onClick={() => onReviewSelect(index)}
            >
              <div className="flex h-full">
                <div className="flex items-center justify-center pr-2">
                  <Icon className="h-5 w-5 text-gray-500" />
                </div>
                <div className="flex flex-col justify-between">
                  {agent && (
                    <span className="text-sm font-medium truncate">
                      {agent.name}
                    </span>
                  )}
                  {agent && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <ChatBubbleLeftIcon className="h-3 w-3" />
                        {Object.keys(review.comments).length}
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

  // Get the active review
  const activeReview =
    document.reviews[activeReviewIndex] || document.reviews[0];

  const scrollToHighlight = (tag: string) => {
    const element = window.document.getElementById(`highlight-${tag}`);
    if (element && documentRef.current) {
      // Calculate the position relative to the document container
      const containerRect = documentRef.current.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const scrollTop =
        elementRect.top -
        containerRect.top +
        documentRef.current.scrollTop -
        100; // 100px offset from top

      // Smooth scroll to the element
      documentRef.current.scrollTo({
        top: scrollTop,
        behavior: "smooth",
      });
    }
  };

  const handleCommentClick = (tag: string | null) => {
    setExpandedTag(expandedTag === tag ? null : tag);
    if (tag) {
      scrollToHighlight(tag);
    }
  };

  const handleHighlightClick = (tag: string) => {
    setExpandedTag(expandedTag === tag ? null : tag);
  };

  const handleReviewSelect = (index: number) => {
    setActiveReviewIndex(index);
    setActiveTag(null);
    setExpandedTag(null);
    // Reset scroll position
    if (documentRef.current) {
      documentRef.current.scrollTo({
        top: 0,
        behavior: "auto",
      });
    }
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Document Area */}
      <div ref={documentRef} className="flex-2 p-8 overflow-y-auto">
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
              onHighlightHover={(tag) => {
                setActiveTag(tag);
              }}
              onHighlightClick={handleHighlightClick}
              highlightColors={Object.fromEntries(
                Object.entries(activeReview.comments).map(([tag, comment]) => [
                  tag,
                  comment.color.base.split(" ")[0].replace("bg-", ""),
                ])
              )}
              activeTag={activeTag}
              highlights={Object.fromEntries(
                Object.entries(activeReview.comments)
                  .filter(
                    ([_, comment]) =>
                      "highlight" in comment && comment.highlight
                  )
                  .map(([tag, comment]) => [tag, comment.highlight])
              )}
            />
          </article>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-72 border-l border-gray-200 bg-gray-50 p-4 flex-1 overflow-y-auto">
        <div className="space-y-6">
          {/* Review Selector */}
          <ReviewSelector
            document={document}
            activeReviewIndex={activeReviewIndex}
            onReviewSelect={handleReviewSelect}
          />

          {/* Comments for the active review */}
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
