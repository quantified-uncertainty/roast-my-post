"use client";

import ReactMarkdown from "react-markdown";

import type { Comment } from "@roast/ai";
import { getCommentDisplayText } from "@/utils/ui/commentPositioning";

import {
  MARKDOWN_COMPONENTS,
  MARKDOWN_PLUGINS,
} from "../config/markdown";
import {
  COMMENT_BG_DEFAULT,
  COMMENT_BG_HOVERED,
  COMMENT_BORDER_HOVERED,
  COMMENT_MARGIN_LEFT,
  COMMENT_MARGIN_RIGHT,
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
  
  // Use header if available, otherwise fall back to description
  const displayContent = comment.header || comment.description || "";
  const { text: displayText, isTruncated } = getCommentDisplayText(
    displayContent,
    isHovered
  );
  
  // Get level styling
  const levelStyles = {
    error: { borderColor: '#ef4444', bgColor: '#fef2f2' },
    warning: { borderColor: '#f59e0b', bgColor: '#fffbeb' },
    info: { borderColor: '#3b82f6', bgColor: '#eff6ff' },
    success: { borderColor: '#10b981', bgColor: '#f0fdf4' },
  };
  
  const level = comment.level || 'info'; // Default to info if not set
  const styles = levelStyles[level as keyof typeof levelStyles] || levelStyles.info;

  return (
    <div
      style={{
        position: "absolute",
        top: `${position}px`,
        left: `${COMMENT_MARGIN_LEFT}px`,
        right: `${COMMENT_MARGIN_RIGHT}px`,
        padding: `2px 8px`,
        transition: skipAnimation
          ? "none"
          : "opacity 0.2s ease-out, background-color 0.2s ease-out",
        cursor: "pointer",
        zIndex: isHovered ? Z_INDEX_COMMENT_HOVERED : Z_INDEX_COMMENT,
        opacity: isVisible ? 1 : 0,
        visibility: isVisible ? "visible" : "hidden",
        backgroundColor: isHovered ? styles.bgColor : COMMENT_BG_DEFAULT,
        borderRadius: "8px",
        border: isHovered ? `2px solid ${styles.borderColor}` : "none",
        borderLeft: `3px solid ${styles.borderColor}`,
        boxShadow: isHovered ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
      }}
      onClick={() => onClick(tag)}
      onMouseEnter={() => onHover(tag)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex items-start">
        {/* Comment text */}
        <div className="min-w-0 flex-1 select-text text-sm leading-relaxed text-gray-700">
          {/* Show header if available */}
          {comment.header && (
            <div className="mb-1 font-medium text-gray-900">
              {comment.header}
            </div>
          )}
          
          {/* Show full description when expanded or if no header */}
          {(isHovered || !comment.header) && comment.description && (
            <div
              className={`prose prose-sm max-w-none break-words ${!isHovered && comment.header ? "line-clamp-2" : ""}`}
            >
              <ReactMarkdown
                {...MARKDOWN_PLUGINS}
                components={MARKDOWN_COMPONENTS}
              >
                {comment.description}
              </ReactMarkdown>
            </div>
          )}

          {/* Source and Agent name */}
          <div className="mt-1 text-xs text-gray-400">
            {comment.source && `[${comment.source}] `}{agentName}
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

          {/* Show quoted text snippet when expanded */}
          {isHovered && comment.highlight?.quotedText && (
            <div className="mt-3 rounded-r border-l-2 border-gray-300 bg-gray-50 p-3">
              <div className="mb-1 text-xs text-gray-500">Referenced text:</div>
              <div className="overflow-x-auto rounded bg-gray-100 p-2 font-mono text-xs text-gray-700">
                <pre className="whitespace-pre-wrap">
                  {comment.highlight.quotedText}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
