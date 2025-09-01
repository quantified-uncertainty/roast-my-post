"use client";

import type { Evaluation } from "@/shared/types/databaseTypes";
import {
  getEvaluationStatus,
  getEvaluationStatusContent,
} from "@/shared/utils/evaluationStatus";
import { truncateSummary } from "@/shared/utils/text";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

import { CommentToggle } from "../../EvaluationCard/shared/CommentToggle";
import { EvaluationActions } from "../../EvaluationCard/shared/EvaluationActions";
import { EvaluationHeader } from "../../EvaluationCard/shared/EvaluationHeader";
import { StatusBadge } from "../../StatusBadge";

interface EvaluationCardProps {
  review: Evaluation;
  documentId: string;
  isActive: boolean;
  onToggle: () => void;
  onRerun?: (agentId: string) => void;
  isOwner?: boolean;
}

export function EvaluationCard({
  review,
  documentId,
  isActive,
  onToggle,
  onRerun,
  isOwner = false,
}: EvaluationCardProps) {
  // Determine the evaluation status using shared utility
  const { latestEvaluationStatus, isRerunning, hasCompletedVersion } =
    getEvaluationStatus(review);
  const hasComments = review.comments && review.comments.length > 0;
  const isStale = review.isStale || false;

  const summary = review.summary || "No summary available";
  const truncatedSummary = truncateSummary(summary);

  // Use shared utility for status content
  const statusContent = getEvaluationStatusContent(
    latestEvaluationStatus,
    isRerunning,
    truncatedSummary,
    review.agent.description
  );

  return (
    <div
      className={`flex min-h-[100px] flex-col justify-between rounded-md border border-gray-200 bg-white p-3 shadow-sm ${
        !hasCompletedVersion ? "opacity-90" : ""
      }`}
    >
      {/* Header Row */}
      <div className="mb-3 flex items-start justify-between">
        <EvaluationHeader
          agentName={review.agent.name}
          grade={review.grade}
          isStale={isStale}
          isRerunning={isRerunning}
          evaluationStatus={latestEvaluationStatus}
          showGrade={hasCompletedVersion && !isRerunning}
        />
        {/* Comments Switch - only show if complete and has comments */}
        {hasCompletedVersion && hasComments ? (
          <CommentToggle
            isActive={isActive}
            commentCount={review.comments?.length || 0}
            onChange={onToggle}
          />
        ) : (
          <StatusBadge status={latestEvaluationStatus} />
        )}
      </div>
      {/* Summary or Status Message */}
      <div
        className={`mb-3 min-h-[40px] text-sm ${
          hasCompletedVersion ? "text-gray-700" : "italic text-gray-500"
        }`}
      >
        {statusContent}
      </div>
      {/* Footer */}
      <div className="mt-auto flex flex-row items-center justify-between">
        {hasCompletedVersion && (
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
        )}
        <div className="flex items-center gap-4">
          <EvaluationActions
            documentId={documentId}
            agentId={review.agentId}
            showDetails={true}
            showRerun={isOwner && !!onRerun}
            onRerun={
              isOwner && onRerun ? () => onRerun(review.agentId) : undefined
            }
            className="flex items-center gap-4"
          />
          {hasCompletedVersion && (
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
