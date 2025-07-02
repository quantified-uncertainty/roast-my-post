import { useMemo } from "react";
import type { Comment, Evaluation, Document } from "@/types/documentSchema";
import { getValidAndSortedComments, getCommentColorByGrade } from "@/utils/ui/commentUtils";
import { EvaluationState } from "../types";

export function useCommentColorMap(
  activeEvaluation: Evaluation | null,
  evaluationState: EvaluationState | null,
  document: Document
) {
  return useMemo(() => {
    if (!evaluationState) return {};

    // For multi-agent mode, create colors based on agent
    if (evaluationState.isMultiAgentMode) {
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
      const colorMap: Record<number, { background: string; color: string }> =
        {};

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

      sortedComments.forEach((comment: any, index: number) => {
        const baseColor = agentColors[comment.agentId] || "#3b82f6";
        colorMap[index] = {
          background: baseColor + "20",
          color: baseColor,
        };
      });

      return colorMap;
    }

    // Single agent mode - original logic
    if (!activeEvaluation) return {};
    const sortedComments = getValidAndSortedComments(activeEvaluation.comments);
    const hasGradeInstructions = activeEvaluation.agent.providesGrades ?? false;

    // Get all importance values for percentile calculation
    const allImportances = sortedComments
      .map((comment: Comment) => comment.importance)
      .filter(
        (importance: number | undefined): importance is number =>
          importance !== undefined
      );

    return sortedComments.reduce(
      (
        map: Record<number, { background: string; color: string }>,
        comment: Comment,
        index: number
      ) => {
        if (hasGradeInstructions && comment.grade !== undefined) {
          map[index] = getCommentColorByGrade(
            comment.grade,
            comment.importance,
            true,
            allImportances,
            index
          );
        } else {
          map[index] = getCommentColorByGrade(
            undefined,
            comment.importance,
            false,
            allImportances,
            index
          );
        }
        return map;
      },
      {} as Record<number, { background: string; color: string }>
    );
  }, [activeEvaluation, evaluationState, document.reviews]);
}