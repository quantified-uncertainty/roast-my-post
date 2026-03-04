"use client";

import type { AgenticComment } from "../hooks/useAgenticStream";

interface ResultsPanelProps {
  status: "idle" | "running" | "done" | "error";
  result: {
    summary: string;
    grade: number;
    cost: number;
    commentCount: number;
    comments: AgenticComment[];
  } | null;
  error: string | null;
}

function gradeColor(grade: number): string {
  if (grade >= 70) return "text-green-600";
  if (grade >= 40) return "text-yellow-600";
  return "text-red-600";
}

function gradeBg(grade: number): string {
  if (grade >= 70) return "bg-green-50 border-green-200";
  if (grade >= 40) return "bg-yellow-50 border-yellow-200";
  return "bg-red-50 border-red-200";
}

function levelBadge(level: string): string {
  switch (level) {
    case "error": return "bg-red-100 text-red-800";
    case "warning": return "bg-yellow-100 text-yellow-800";
    case "info": return "bg-blue-100 text-blue-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

export function ResultsPanel({ status, result, error }: ResultsPanelProps) {
  if (status === "idle") {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Select a document and run analysis
      </div>
    );
  }

  if (status === "running") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 mx-auto" />
          <p className="mt-3 text-sm text-gray-500">Analysis in progress...</p>
        </div>
      </div>
    );
  }

  if (status === "error" && !result) {
    return (
      <div className="p-4">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <h3 className="text-sm font-medium text-red-800">Analysis Failed</h3>
          <p className="mt-1 text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {/* Grade */}
      <div className={`rounded-lg border p-4 ${gradeBg(result.grade)}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Overall Grade</span>
          <span className={`text-3xl font-bold ${gradeColor(result.grade)}`}>
            {result.grade}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">Findings</p>
          <p className="text-lg font-semibold text-gray-900">{result.commentCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">Cost</p>
          <p className="text-lg font-semibold text-gray-900">${result.cost.toFixed(4)}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Summary</h3>
        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
          {result.summary}
        </p>
      </div>

      {/* Comments / Findings */}
      {result.comments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">
            Findings ({result.comments.length})
          </h3>
          {result.comments.map((comment, i) => (
            <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${levelBadge(comment.level)}`}>
                  {comment.level}
                </span>
                {comment.header && (
                  <span className="text-sm font-medium text-gray-900">{comment.header}</span>
                )}
              </div>
              {comment.highlight.quotedText && (
                <div className="mb-2 pl-3 border-l-2 border-gray-300 text-xs text-gray-500 italic">
                  &quot;{comment.highlight.quotedText}&quot;
                </div>
              )}
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                {comment.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Error warning if partial */}
      {error && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
          <p className="text-xs text-yellow-700">{error}</p>
        </div>
      )}
    </div>
  );
}
