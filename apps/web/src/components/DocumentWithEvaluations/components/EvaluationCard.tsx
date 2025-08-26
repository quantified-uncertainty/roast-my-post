"use client";

import { ChevronDownIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { StatusBadge } from "../../StatusBadge";
import { EvaluationHeader } from "../../EvaluationCard/shared/EvaluationHeader";
import { CommentToggle } from "../../EvaluationCard/shared/CommentToggle";
import { EvaluationActions } from "../../EvaluationCard/shared/EvaluationActions";
import {
  getEvaluationStatus,
  getStatusDisplayText,
} from "@/shared/utils/evaluationStatus";
import type { Evaluation } from "@/shared/types/databaseTypes";

interface EvaluationCardProps {
  review: Evaluation;
  documentId: string;
  isActive: boolean;
  onToggle: () => void;
}

export function EvaluationCard({
  review,
  documentId,
  isActive,
  onToggle,
}: EvaluationCardProps) {
  // Determine the evaluation status using shared utility
  const {
    status: evaluationStatus,
    isRerunning,
    hasCompletedVersion,
  } = getEvaluationStatus(review);
  const isComplete = hasCompletedVersion || evaluationStatus === "completed";
  const hasComments = review.comments && review.comments.length > 0;
  const isStale = review.isStale || false;

  const summary = review.summary || "No summary available";
  const truncatedSummary =
    summary.length > 300 ? summary.substring(0, 300) + "..." : summary;

  // Status-specific content using shared utility
  const getStatusContent = () => {
    if (
      isRerunning &&
      (evaluationStatus === "pending" || evaluationStatus === "running")
    ) {
      // Show summary from completed version while rerunning
      return truncatedSummary;
    }

    const statusText = getStatusDisplayText(
      evaluationStatus,
      isRerunning,
      truncatedSummary
    );
    if (evaluationStatus === "not_started" && !statusText) {
      return review.agent.description || "Not yet evaluated";
    }
    if (evaluationStatus === "failed") {
      return statusText + " • Click to retry";
    }
    return statusText || truncatedSummary;
  };

  return (
    <div
      className={`flex min-h-[100px] flex-col justify-between rounded-md bg-white p-3 ${
        !isComplete ? "opacity-90" : ""
      }`}
    >
      {/* Header Row */}
      <div className="mb-3 flex items-start justify-between">
        <EvaluationHeader
          agentName={review.agent.name}
          grade={review.grade}
          isStale={isStale}
          isRerunning={isRerunning}
          evaluationStatus={evaluationStatus}
          showGrade={isComplete && !isRerunning}
        />
        {/* Comments Switch - only show if complete and has comments */}
        {isComplete && hasComments ? (
          <CommentToggle
            isActive={isActive}
            commentCount={review.comments?.length || 0}
            onChange={onToggle}
          />
        ) : (
          <StatusBadge status={evaluationStatus} />
        )}
      </div>
      {/* Summary or Status Message */}
      <div
        className={`mb-3 min-h-[40px] text-sm ${
          isComplete ? "text-gray-700" : "italic text-gray-500"
        }`}
      >
        {getStatusContent()}
      </div>
      {/* Footer */}
      <div className="mt-auto flex flex-row items-center justify-between">
        {isComplete ? (
          <a
            href={`#eval-${review.agentId}`}
            className="flex items-center text-xs font-medium text-purple-600 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              const element = window.document.getElementById(
                `eval-${review.agentId}`
              );
              if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
          >
            Full Evaluation
            <ChevronDownIcon className="ml-1 h-3 w-3" />
          </a>
        ) : evaluationStatus === "failed" ? (
          <button
            className="flex items-center text-xs font-medium text-red-600 hover:text-red-700 hover:underline"
            onClick={() => {
              // TODO: Implement retry logic
              console.log("Retry evaluation for", review.agentId);
            }}
          >
            <ArrowPathIcon className="mr-1 h-3 w-3" />
            Retry
          </button>
        ) : (
          <span className="text-xs text-gray-400">
            {evaluationStatus === "pending" && "In queue"}
            {evaluationStatus === "running" && "Processing"}
            {evaluationStatus === "not_started" && "Not started"}
          </span>
        )}
        <div className="flex items-center gap-4">
          <EvaluationActions
            documentId={documentId}
            agentId={review.agentId}
            showDetails={true}
            showRerun={false}
            className="flex items-center gap-4"
          />
          {isComplete && (
            <a
              href={`/docs/${documentId}/evals/${review.agentId}/versions`}
              className="flex items-center text-xs font-medium text-gray-400 hover:text-gray-700 hover:underline"
            >
              v{review.versions?.[0]?.version || "1"}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
