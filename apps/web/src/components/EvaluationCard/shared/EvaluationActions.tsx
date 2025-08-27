"use client";

import Link from "next/link";
import { ArrowPathIcon, CommandLineIcon } from "@heroicons/react/24/outline";

interface EvaluationActionsProps {
  documentId: string;
  agentId: string;
  onRerun?: () => void;
  isRunning?: boolean;
  showRerun?: boolean;
  showDetails?: boolean;
  detailsText?: string;
  detailsStyle?: "link" | "button";
  className?: string;
}

/**
 * Shared component for evaluation action buttons (Details, Rerun, etc.)
 */
export function EvaluationActions({
  documentId,
  agentId,
  onRerun,
  isRunning = false,
  showRerun = false,
  showDetails = true,
  detailsText = "Details",
  detailsStyle = "link",
  className = "flex items-center gap-2",
}: EvaluationActionsProps) {
  return (
    <div className={className}>
      {showRerun && onRerun && (
        <button
          onClick={onRerun}
          disabled={isRunning}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowPathIcon className={`h-3.5 w-3.5 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Running...' : 'Rerun'}
        </button>
      )}
      {showDetails && (
        <Link
          href={`/docs/${documentId}/evals/${agentId}`}
          className={
            detailsStyle === "button"
              ? "inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
              : "flex items-center text-xs font-medium text-gray-400 hover:text-gray-700 hover:underline"
          }
        >
          {detailsStyle === "button" ? (
            <>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              {detailsText}
            </>
          ) : (
            <>
              <CommandLineIcon className="mr-1 h-4 w-4" />
              {detailsText}
            </>
          )}
        </Link>
      )}
    </div>
  );
}