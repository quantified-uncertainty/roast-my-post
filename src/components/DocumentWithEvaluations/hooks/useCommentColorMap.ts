import { useMemo } from "react";
import type { Comment, Evaluation, Document } from "@/types/documentSchema";
import { getValidAndSortedComments } from "@/utils/ui/commentUtils";
import { EvaluationState } from "../types";

export function useCommentColorMap(
  activeEvaluation: Evaluation | null,
  evaluationState: EvaluationState | null,
  document: Document
) {
  return useMemo(() => {
    if (!evaluationState) return {};

    // Create colors based on agent
    const selectedEvaluations = document.reviews.filter((r) =>
      evaluationState.selectedAgentIds.has(r.agentId)
    );

    const allComments: Array<Comment & { agentId: string }> = [];
    selectedEvaluations.forEach((evaluation) => {
      evaluation.comments.forEach((comment) => {
        allComments.push({
          ...comment,
          agentId: evaluation.agentId,
        });
      });
    });

    const sortedComments = getValidAndSortedComments(allComments);
    const colorMap: Record<number, { background: string; color: string }> = {};

    // Define agent colors
    const agentColors: Record<string, string> = {};
    const baseColors = [
      "#3b82f6",
      "#10b981",
      "#f59e0b",
      "#ef4444",
      "#8b5cf6",
      "#ec4899",
      "#06b6d4",
      "#84cc16",
    ];

    selectedEvaluations.forEach((evaluation, idx) => {
      agentColors[evaluation.agentId] = baseColors[idx % baseColors.length];
    });

    sortedComments.forEach((comment, index: number) => {
      const baseColor = agentColors[comment.agentId] || "#3b82f6";
      colorMap[index] = {
        background: baseColor + "20",
        color: baseColor,
      };
    });

    return colorMap;
  }, [evaluationState, document.reviews]);
}