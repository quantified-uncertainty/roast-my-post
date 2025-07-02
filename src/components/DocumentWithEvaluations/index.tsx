"use client";

import { useEffect, useMemo, useState } from "react";

import { logger } from "@/lib/logger";
import { getDocumentFullContent } from "@/utils/documentContentHelpers";
import { HEADER_HEIGHT_PX } from "@/utils/ui/constants";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

import { EvaluationView, EvaluationSelectorModal } from "./components";
import { useCommentColorMap } from "./hooks";
import type {
  DocumentWithReviewsProps,
  EvaluationState,
  UIState,
} from "./types";

export function DocumentWithEvaluations({
  document,
  isOwner,
}: DocumentWithReviewsProps) {
  const [evaluationState, setEvaluationState] =
    useState<EvaluationState | null>(null);
  const [uiState, setUIState] = useState<UIState>({
    showEvaluationSelector: false,
    deleteError: null,
    evaluationCreationError: null,
    successMessage: null,
  });

  const hasEvaluations = document.reviews && document.reviews.length > 0;
  const activeEvaluation =
    hasEvaluations && evaluationState !== null
      ? document.reviews[evaluationState.selectedReviewIndex]
      : null;

  // Get the full content with prepend using the centralized helper
  const contentWithMetadata = useMemo(() => {
    const { content } = getDocumentFullContent(document);
    return content;
  }, [document]);

  // Automatically select the first evaluation on mount
  useEffect(() => {
    if (hasEvaluations && evaluationState === null) {
      handleEvaluationSelect(0);
    }
  }, [hasEvaluations]);

  // Create a stable color map for all comments
  const commentColorMap = useCommentColorMap(
    activeEvaluation,
    evaluationState,
    document
  );

  const handleEvaluationSelect = (index: number) => {
    // Initialize with all agent IDs selected for multi-agent mode
    const allAgentIds = new Set(document.reviews.map((r) => r.agentId));
    setEvaluationState({
      selectedReviewIndex: index,
      selectedAgentIds: allAgentIds,
      hoveredCommentId: null,
      expandedCommentId: null,
      isMultiAgentMode: true,
    });
  };

  const handleCreateEvaluation = async (agentId: string) => {
    try {
      const response = await fetch(
        `/api/documents/${document.id}/evaluations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ agentId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create evaluation");
      }

      const result = await response.json();

      // Show success notification
      setUIState((prev) => ({
        ...prev,
        evaluationCreationError: null,
        successMessage: result.created
          ? "Evaluation created and queued for processing"
          : "Evaluation re-queued for processing",
      }));

      // Clear success message after 5 seconds
      setTimeout(() => {
        setUIState((prev) => ({ ...prev, successMessage: null }));
      }, 5000);
    } catch (error) {
      logger.error("Error creating evaluation:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create evaluation";
      setUIState((prev) => ({
        ...prev,
        evaluationCreationError: errorMessage,
      }));

      // Clear error message after 8 seconds
      setTimeout(() => {
        setUIState((prev) => ({ ...prev, evaluationCreationError: null }));
      }, 8000);
    }
  };

  // Close modal on Esc
  useEffect(() => {
    if (!uiState.showEvaluationSelector) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setUIState((prev) => ({ ...prev, showEvaluationSelector: false }));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [uiState.showEvaluationSelector]);

  return (
    <div
      className="h-full bg-gray-50"
      style={{ height: `calc(100vh - ${HEADER_HEIGHT_PX}px)` }}
    >
      {activeEvaluation && evaluationState ? (
        <EvaluationView
          evaluation={activeEvaluation}
          evaluationState={evaluationState}
          onEvaluationStateChange={setEvaluationState}
          onShowEvaluationSelector={() =>
            setUIState((prev) => ({ ...prev, showEvaluationSelector: true }))
          }
          commentColorMap={commentColorMap}
          onRerunEvaluation={handleCreateEvaluation}
          document={document}
          onEvaluationSelect={handleEvaluationSelect}
          contentWithMetadata={contentWithMetadata}
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
      {uiState.showEvaluationSelector && (
        <EvaluationSelectorModal
          document={document}
          activeEvaluationIndex={evaluationState?.selectedReviewIndex ?? null}
          onEvaluationSelect={handleEvaluationSelect}
          onClose={() =>
            setUIState((prev) => ({ ...prev, showEvaluationSelector: false }))
          }
        />
      )}
      {uiState.successMessage && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg bg-green-50 p-4 shadow-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <div className="mt-2 text-sm text-green-700">
                {uiState.successMessage}
              </div>
              <div className="mt-3">
                <button
                  onClick={() =>
                    setUIState((prev) => ({ ...prev, successMessage: null }))
                  }
                  className="text-sm font-medium text-green-800 hover:text-green-900"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {uiState.evaluationCreationError && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg bg-red-50 p-4 shadow-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircleIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Evaluation Creation Failed
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {uiState.evaluationCreationError}
              </div>
              <div className="mt-3">
                <button
                  onClick={() =>
                    setUIState((prev) => ({
                      ...prev,
                      evaluationCreationError: null,
                    }))
                  }
                  className="text-sm font-medium text-red-800 hover:text-red-900"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}