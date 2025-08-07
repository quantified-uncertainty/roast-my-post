"use client";

import { useState } from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { 
  InformationCircleIcon, 
  ExclamationTriangleIcon,
  XCircleIcon,
  CheckCircleIcon 
} from "@heroicons/react/24/outline";

// Database comment type (different from the documentSchema Comment type)
type DatabaseComment = {
  id: string;
  description: string;
  importance: number | null;
  grade: number | null;
  evaluationVersionId: string;
  highlightId: string;
  header?: string | null;
  level?: string | null;
  source?: string | null;
  metadata?: Record<string, any> | null;
  highlight: {
    id: string;
    startOffset: number;
    endOffset: number;
    quotedText: string;
    isValid: boolean;
    prefix: string | null;
    error: string | null;
  };
};

interface EvaluationCommentsProps {
  comments: DatabaseComment[];
  documentContent?: string;
}

function getIconForLevel(level?: string | null) {
  switch (level) {
    case 'error':
      return XCircleIcon;
    case 'warning':
      return ExclamationTriangleIcon;
    case 'success':
      return CheckCircleIcon;
    case 'debug':
      return InformationCircleIcon; // Keep it subtle for debug
    case 'info':
    default:
      return InformationCircleIcon;
  }
}

export function EvaluationComments({
  comments,
  documentContent,
}: EvaluationCommentsProps) {
  const [hoveredCommentIndex, setHoveredCommentIndex] = useState<number | null>(
    null
  );

  if (!comments || comments.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg text-gray-500">
          No comments available for this evaluation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {comments.map((comment, index) => (
        <div key={index}>
          {/* Header with comment number and info button */}
          <div className="mb-4 flex items-center justify-between">
            <h3
              id={`comment-${index + 1}`}
              className={`scroll-mt-4 text-lg font-semibold ${
                comment.level === 'error' ? 'text-red-600' :
                comment.level === 'warning' ? 'text-orange-600' :
                comment.level === 'success' ? 'text-green-600' :
                comment.level === 'debug' ? 'text-amber-600' :
                'text-gray-800'
              }`}
            >
              {comment.header ? comment.header : `Comment ${index + 1}`}
            </h3>

            {/* Info button */}
            {comment.highlight && (
              <div className="relative">
                <button
                  onMouseEnter={() => setHoveredCommentIndex(index)}
                  onMouseLeave={() => setHoveredCommentIndex(null)}
                  className="rounded-md p-1.5 transition-colors hover:bg-gray-100"
                  aria-label="Show comment details"
                >
{(() => {
                    const IconComponent = getIconForLevel(comment.level);
                    const iconColor = comment.level === 'error' ? 'text-red-500' :
                                      comment.level === 'warning' ? 'text-orange-500' :
                                      comment.level === 'success' ? 'text-green-500' :
                                      comment.level === 'debug' ? 'text-amber-500' :
                                      'text-gray-400';
                    return <IconComponent className={`h-5 w-5 ${iconColor}`} />;
                  })()}
                </button>

                {/* Tooltip with highlight details */}
                {hoveredCommentIndex === index && (
                  <div className="absolute right-0 top-8 z-10 w-64 rounded-lg bg-gray-900 p-3 text-xs text-white shadow-lg">
                    <div className="space-y-1">
                      <div>
                        <span className="font-semibold">Start Offset:</span>{" "}
                        {comment.highlight.startOffset}
                      </div>
                      <div>
                        <span className="font-semibold">End Offset:</span>{" "}
                        {comment.highlight.endOffset}
                      </div>
                      <div>
                        <span className="font-semibold">Length:</span>{" "}
                        {comment.highlight.endOffset -
                          comment.highlight.startOffset}{" "}
                        chars
                      </div>
                      {comment.highlight.quotedText && (
                        <div>
                          <span className="font-semibold">Text Length:</span>{" "}
                          {comment.highlight.quotedText.length} chars
                        </div>
                      )}
                    </div>
                    <div className="absolute -top-2 right-4 h-0 w-0 border-b-[8px] border-l-[6px] border-r-[6px] border-b-gray-900 border-l-transparent border-r-transparent"></div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comment content with light background */}
          <div className="mb-6">
            {/* Level and source badges */}
            <div className="mb-4 flex items-center gap-2">
              {comment.level && (
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  comment.level === 'error' ? 'bg-red-100 text-red-800' :
                  comment.level === 'warning' ? 'bg-orange-100 text-orange-800' :
                  comment.level === 'info' ? 'bg-blue-100 text-blue-800' :
                  comment.level === 'success' ? 'bg-green-100 text-green-800' :
                  comment.level === 'debug' ? 'bg-gray-50 text-gray-600' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {comment.level}
                </span>
              )}
              {comment.source && (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                  {comment.source}
                </span>
              )}
            </div>
            
            {/* Comment description */}
            <div className="prose prose-gray mb-8 max-w-none rounded-lg border border-gray-100 px-4 py-3">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
              >
                {comment.description}
              </ReactMarkdown>
            </div>

            {/* Highlighted text */}
            {comment.highlight?.quotedText && (
              <div className="mb-6">
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Referenced Text
                </h4>
                <div className="rounded-md bg-gray-100 p-4">
                  <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm text-gray-700">
                    {comment.highlight?.quotedText}
                  </pre>
                </div>
              </div>
            )}

            {/* Grade and Importance */}
            {(comment.grade !== undefined && comment.grade !== null) ||
            (comment.importance !== undefined &&
              comment.importance !== null) ? (
              <div className="flex items-center gap-6 text-sm font-medium text-gray-500">
                {comment.grade !== undefined && comment.grade !== null && (
                  <div className="flex items-center gap-2">
                    <span>Grade:</span>
                    <span>{comment.grade}/100</span>
                  </div>
                )}
                {comment.importance !== undefined &&
                  comment.importance !== null && (
                    <div className="flex items-center gap-2">
                      <span>Importance:</span>
                      <span>{comment.importance}/10</span>
                    </div>
                  )}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
