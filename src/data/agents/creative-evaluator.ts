import type { EvaluationAgent } from '@/types/evaluationAgents';

export const agent: EvaluationAgent = {
  id: "creative-evaluator",
  name: "Creative Evaluator",
  version: "1.9",
  description:
    "Assesses creative works for originality, coherence, and artistic merit. Provides feedback on narrative structure, stylistic elements, and audience engagement potential.",
  iconName: "LightBulbIcon",
  capabilities: [
    "Stylistic analysis and comparison",
    "Narrative structure evaluation",
    "Originality assessment",
    "Genre convention adherence checking",
  ],
  use_cases: [
    "Creative writing feedback",
    "Marketing copy assessment",
    "Content engagement prediction",
    "Arts education support",
  ],
  limitations: [
    "Subjective nature of creative evaluation",
    "Cultural context limitations",
    "May favor conventional over experimental approaches",
  ],
};
