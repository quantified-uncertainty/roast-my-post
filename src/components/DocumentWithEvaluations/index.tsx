"use client";

import { useMemo, useState } from "react";

import { getDocumentFullContent } from "@/utils/documentContentHelpers";
import { HEADER_HEIGHT_PX } from "@/utils/ui/constants";

import { EvaluationView } from "./components";
import type { DocumentWithReviewsProps, EvaluationState } from "./types";

export function DocumentWithEvaluations({
  document,
}: DocumentWithReviewsProps) {
  const hasEvaluations = document.reviews && document.reviews.length > 0;
  
  // Initialize evaluation state immediately if we have evaluations
  const [evaluationState, setEvaluationState] = useState<EvaluationState | null>(
    hasEvaluations
      ? {
          selectedAgentIds: new Set(document.reviews.map((r) => r.agentId)),
          hoveredCommentId: null,
          expandedCommentId: null,
        }
      : null
  );

  // Get the full content with prepend using the centralized helper
  const contentWithMetadata = useMemo(() => {
    const { content } = getDocumentFullContent(document);
    return content;
  }, [document]);

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
        <div className="flex min-h-screen flex-col items-center justify-center bg-white p-4">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            No evaluations available
          </h1>
          <p className="mb-8 text-gray-600">
            This document hasn't been evaluated yet.
          </p>
        </div>
      )}
    </div>
  );
}
