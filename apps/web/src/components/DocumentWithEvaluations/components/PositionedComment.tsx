"use client";

import { useState } from "react";

import ReactMarkdown from "react-markdown";

import { commentToYaml } from "@/shared/utils/commentToYaml";
import { parseColoredText } from "@/shared/utils/ui/coloredText";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { Comment } from "@roast/ai";

import { MARKDOWN_COMPONENTS, MARKDOWN_PLUGINS } from "../config/markdown";
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

// Helper function to display agent name with truncation
function getDisplayAgentName(agentName: string, isHovered: boolean): string {
  return isHovered ? agentName : agentName.slice(0, 5);
}

// Component for displaying agent name and source
function AgentInfo({
  agentName,
  source,
  isHovered,
}: {
  agentName: string;
  source?: string;
  isHovered: boolean;
}) {
  const textColor = isHovered ? "text-neutral-600" : "text-neutral-400";
  const separatorColor = isHovered ? "text-neutral-400" : "text-neutral-200";

  return (
    <div className="flex-shrink-0 text-xs">
      <span className={textColor}>
        {getDisplayAgentName(agentName, isHovered)}
      </span>
      {source && (
        <>
          <span className={separatorColor}> / </span>
          <span className={textColor}>{source}</span>
        </>
      )}
    </div>
  );
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

  const level = comment.level || "info"; // Default to info if not set
  // Get level indicator (icon with colored background)
  const getLevelIndicator = (level: string, isHovered: boolean) => {
    let bgColor = isHovered ? "bg-blue-500" : "bg-blue-400";
    let content: React.ReactNode;

    switch (level) {
      case "error":
        bgColor = isHovered ? "bg-red-500" : "bg-red-300";
        content = <XMarkIcon className="h-3.5 w-3.5 text-white" />;
        break;
      case "warning":
        bgColor = isHovered ? "bg-amber-500" : "bg-amber-400";
        content = (
          <span className="text-sm font-bold leading-none text-white">!</span>
        );
        break;
      case "success":
        bgColor = isHovered ? "bg-green-500" : "bg-green-300";
        content = <CheckIcon className="h-3.5 w-3.5 text-white" />;
        break;
      case "info":
      default:
        bgColor = isHovered ? "bg-blue-500" : "bg-blue-400";
        content = (
          <span className="text-sm font-bold leading-none text-white">i</span>
        );
        break;
    }

    return (
      <div
        className={`h-4 w-4 rounded-sm ${bgColor} mr-2 flex flex-shrink-0 items-center justify-center`}
      >
        {content}
      </div>
    );
  };

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
          : "opacity 0.2s ease-out, background-color 0.2s ease-out, top 0.3s ease-out",
        cursor: "pointer",
        zIndex: isHovered ? Z_INDEX_COMMENT_HOVERED : Z_INDEX_COMMENT,
        opacity: isVisible ? 1 : 0,
        visibility: isVisible ? "visible" : "hidden",
        backgroundColor: isHovered ? "white" : COMMENT_BG_DEFAULT,
        borderRadius: "4px",
        boxShadow: isHovered ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
        border: isHovered ? "1px solid #e5e7eb" : "1px solid #f0f0f0",
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
            <div
              className={`mb-0.5 flex items-center justify-between gap-2 transition-opacity ${!isHovered ? "opacity-80" : "opacity-100"}`}
            >
              <div className="flex items-center gap-1 font-medium text-gray-900">
                {getLevelIndicator(level, isHovered)}
                {parseColoredText(comment.header)}
              </div>
              {/* Agent name on the right */}
              <AgentInfo
                agentName={agentName}
                source={comment.source}
                isHovered={isHovered}
              />
            </div>
          )}

          {/* Show full description when expanded or if no header */}
          {(isHovered || !comment.header) && comment.description && (
            <div
              className={`prose prose-md max-w-none break-words ${!isHovered && !comment.header ? "line-clamp-2" : ""}`}
            >
              <ReactMarkdown
                {...MARKDOWN_PLUGINS}
                components={MARKDOWN_COMPONENTS}
              >
                {comment.description}
              </ReactMarkdown>
            </div>
          )}

          {/* Show agent name below only if there's no header (since header already shows it on the right) */}
          {!comment.header && (
            <div className="mt-0.5 inline-block py-0.5">
              <AgentInfo
                agentName={agentName}
                source={comment.source}
                isHovered={isHovered}
              />
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
                onClick={async (e) => {
                  e.stopPropagation(); // Prevent triggering comment click
                  try {
                    await navigator.clipboard.writeText(
                      commentToYaml(comment, agentName)
                    );
                  } catch (err) {
                    // Fallback for non-secure contexts
                    const text = commentToYaml(comment, agentName);
                    const ta = document.createElement("textarea");
                    ta.value = text;
                    ta.setAttribute("readonly", "");
                    ta.style.position = "absolute";
                    ta.style.left = "-9999px";
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand("copy");
                    document.body.removeChild(ta);
                    console.warn("Clipboard API failed; used fallback.", err);
                  }
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
