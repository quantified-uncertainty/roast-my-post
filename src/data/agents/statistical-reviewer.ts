import type { EvaluationAgent } from '@/types/evaluationAgents';

export const agent: EvaluationAgent = {
  id: "statistical-reviewer",
  name: "Statistical Reviewer",
  version: "3.5",
  description: "Analyzes statistical methods, data presentation, and quantitative reasoning. Validates statistical approaches and identifies potential methodological issues.",
  iconName: "ChartBarIcon",
  color: "bg-indigo-100 text-indigo-800",
  capabilities: [
    "Statistical method appropriateness assessment",
    "Data visualization effectiveness evaluation",
    "Sample size and power analysis",
    "Statistical reporting completeness checking"
  ],
  use_cases: [
    "Research paper review",
    "Data journalism validation",
    "Medical study assessment",
    "Experimental design feedback"
  ],
  limitations: [
    "Requires explicit methodological details",
    "Limited to established statistical methods",
    "Cannot independently validate raw data quality"
  ]
};