/**
 * Development-time validators to catch missing data early
 */

interface EvaluationWithVersions {
  versions?: unknown[];
}

export function validateEvaluationData(evaluations: EvaluationWithVersions[], context: string) {
  if (process.env.NODE_ENV === 'development') {
    evaluations.forEach((evaluation, index) => {
      if (!evaluation.versions || !Array.isArray(evaluation.versions)) {
        console.warn(
          `[${context}] Evaluation at index ${index} is missing versions data. ` +
          `This will cause grade badges to not display. ` +
          `Make sure to include: versions: { orderBy: { version: 'desc' }, take: 1 }`
        );
      }
    });
  }
}

interface SidebarData {
  document?: {
    evaluations?: EvaluationWithVersions[];
  };
}

export function validateSidebarData(data: SidebarData, pageName: string) {
  if (process.env.NODE_ENV === 'development') {
    if (!data?.document?.evaluations) {
      console.warn(`[${pageName}] Missing document.evaluations data for sidebar`);
      return;
    }
    
    validateEvaluationData(data.document.evaluations, `${pageName} sidebar`);
  }
}