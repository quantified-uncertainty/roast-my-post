/**
 * Type guard to ensure evaluation has grade data
 */
export function hasGradeData(evaluation: any): evaluation is {
  versions: Array<{ grade?: number | null }>;
} {
  return evaluation?.versions && Array.isArray(evaluation.versions) && evaluation.versions.length > 0;
}

/**
 * Safely extract grade from evaluation
 */
export function getEvaluationGrade(evaluation: any): number | null {
  if (evaluation?.grade !== undefined) {
    return evaluation.grade;
  }
  
  if (hasGradeData(evaluation)) {
    return evaluation.versions[0]?.grade ?? null;
  }
  
  return null;
}