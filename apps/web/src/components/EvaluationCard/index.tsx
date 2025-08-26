/**
 * Shared evaluation card component that can be used in both 
 * reader view and document management page for consistency
 */

import Link from "next/link";
import { 
  ArrowPathIcon, 
  CommandLineIcon,
  ChatBubbleLeftIcon,
  ChevronDownIcon
} from "@heroicons/react/24/outline";
import { GradeBadge } from "../GradeBadge";
import { StatusBadge } from "../StatusBadge";
import { StaleBadge } from "../StaleBadge";
import { getEvaluationStatus, getStatusDisplayText } from "@/shared/utils/evaluationStatus";

export interface EvaluationCardProps {
  evaluation: {
    id?: string;
    agentId: string;
    agent: {
      name: string;
      description?: string;
    };
    grade?: number | null;
    summary?: string;
    comments?: any[];
    jobs?: Array<{ status: string; createdAt: Date }>;
    versions?: any[];
    isStale?: boolean;
  };
  documentId: string;
  variant?: 'compact' | 'full';
  isActive?: boolean;
  onToggleActive?: () => void;
  onRerun?: () => void;
  isRunning?: boolean;
  showCommentToggle?: boolean;
}

export function EvaluationCard({
  evaluation,
  documentId,
  variant = 'compact',
  isActive = false,
  onToggleActive,
  onRerun,
  isRunning = false,
  showCommentToggle = true,
}: EvaluationCardProps) {
  const { status: evaluationStatus, isRerunning, hasCompletedVersion } = getEvaluationStatus(evaluation);
  const isComplete = hasCompletedVersion || evaluationStatus === "completed";
  const hasComments = evaluation.comments && evaluation.comments.length > 0;
  const isStale = evaluation.isStale || false;

  const summary = evaluation.summary || "No summary available";
  const truncatedSummary = summary.length > 300 ? summary.substring(0, 300) + "..." : summary;

  // Get status-specific content
  const getStatusContent = () => {
    if (isRerunning && (evaluationStatus === "pending" || evaluationStatus === "running")) {
      return truncatedSummary;
    }
    
    const statusText = getStatusDisplayText(evaluationStatus, isRerunning, truncatedSummary);
    if (evaluationStatus === "not_started" && !statusText) {
      return evaluation.agent.description || "Not yet evaluated";
    }
    if (evaluationStatus === "failed") {
      return statusText + " • Click to retry";
    }
    return statusText || truncatedSummary;
  };

  if (variant === 'full') {
    // Full variant for document management page
    // TODO: Implement full variant matching EvaluationManagement style
    return null;
  }

  // Compact variant for reader view cards
  return (
    <div
      className={`flex min-h-[100px] flex-col justify-between rounded-md bg-white p-3 ${
        !isComplete ? "opacity-90" : ""
      }`}
    >
      {/* Header Row */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          {isComplete && evaluation.grade !== undefined && evaluation.grade !== null && !isRerunning && (
            <GradeBadge
              grade={evaluation.grade}
              variant="grayscale"
              size="xs"
            />
          )}
          <span className="text-sm font-semibold text-gray-700">
            {evaluation.agent.name}
          </span>
          {isStale && isComplete && (
            <StaleBadge size="sm" />
          )}
          {isRerunning && (
            <StatusBadge
              status={evaluationStatus}
              showText={true}
            />
          )}
        </div>
        {/* Comments Switch - only show if complete and has comments */}
        {showCommentToggle && isComplete && hasComments ? (
          <label className="flex cursor-pointer select-none items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={onToggleActive}
              className="sr-only"
            />
            <span
              className={`relative inline-block h-4 w-9 rounded-full transition-colors duration-200 ${
                isActive ? "bg-purple-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`absolute left-1 top-1 h-2 w-2 rounded-full bg-white shadow transition-transform duration-200 ${
                  isActive ? "translate-x-4" : ""
                }`}
              />
            </span>
            <span
              className={`text-sm font-medium ${
                isActive ? "text-gray-700" : "text-gray-400"
              }`}
            >
              Comments ({evaluation.comments?.length || 0})
            </span>
          </label>
        ) : (
          <StatusBadge
            status={evaluationStatus}
          />
        )}
      </div>

      {/* Summary or Status Message */}
      <div className={`mb-3 min-h-[40px] text-sm ${
        isComplete ? "text-gray-700" : "text-gray-500 italic"
      }`}>
        {getStatusContent()}
      </div>

      {/* Footer */}
      <div className="mt-auto flex flex-row items-center justify-between">
        {isComplete ? (
          <a
            href={`#eval-${evaluation.agentId}`}
            className="flex items-center text-xs font-medium text-purple-600 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              const element = window.document.getElementById(`eval-${evaluation.agentId}`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
          >
            Full Evaluation
            <ChevronDownIcon className="ml-1 h-3 w-3" />
          </a>
        ) : evaluationStatus === "failed" && onRerun ? (
          <button
            className="flex items-center text-xs font-medium text-red-600 hover:text-red-700 hover:underline"
            onClick={onRerun}
            disabled={isRunning}
          >
            <ArrowPathIcon className={`mr-1 h-3 w-3 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Retrying...' : 'Retry'}
          </button>
        ) : (
          <span className="text-xs text-gray-400">
            {evaluationStatus === "pending" && "In queue"}
            {evaluationStatus === "running" && "Processing"}
            {evaluationStatus === "not_started" && "Not started"}
          </span>
        )}
        <div className="flex items-center gap-4">
          <Link
            href={`/docs/${documentId}/evals/${evaluation.agentId}`}
            className="flex items-center text-xs font-medium text-gray-400 hover:text-gray-700 hover:underline"
            rel="noopener noreferrer"
          >
            <CommandLineIcon className="mr-1 h-4 w-4" />
            Details
          </Link>
          {isComplete && evaluation.versions?.[0] && (
            <Link
              href={`/docs/${documentId}/evals/${evaluation.agentId}/versions`}
              className="flex items-center text-xs font-medium text-gray-400 hover:text-gray-700 hover:underline"
            >
              v{evaluation.versions[0].version || "1"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}