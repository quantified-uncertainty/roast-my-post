"use client";

import { useEffect, useMemo, useState } from "react";

import { getDocumentFullContent } from "@/utils/documentContentHelpers";
import { HEADER_HEIGHT_PX } from "@/utils/ui/constants";

import { EvaluationView } from "./components";
import type { DocumentWithReviewsProps, EvaluationState } from "./types";

export function DocumentWithEvaluations({
  document,
}: DocumentWithReviewsProps) {
  const [evaluationState, setEvaluationState] =
    useState<EvaluationState | null>(null);

  const hasEvaluations = document.reviews && document.reviews.length > 0;

  // Get the full content with prepend using the centralized helper
  const contentWithMetadata = useMemo(() => {
    const { content } = getDocumentFullContent(document);
    return content;
  }, [document]);

  // Automatically select the first evaluation on mount
  useEffect(() => {
    if (hasEvaluations && evaluationState === null) {
      const allAgentIds = new Set(document.reviews.map((r) => r.agentId));
      setEvaluationState({
        selectedAgentIds: allAgentIds,
        hoveredCommentId: null,
        expandedCommentId: null,
      });
    }
  }, []);

  return (
    <div
      className="flex h-full flex-col"
      style={{ height: `calc(100vh - ${HEADER_HEIGHT_PX}px)` }}
    >
      {evaluationState ? (
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
