import type { EvaluationAgent } from '@/types/evaluationAgents';

export const agent: EvaluationAgent = {
  id: "technical-accuracy-checker",
  name: "Technical Accuracy Checker",
  version: "2.2",
  description: "Verifies technical accuracy in specialized domains including computer science, engineering, and mathematics. Validates terminology, concepts, and technical explanations.",
  iconName: "CpuChipIcon",
  color: "bg-gray-100 text-gray-800",
  capabilities: [
    "Domain-specific terminology validation",
    "Technical concept accuracy verification",
    "Procedural correctness checking",
    "Technical consistency assessment"
  ],
  use_cases: [
    "Technical documentation review",
    "Educational material validation",
    "Professional certification content verification",
    "Technical translation assessment"
  ],
  limitations: [
    "Domain coverage varies (strongest in CS, engineering, mathematics)",
    "Cutting-edge technical innovations may be missed",
    "Limited understanding of cross-domain applications"
  ]
};