"use client";

import { useMemo, useState, useEffect } from "react";

import { getDocumentFullContent } from "@/utils/documentContentHelpers";
import { HEADER_HEIGHT_PX } from "@/utils/ui/constants";
import { clearTruncationCache, getTruncationCacheSize } from "@/utils/ui/commentPositioning";

import { EvaluationView } from "./components";
import { EmptyEvaluationsView } from "./components/EmptyEvaluationsView";
import type { DocumentWithReviewsProps, EvaluationState } from "./types";

export function DocumentWithEvaluations({
  document,
  isOwner = false,
  initialSelectedEvalIds,
}: DocumentWithReviewsProps) {
  const hasEvaluations = document.reviews && document.reviews.length > 0;
  
  // Check if any evaluations have pending/running jobs (only check most recent job per evaluation)
  const hasPendingJobs = useMemo(() => {
    return document.reviews.some(review => {
      const mostRecentJob = review.jobs?.[0]; // Jobs are ordered by createdAt desc
      return mostRecentJob?.status === 'PENDING' || mostRecentJob?.status === 'RUNNING';
    });
  }, [document.reviews]);

  // Get failed jobs (only most recent job per evaluation, for owner view)
  const failedJobs = useMemo(() => {
    if (!isOwner) return []; // Only calculate for owners
    
    return document.reviews
      .map(review => {
        const mostRecentJob = review.jobs?.[0]; // Jobs are ordered by createdAt desc
        return mostRecentJob?.status === 'FAILED' ? {
          ...mostRecentJob,
          agentName: review.agent.name,
          agentId: review.agentId
        } : null;
      })
      .filter((job): job is NonNullable<typeof job> => job !== null);
  }, [document.reviews, isOwner]);
  
  // Initialize evaluation state immediately if we have evaluations
  const [evaluationState, setEvaluationState] = useState<EvaluationState | null>(
    hasEvaluations
      ? {
          selectedAgentIds: new Set(
            initialSelectedEvalIds && initialSelectedEvalIds.length > 0
              ? initialSelectedEvalIds.filter(id => 
                  document.reviews.some(r => r.agentId === id)
                )
              : document.reviews.map((r) => r.agentId)
          ),
          hoveredCommentId: null,
          expandedCommentId: null,
        }
      : null
  );

  // Get the full content with prepend using the centralized helper
  // IMPORTANT: Only use stored prepend, don't generate one if missing
  // This ensures display matches what was used during analysis
  const contentWithMetadata = useMemo(() => {
    const { content } = getDocumentFullContent(document as any, {
      includePrepend: true,
      generateIfMissing: false  // Don't generate - only use if stored
    });
    return content;
  }, [document]);

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
          contentWithMetadataPrepend={contentWithMetadata}
        />
      ) : (
        <EmptyEvaluationsView
          document={document}
          contentWithMetadataPrepend={contentWithMetadata}
          isOwner={isOwner}
          hasPendingJobs={hasPendingJobs}
          failedJobs={failedJobs}
        />
      )}
    </div>
  );
}
