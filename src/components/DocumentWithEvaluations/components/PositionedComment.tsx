"use client";

// @ts-ignore - ESM modules are handled by Next.js
import ReactMarkdown from "react-markdown";

import type { Comment } from "@/types/documentSchema";
import { getCommentDisplayText } from "@/utils/ui/commentPositioning";
import { MARKDOWN_PLUGINS, MARKDOWN_COMPONENTS } from "../config/markdown";
import {
  COMMENT_PADDING,
  COMMENT_MARGIN_LEFT,
  COMMENT_MARGIN_RIGHT,
  COMMENT_BG_DEFAULT,
  COMMENT_BG_HOVERED,
  COMMENT_BORDER_HOVERED,
  Z_INDEX_COMMENT,
  Z_INDEX_COMMENT_HOVERED,
} from "../constants";

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
        left: `${COMMENT_MARGIN_LEFT}px`,
        right: `${COMMENT_MARGIN_RIGHT}px`,
        padding: `${COMMENT_PADDING}px`,
        transition: skipAnimation
          ? "none"
          : "opacity 0.2s ease-out, background-color 0.2s ease-out",
        cursor: "pointer",
        zIndex: isHovered ? Z_INDEX_COMMENT_HOVERED : Z_INDEX_COMMENT,
        opacity: isVisible ? 1 : 0,
        visibility: isVisible ? "visible" : "hidden",
        backgroundColor: isHovered ? COMMENT_BG_HOVERED : COMMENT_BG_DEFAULT,
        borderRadius: "8px",
        border: isHovered ? `1px solid ${COMMENT_BORDER_HOVERED}` : "none",
        boxShadow: isHovered ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
      }}
      onClick={() => onClick(tag)}
      onMouseEnter={() => onHover(tag)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex items-start">
        {/* Comment text */}
        <div className="min-w-0 flex-1 select-text text-sm leading-relaxed text-gray-700">
          <div className="prose prose-sm max-w-none break-words">
            <ReactMarkdown
              {...MARKDOWN_PLUGINS}
              components={MARKDOWN_COMPONENTS}
            >
              {displayText}
            </ReactMarkdown>
          </div>

          {/* Agent name */}
          <div className="mt-1 text-xs text-gray-400">{agentName}</div>

          {/* Show quoted text snippet when expanded */}
          {isHovered && comment.highlight?.quotedText && (
            <div className="mt-3 border-l-4 border-blue-400 bg-gray-50 p-3 rounded-r">
              <div className="text-xs font-medium text-gray-600 mb-1">Referenced text:</div>
              <div className="font-mono text-xs bg-gray-800 text-gray-100 p-2 rounded overflow-x-auto">
                <pre className="whitespace-pre-wrap">{comment.highlight.quotedText}</pre>
              </div>
            </div>
          )}

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
