"use client";

import { useState } from "react";

import ReactMarkdown from "react-markdown";

import { commentToYaml } from "@/shared/utils/commentToYaml";
import { parseColoredText } from "@/shared/utils/ui/coloredText";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import type { Comment } from "@roast/ai";

import {
  MARKDOWN_COMPONENTS,
  MARKDOWN_PLUGINS,
} from "../config/markdown";
import {
  COMMENT_BG_DEFAULT,
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
  isSelected: _isSelected,
  isHovered,
  onHover,
  onClick,
  agentName,
  skipAnimation = false,
}: PositionedCommentProps) {
  const tag = index.toString();
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);

  // Note: We show header if available, otherwise description is shown inline

  // Get level styling
  const levelStyles = {
    error: { bgColor: "#fef2f2" },
    warning: { bgColor: "#fffbeb" },
    info: { bgColor: "#eff6ff" },
    success: { bgColor: "#f0fdf4" },
  };

  const level = comment.level || "info"; // Default to info if not set
  const styles =
    levelStyles[level as keyof typeof levelStyles] || levelStyles.info;

  // Get level icon
  const getLevelIcon = (level: string) => {
    const iconClass = "h-4 w-4 flex-shrink-0";
    switch (level) {
      case "error":
        return <XCircleIcon className={`${iconClass} text-red-500`} />;
      case "warning":
        return (
          <ExclamationTriangleIcon className={`${iconClass} text-amber-500`} />
        );
      case "success":
        return <CheckCircleIcon className={`${iconClass} text-green-500`} />;
      case "info":
      default:
        return (
          <InformationCircleIcon className={`${iconClass} text-blue-500`} />
        );
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        top: `${position}px`,
        left: `${COMMENT_MARGIN_LEFT}px`,
        right: `${COMMENT_MARGIN_RIGHT}px`,
        padding: `6px 12px`,
        transition: skipAnimation
          ? "none"
          : "opacity 0.2s ease-out, background-color 0.2s ease-out, top 0.3s ease-out",
        cursor: "pointer",
        zIndex: isHovered ? Z_INDEX_COMMENT_HOVERED : Z_INDEX_COMMENT,
        opacity: isVisible ? 1 : 0,
        visibility: isVisible ? "visible" : "hidden",
        backgroundColor: isHovered ? styles.bgColor : COMMENT_BG_DEFAULT,
        borderRadius: "8px",
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
            <div className="mb-0.5 flex items-center gap-2 font-medium text-gray-900">
              {getLevelIcon(level)}
              {parseColoredText(comment.header)}
            </div>
          )}

          {/* Show full description when expanded or if no header */}
          {(isHovered || !comment.header) && comment.description && (
            <div
              className={`prose prose-sm max-w-none break-words ${!isHovered && !comment.header ? "line-clamp-2" : ""}`}
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
          <div className="mt-0.5 inline-block rounded py-0.5 text-xs text-neutral-500">
            {comment.source && `[${comment.source}] `}
            {agentName}
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

          {/* Metadata viewer when expanded */}
          {isHovered && comment.metadata && (
            <div className="mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMetadataExpanded(!isMetadataExpanded);
                }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                {isMetadataExpanded ? (
                  <ChevronDownIcon className="h-3 w-3" />
                ) : (
                  <ChevronRightIcon className="h-3 w-3" />
                )}
                <span>Metadata</span>
              </button>

              {isMetadataExpanded && (
                <div className="mt-2 rounded border bg-gray-50 p-3">
                  <pre className="overflow-x-auto text-xs text-gray-600">
                    {JSON.stringify(comment.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Copy button - only visible when hovered */}
          {isHovered && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering comment click
                  navigator.clipboard.writeText(
                    commentToYaml(comment, agentName)
                  );
                }}
                className="group flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                title="Copy comment as YAML"
              >
                <DocumentDuplicateIcon className="h-3 w-3" />
                <span>Copy as YAML</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
