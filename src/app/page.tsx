"use client";

import { useState } from "react";

import { HighlightedMarkdown } from "@/components/HighlightedMarkdown";
import type { Comment } from "@/types/documentReview";
import { documentReview } from "@/types/documentReview";

interface CommentsProps {
  comments: Record<string, Comment>;
  activeTag: string | null;
  expandedTag: string | null;
  onTagHover: (tag: string | null) => void;
  onTagClick: (tag: string) => void;
}

function Comments({
  comments,
  activeTag,
  expandedTag,
  onTagHover,
  onTagClick,
}: CommentsProps) {
  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Comments</h3>
      <div className="space-y-2">
        {Object.entries(comments).map(([tag, comment]) => {
          const Icon = comment.icon;

          return (
            <div
              key={tag}
              className={`py-2 px-2 rounded-lg hover:bg-gray-100 cursor-pointer ${
                activeTag === tag ? "bg-gray-100" : ""
              }`}
              onMouseEnter={() => onTagHover(tag)}
              onMouseLeave={() => onTagHover(null)}
              onClick={() => onTagClick(tag)}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 text-gray-400" />
                <div
                  className={`font-medium ${comment.color.base} px-1 rounded`}
                >
                  {comment.title}
                </div>
              </div>
              <div
                className={`text-sm text-gray-600 transition-all duration-200 ${
                  expandedTag === tag ? "" : "line-clamp-1"
                }`}
              >
                {comment.description}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [expandedTag, setExpandedTag] = useState<string | null>(null);

  const handleCommentClick = (tag: string) => {
    setExpandedTag(expandedTag === tag ? null : tag);
  };

  const handleHighlightClick = (tag: string) => {
    setExpandedTag(expandedTag === tag ? null : tag);
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Document Area */}
      <div className="flex-2 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <article className="prose prose-slate prose-lg max-w-none">
            <HighlightedMarkdown
              content={documentReview.markdown}
              onHighlightHover={(tag) => {
                console.log("Received tag:", tag);
                setActiveTag(tag);
              }}
              onHighlightClick={handleHighlightClick}
              highlightColors={Object.fromEntries(
                Object.entries(documentReview.comments).map(
                  ([tag, comment]) => [
                    tag,
                    comment.color.base.split(" ")[0].replace("bg-", ""),
                  ]
                )
              )}
              activeTag={activeTag}
            />
          </article>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-64 border-l border-gray-200 bg-gray-50 p-4 flex-1">
        <div className="space-y-4">
          <Comments
            comments={documentReview.comments}
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
