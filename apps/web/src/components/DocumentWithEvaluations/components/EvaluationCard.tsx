"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import type { Evaluation } from "@/shared/types/databaseTypes";
import {
  getEvaluationStatus,
  getEvaluationStatusContent,
} from "@/shared/utils/evaluationStatus";
import { truncateSummary } from "@/shared/utils/text";
import { ChevronDoubleDownIcon } from "@heroicons/react/24/outline";

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
  const _isTruncated = truncatedSummary !== summary;

  // Use shared utility for status content
  const statusContent = getEvaluationStatusContent(
    latestEvaluationStatus,
    isRerunning,
    truncatedSummary,
    review.agent.description
  );

  return (
    <div
      className={cn(
        "flex min-h-[88px] flex-col justify-between rounded-md border border-gray-200 bg-white p-2.5 shadow-sm",
        {
          "opacity-90": !hasCompletedVersion,
        }
      )}
    >
      {/* Header Row */}
      <div className="mb-2.5 flex items-start justify-between">
        <EvaluationHeader
          agentName={review.agent.name}
          agentId={review.agentId}
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
        className={cn(
          "mb-2.5 min-h-[36px] text-sm",
          hasCompletedVersion ? "text-gray-700" : "italic text-gray-500"
        )}
      >
        {statusContent}
      </div>
      {/* Footer */}
      <div className="mt-auto flex flex-row items-center justify-between">
        {hasCompletedVersion && (
          <a
            href={`#eval-${review.agentId}`}
            className="flex items-center text-xs font-medium text-blue-500 hover:underline"
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
            <ChevronDoubleDownIcon className="mr-1 h-3 w-3" />
            Full Evaluation
          </a>
        )}
        <div className="flex items-center gap-4">
          <EvaluationActions
            documentId={documentId}
            agentId={review.agentId}
            showRerun={isOwner && !!onRerun}
            onRerun={
              isOwner && onRerun ? () => onRerun(review.agentId) : undefined
            }
            className="flex items-center gap-4"
          />
          {hasCompletedVersion && (
            <Link
              href={`/docs/${documentId}/evals/${review.agentId}/versions`}
              className="flex items-center text-xs font-medium text-gray-400 hover:text-gray-700 hover:underline"
            >
              v{review.versions?.[0]?.version || "1"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
