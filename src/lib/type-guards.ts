/**
 * Type guard to ensure evaluation has grade data
 */
export function hasGradeData(evaluation: unknown): evaluation is {
  versions: Array<{ grade?: number | null }>;
} {
  const evalObject = evaluation as { versions?: unknown };
  return evalObject?.versions !== undefined && Array.isArray(evalObject.versions) && evalObject.versions.length > 0;
}

/**
 * Safely extract grade from evaluation
 */
export function getEvaluationGrade(evaluation: unknown): number | null {
  const evalObject = evaluation as { grade?: number | null };
  if (evalObject?.grade !== undefined) {
    return evalObject.grade;
  }
  
  if (hasGradeData(evaluation)) {
    return evaluation.versions[0]?.grade ?? null;
  }
  
  return null;
}