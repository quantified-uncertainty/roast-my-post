"use client";

import { useState } from "react";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface CommentModalProps {
  comment: Comment | null;
  agentName: string;
  currentCommentId?: string;
  totalComments?: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (direction: "prev" | "next") => void;
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

export function CommentModal({
  comment,
  agentName,
  currentCommentId,
  totalComments = 0,
  isOpen,
  onClose,
  onNavigate,
}: CommentModalProps) {
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  if (!comment) return null;

  const level = comment.level || "info";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(commentToYaml(comment, agentName));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
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
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      console.warn("Clipboard API failed; used fallback.", err);
    }
  };

  const currentIndex = currentCommentId ? parseInt(currentCommentId) : 0;
  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = currentIndex < totalComments - 1;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!fixed !inset-8 !left-8 !top-8 !h-[calc(100vh-4rem)] !w-[calc(100vw-4rem)] !max-w-[calc(100vw-4rem)] !translate-x-0 !translate-y-0 rounded-xl bg-white p-0 shadow-2xl sm:!inset-12 sm:!left-12 sm:!top-12 sm:!h-[calc(100vh-6rem)] sm:!w-[calc(100vw-6rem)] sm:!max-w-[calc(100vw-6rem)] lg:!inset-16 lg:!left-16 lg:!top-16 lg:!h-[calc(100vh-8rem)] lg:!w-[calc(100vw-8rem)] lg:!max-w-[calc(100vw-8rem)] [&>button.absolute.right-4.top-4]:hidden">
        <div className="relative flex h-full flex-col overflow-hidden">
          {/* Custom close button - much larger */}
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="absolute right-6 top-6 z-50 rounded-lg bg-white/80 backdrop-blur hover:bg-gray-100"
            style={{ width: "40px", height: "40px" }}
          >
            <X style={{ width: "30px", height: "30px" }} />
            <span className="sr-only">Close</span>
          </Button>

          {/* Navigation buttons - much larger */}
          {onNavigate && (
            <>
              <Button
                onClick={() => onNavigate("prev")}
                disabled={!canNavigatePrev}
                variant="ghost"
                size="icon"
                className="absolute left-6 top-1/2 z-50 -translate-y-1/2 rounded-lg bg-white/80 backdrop-blur hover:bg-gray-100 disabled:opacity-50"
                style={{ width: "48px", height: "48px" }}
              >
                <ChevronLeft style={{ width: "30px", height: "30px" }} />
                <span className="sr-only">Previous comment</span>
              </Button>

              <Button
                onClick={() => onNavigate("next")}
                disabled={!canNavigateNext}
                variant="ghost"
                size="icon"
                className="absolute right-6 top-1/2 z-50 -translate-y-1/2 rounded-lg bg-white/80 backdrop-blur hover:bg-gray-100 disabled:opacity-50"
                style={{ width: "48px", height: "48px" }}
              >
                <ChevronRight style={{ width: "30px", height: "30px" }} />
                <span className="sr-only">Next comment</span>
              </Button>
            </>
          )}

          <DialogHeader className="flex-shrink-0 border-b px-8 py-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {getLevelIndicator(level)}
                <div>
                  <DialogTitle className="text-xl font-semibold text-gray-900">
                    {comment.header ? (
                      <div>{parseColoredText(comment.header)}</div>
                    ) : (
                      "Comment Details"
                    )}
                  </DialogTitle>
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
          </DialogHeader>

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

          <div className="flex-shrink-0 border-t px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {currentCommentId && totalComments > 0 && (
                  <span>
                    Comment {currentIndex + 1} of {totalComments}
                  </span>
                )}
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
      </DialogContent>
    </Dialog>
  );
}
