import type { EvaluationAgent } from '@/types/evaluationAgents';

export const agent: EvaluationAgent = {
  id: "pedagogical-reviewer",
  name: "Pedagogical Reviewer",
  version: "1.6",
  description: "Evaluates educational content for effectiveness, alignment with learning objectives, and pedagogical soundness. Assesses instructional design and learning progression.",
  iconName: "DocumentTextIcon",
  color: "bg-orange-100 text-orange-800",
  capabilities: [
    "Learning objective alignment checking",
    "Scaffolding and progression assessment",
    "Instructional clarity evaluation",
    "Assessment effectiveness analysis"
  ],
  use_cases: [
    "Course material development",
    "Educational content creation",
    "Training program assessment",
    "Self-learning resource validation"
  ],
  limitations: [
    "Limited adaptation to diverse learning styles",
    "May favor traditional pedagogical approaches",
    "Cannot directly measure learning outcomes"
  ]
};