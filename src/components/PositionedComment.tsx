"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import type { Comment } from "@/types/documentSchema";
import { getCommentDisplayText } from "@/utils/ui/commentPositioning";

interface PositionedCommentProps {
  comment: Comment;
  index: number;
  position: number;
  isVisible: boolean;
  isSelected: boolean;
  isHovered: boolean;
  colorMap: { background: string; color: string };
  onHover: (tag: string | null) => void;
  onClick: (tag: string) => void;
}

export function PositionedComment({
  comment,
  index,
  position,
  isVisible,
  isSelected,
  isHovered,
  colorMap,
  onHover,
  onClick,
}: PositionedCommentProps) {
  const tag = index.toString();
  const { text: displayText, isTruncated } = getCommentDisplayText(
    comment.description || "",
    isHovered
  );

  return (
    <div
      style={{
        position: "absolute",
        top: `${position}px`,
        left: "20px",
        right: "20px",
        padding: "8px",
        transition: "all 0.2s ease-out",
        cursor: "pointer",
        zIndex: isHovered ? 20 : 10,
        opacity: isVisible ? 1 : 0,
        visibility: isVisible ? "visible" : "hidden",
        backgroundColor: isHovered ? "rgba(255, 255, 255, 0.95)" : "transparent",
        boxShadow: isHovered ? "0 2px 8px rgba(0, 0, 0, 0.1)" : "none",
        borderRadius: isHovered ? "6px" : "0",
        border: isHovered ? "1px solid #e5e7eb" : "1px solid transparent",
      }}
      onClick={() => onClick(tag)}
      onMouseEnter={() => onHover(tag)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex items-start gap-2">
        {/* Comment number indicator */}
        <div
          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium"
          style={{
            backgroundColor: colorMap.background,
            color: colorMap.color,
          }}
        >
          {index + 1}
        </div>
        
        {/* Comment text */}
        <div className="flex-1 min-w-0 text-sm leading-relaxed text-gray-700">
          <div className="break-words prose prose-sm max-w-none">
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
                p: ({ children }) => <span>{children}</span>,
              }}
            >
              {displayText}
            </ReactMarkdown>
          </div>
          
          {/* Additional metadata when expanded */}
          {isHovered && comment.grade !== undefined && (
            <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
              <span>Grade: {comment.grade}</span>
              {comment.importance !== undefined && (
                <span>Importance: {comment.importance}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}