"use client";

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
  onHover: (tag: string | null) => void;
  onClick: (tag: string) => void;
  agentName: string;
  skipAnimation?: boolean;
}

export function PositionedComment({
  comment,
  index,
  position,
  isVisible,
  isSelected,
  isHovered,
  onHover,
  onClick,
  agentName,
  skipAnimation = false,
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
        transition: skipAnimation
          ? "none"
          : "opacity 0.2s ease-out, background-color 0.2s ease-out",
        cursor: "pointer",
        zIndex: isHovered ? 20 : 10,
        opacity: isVisible ? 1 : 0,
        visibility: isVisible ? "visible" : "hidden",
        backgroundColor: "white",
        boxShadow: isHovered
          ? "0 2px 8px rgba(0, 0, 0, 0.1)"
          : "0 1px 2px rgba(0, 0, 0, 0.05)",
        borderRadius: "6px",
        border: isHovered ? "1px solid #e5e7eb" : "1px solid #f3f4f6",
      }}
      onClick={() => onClick(tag)}
      onMouseEnter={() => onHover(tag)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex items-start gap-2">
        {/* Comment number indicator */}
        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium">
          {index + 1}
        </div>

        {/* Comment text */}
        <div className="min-w-0 flex-1 text-sm leading-relaxed text-gray-700">
          <div className="prose prose-sm max-w-none break-words">
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
                p: ({ children }) => (
                  <div className="mb-1 last:mb-0">{children}</div>
                ),
              }}
            >
              {displayText}
            </ReactMarkdown>
          </div>

          {/* Agent name */}
          <div className="mt-1 text-xs text-gray-500">{agentName}</div>

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
