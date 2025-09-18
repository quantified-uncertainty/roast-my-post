"use client";

import Link from "next/link";
import {
  ArrowPathIcon,
  CommandLineIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";

interface EvaluationActionsProps {
  documentId: string;
  agentId: string;
  onRerun?: () => void;
  onDelete?: () => void;
  isRunning?: boolean;
  isDeleting?: boolean;
  showRerun?: boolean;
  showDelete?: boolean;
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
  onDelete,
  isRunning = false,
  isDeleting = false,
  showRerun = false,
  showDelete = false,
  showDetails = true,
  detailsText = "Details",
  detailsStyle = "link",
  className = "flex items-center gap-2",
}: EvaluationActionsProps) {
  return (
    <div className={className}>
      {showRerun && onRerun && (
        <Button
          onClick={onRerun}
          disabled={isRunning}
          variant="outline"
          size="xs"
        >
          <ArrowPathIcon
            className={`h-3.5 w-3.5 ${isRunning ? "animate-spin" : ""}`}
          />
          {isRunning ? "Running..." : "Rerun"}
        </Button>
      )}
      {showDelete && onDelete && (
        <Button
          onClick={onDelete}
          disabled={isDeleting}
          variant="outline"
          size="xs"
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <TrashIcon
            className={`h-3.5 w-3.5 ${isDeleting ? "animate-pulse" : ""}`}
          />
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>
      )}
      {showDetails &&
        (detailsStyle === "button" ? (
          <Button asChild size="xs">
            <Link href={`/docs/${documentId}/evals/${agentId}`}>
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
              {detailsText}
            </Link>
          </Button>
        ) : (
          <Link
            href={`/docs/${documentId}/evals/${agentId}`}
            className="flex items-center text-xs font-medium text-gray-400 hover:text-gray-700 hover:underline"
          >
            <CommandLineIcon className="mr-1 h-4 w-4" />
            {detailsText}
          </Link>
        ))}
    </div>
  );
}
