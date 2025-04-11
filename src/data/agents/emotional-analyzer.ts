import type { EvaluationAgent } from "@/types/evaluationAgents";

export const agent: EvaluationAgent = {
  id: "emotional-analyzer",
  name: "Emotional Analyzer",
  version: "2.4",
  description:
    "Identifies emotional content and sentiment within text. Specializes in detecting subtle emotional undertones and analyzing sentiment distribution across documents.",
  iconName: "HeartIcon",
  capabilities: [
    "Sentiment analysis with 5-point scale",
    "Emotional tone identification",
    "Affective language detection",
    "Subjective vs. objective content classification",
  ],
  use_cases: [
    "Content moderation",
    "Customer feedback analysis",
    "Creative writing feedback",
    "Therapeutic text analysis",
  ],
  limitations: [
    "Limited understanding of cultural context",
    "May misinterpret sarcasm or irony",
    "Primarily optimized for English language",
  ],
};
