"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useEvaluationRerun } from "@/shared/hooks/useEvaluationRerun";
import {
  clearTruncationCache,
  getTruncationCacheSize,
} from "@/shared/utils/ui/commentPositioning";
import { HEADER_HEIGHT_PX } from "@/shared/utils/ui/constants";

import { EvaluationView } from "./components";
import { EmptyEvaluationsView } from "./components/EmptyEvaluationsView";
import type {
  DocumentWithReviewsProps,
  EvaluationState,
} from "./types";

export function DocumentWithEvaluations({
  document,
  isOwner = false,
  initialSelectedEvalIds,
  showDebugComments = false,
}: DocumentWithReviewsProps) {
  // Check if we have any evaluations at all (including pending ones without versions)
  const hasEvaluations = document.reviews && document.reviews.length > 0;

  // Use the shared hook for evaluation reruns
  const { handleRerun, runningEvals } = useEvaluationRerun({
    documentId: document.id,
  });

  // Check if evaluations have pending or running jobs based on their latest job status
  const hasPendingJobs = useMemo(() => {
    return document.reviews.some((review) => {
      const mostRecentJob = review.jobs?.[0]; // Jobs are ordered by createdAt desc
      return (
        mostRecentJob?.status === "PENDING" ||
        mostRecentJob?.status === "RUNNING"
      );
    });
  }, [document.reviews]);

  // Get failed jobs from latest evaluation job for owner view
  const failedJobs = useMemo(() => {
    if (!isOwner) return []; // Only calculate for owners

    return document.reviews
      .map((review) => {
        const mostRecentJob = review.jobs?.[0]; // Jobs are ordered by createdAt desc
        return mostRecentJob?.status === "FAILED"
          ? {
              ...mostRecentJob,
              agentName: review.agent.name,
              agentId: review.agentId,
            }
          : null;
      })
      .filter((job): job is NonNullable<typeof job> => job !== null);
  }, [document.reviews, isOwner]);

  // Initialize evaluation state only if we have evaluations
  const [evaluationState, setEvaluationState] =
    useState<EvaluationState | null>(
      hasEvaluations
        ? {
            selectedAgentIds: new Set(
              initialSelectedEvalIds && initialSelectedEvalIds.length > 0
                ? initialSelectedEvalIds.filter((id) =>
                    document.reviews.some((r) => r.agentId === id)
                  )
                : document.reviews.map((r) => r.agentId)
            ),
            hoveredCommentId: null,
            expandedCommentId: null,
          }
        : null
    );

  // Document content already includes prepend from the database query via fullContent computed field

  // Manage truncation cache cleanup
  useEffect(() => {
    // Clear cache periodically to prevent memory leaks
    const interval = setInterval(() => {
      if (getTruncationCacheSize() > 1000) {
        clearTruncationCache();
      }
    }, 300000); // Clear every 5 minutes if cache grows too large

    // Clean up on unmount
    return () => {
      clearInterval(interval);
      // Clear cache when component unmounts to free memory
      clearTruncationCache();
    };
  }, []);

  return (
    <div
      className="flex h-full flex-col"
      style={{ height: `calc(100vh - ${HEADER_HEIGHT_PX}px)` }}
    >
      {hasEvaluations && evaluationState ? (
        <EvaluationView
          evaluationState={evaluationState}
          onEvaluationStateChange={setEvaluationState}
          document={document}
          contentWithMetadataPrepend={document.content}
          showDebugComments={showDebugComments}
          isOwner={isOwner}
          onRerun={isOwner ? handleRerun : undefined}
          runningEvals={runningEvals}
        />
      ) : (
        <EmptyEvaluationsView
          document={document}
          contentWithMetadataPrepend={document.content}
          isOwner={isOwner}
          hasPendingJobs={hasPendingJobs}
          failedJobs={failedJobs}
        />
      )}
    </div>
  );
}
