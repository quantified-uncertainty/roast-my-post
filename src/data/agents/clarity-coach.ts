import type { EvaluationAgent } from '@/types/evaluationAgents';

export const agent: EvaluationAgent = {
  id: "clarity-coach",
  name: "Clarity Coach",
  version: "1.8",
  description: "Evaluates the clarity, coherence, and readability of written communication. Provides metrics on readability and identifies opportunities for improved expression.",
  iconName: "LightBulbIcon",
  color: "bg-yellow-100 text-yellow-800",
  capabilities: [
    "Readability scoring across multiple scales",
    "Sentence structure complexity analysis",
    "Clarity enhancement suggestions",
    "Jargon and unnecessary complexity detection"
  ],
  use_cases: [
    "Documentation improvement",
    "Educational material optimization",
    "Technical communication simplification",
    "Content accessibility enhancement"
  ],
  limitations: [
    "May prioritize simplicity over nuance",
    "Less effective for specialized technical content",
    "Limited assessment of audience-specific clarity needs"
  ]
};