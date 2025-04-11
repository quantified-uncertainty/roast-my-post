import type { EvaluationAgent } from '@/types/evaluationAgents';

export const agent: EvaluationAgent = {
  id: "logic-evaluator",
  name: "Logic Evaluator",
  version: "3.1",
  description: "Analyzes logical structure and reasoning within arguments. Identifies logical fallacies, validates argument structure, and assesses inferential connections.",
  iconName: "ScaleIcon",
  color: "bg-blue-100 text-blue-800",
  capabilities: [
    "Formal argument structure analysis",
    "Logical fallacy detection",
    "Premise-conclusion relationship validation",
    "Inferential strength assessment"
  ],
  use_cases: [
    "Academic paper evaluation",
    "Policy document analysis",
    "Debate preparation assistance",
    "Educational critical thinking support"
  ],
  limitations: [
    "Struggles with highly implicit reasoning",
    "Limited understanding of domain-specific inference patterns",
    "May miss subtle logical errors in complex arguments"
  ]
};