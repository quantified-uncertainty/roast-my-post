"use client";

import { useEffect, useState, memo, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { commentToYaml } from "@/shared/utils/commentToYaml";
import { parseColoredText } from "@/shared/utils/ui/coloredText";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentDuplicateIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { Comment } from "@roast/ai";
import { MARKDOWN_COMPONENTS, MARKDOWN_PLUGINS } from "../config/markdown";

interface CommentModalOptimizedProps {
  comments: Array<{
    comment: Comment;
    agentName: string;
    commentId: string;
  }>;
  currentCommentId: string | null;
  isOpen: boolean;
  hideNavigation?: boolean;
  onClose: () => void;
  onNavigate: (commentId: string) => void;
}

function getLevelIndicator(level: string) {
  let bgColor = "bg-blue-500";
  let content: React.ReactNode;

  switch (level) {
    case "error":
      bgColor = "bg-red-500";
      content = <XMarkIcon className="h-5 w-5 text-white" />;
      break;
    case "warning":
      bgColor = "bg-amber-500";
      content = (
        <span className="text-lg font-bold leading-none text-white">!</span>
      );
      break;
    case "success":
      bgColor = "bg-green-500";
      content = <CheckIcon className="h-5 w-5 text-white" />;
      break;
    case "info":
    default:
      bgColor = "bg-blue-500";
      content = (
        <span className="text-lg font-bold leading-none text-white">i</span>
      );
      break;
  }

  return (
    <div
      className={`h-6 w-6 rounded-md ${bgColor} flex items-center justify-center`}
    >
      {content}
    </div>
  );
}

export const CommentModalOptimized = memo(function CommentModalOptimized({
  comments,
  currentCommentId,
  isOpen,
  hideNavigation = false,
  onClose,
  onNavigate,
}: CommentModalOptimizedProps) {
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Memoize current index and data to avoid O(n) lookup on every render
  const { currentIndex, currentData } = useMemo(() => {
    const index = comments.findIndex(c => c.commentId === currentCommentId);
    return {
      currentIndex: index,
      currentData: index >= 0 ? comments[index] : null
    };
  }, [comments, currentCommentId]);
  
  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = currentIndex < comments.length - 1;
  
  // Unified navigation handlers to avoid duplication
  const navigatePrev = useCallback(() => {
    if (canNavigatePrev && currentIndex > 0) {
      onNavigate(comments[currentIndex - 1].commentId);
    }
  }, [canNavigatePrev, currentIndex, comments, onNavigate]);
  
  const navigateNext = useCallback(() => {
    if (canNavigateNext && currentIndex >= 0) {
      onNavigate(comments[currentIndex + 1].commentId);
    }
  }, [canNavigateNext, currentIndex, comments, onNavigate]);

  // Handle keyboard navigation (only in navigation mode)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          if (!hideNavigation) {
            e.preventDefault();
            navigatePrev();
          }
          break;
        case "ArrowRight":
          if (!hideNavigation) {
            e.preventDefault();
            navigateNext();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, hideNavigation, navigatePrev, navigateNext, onClose]);

  // Reset metadata expansion when comment changes
  useEffect(() => {
    setIsMetadataExpanded(false);
    setCopySuccess(false);
  }, [currentCommentId]);

  const handleCopy = useCallback(async () => {
    if (!currentData) return;
    
    try {
      await navigator.clipboard.writeText(
        commentToYaml(currentData.comment, currentData.agentName)
      );
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.warn("Clipboard API failed", err);
    }
  }, [currentData]);

  if (!currentData || !isOpen) return null;

  const { comment, agentName } = currentData;
  const level = comment.level || "info";

  return (
    <div 
      className={`fixed inset-0 z-50 ${isOpen ? 'block' : 'hidden'}`}
      style={{ transition: 'none' }}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal Content - No animations */}
      <div className="fixed inset-8 sm:inset-12 lg:inset-16 bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="relative flex h-full flex-col">
          {/* Close button */}
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="absolute right-6 top-6 z-50 rounded-lg bg-white/80 backdrop-blur hover:bg-gray-100"
            style={{ width: "40px", height: "40px" }}
            aria-label="Close modal"
            title="Close (Esc key)"
          >
            <X style={{ width: "30px", height: "30px" }} aria-hidden="true" />
          </Button>

          {/* Navigation buttons - only show in navigation mode */}
          {!hideNavigation && (
            <>
              <Button
                onClick={navigatePrev}
                disabled={!canNavigatePrev}
                variant="ghost"
                size="icon"
                className="absolute left-6 top-1/2 z-50 -translate-y-1/2 rounded-lg bg-white/80 backdrop-blur hover:bg-gray-100 disabled:opacity-50"
                style={{ width: "48px", height: "48px" }}
                aria-label="Previous comment"
                title="Previous comment (← key)"
              >
                <ChevronLeft style={{ width: "30px", height: "30px" }} aria-hidden="true" />
              </Button>

              <Button
                onClick={navigateNext}
                disabled={!canNavigateNext}
                variant="ghost"
                size="icon"
                className="absolute right-6 top-1/2 z-50 -translate-y-1/2 rounded-lg bg-white/80 backdrop-blur hover:bg-gray-100 disabled:opacity-50"
                style={{ width: "48px", height: "48px" }}
                aria-label="Next comment"
                title="Next comment (→ key)"
              >
                <ChevronRight style={{ width: "30px", height: "30px" }} aria-hidden="true" />
              </Button>
            </>
          )}

          {/* Header */}
          <div className="flex-shrink-0 border-b px-8 py-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {getLevelIndicator(level)}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {comment.header ? (
                      <div>{parseColoredText(comment.header)}</div>
                    ) : (
                      "Comment Details"
                    )}
                  </h2>
                  <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">{agentName}</span>
                    {comment.source && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span>{comment.source}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="mx-auto max-w-4xl space-y-6">
              {comment.highlight?.quotedText && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">
                    Referenced Text
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700">
                      {comment.highlight.quotedText}
                    </pre>
                  </div>
                </div>
              )}

              {comment.description && (
                <div className="prose prose-lg max-w-none">
                  <ReactMarkdown
                    {...MARKDOWN_PLUGINS}
                    components={MARKDOWN_COMPONENTS}
                  >
                    {comment.description}
                  </ReactMarkdown>
                </div>
              )}

              {(comment.grade !== undefined ||
                comment.importance !== undefined) && (
                <div className="flex items-center gap-6 rounded-lg bg-gray-50 p-4">
                  {comment.grade !== undefined && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">
                        Grade
                      </span>
                      <div className="mt-1 text-2xl font-bold text-gray-900">
                        {comment.grade}
                      </div>
                    </div>
                  )}
                  {comment.importance !== undefined && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">
                        Importance
                      </span>
                      <div className="mt-1 text-2xl font-bold text-gray-900">
                        {comment.importance}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {comment.metadata && (
                <div className="space-y-2">
                  <button
                    onClick={() => setIsMetadataExpanded(!isMetadataExpanded)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    {isMetadataExpanded ? (
                      <ChevronDownIcon className="h-4 w-4" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4" />
                    )}
                    <span>Metadata</span>
                  </button>

                  {isMetadataExpanded && (
                    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <pre className="text-xs text-gray-600">
                        {JSON.stringify(comment.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                <span>
                  Comment {currentIndex + 1} of {comments.length}
                </span>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                <DocumentDuplicateIcon className="h-4 w-4" />
                {copySuccess ? "Copied!" : "Copy as YAML"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});