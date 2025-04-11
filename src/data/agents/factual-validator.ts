import type { EvaluationAgent } from '@/types/evaluationAgents';

export const agent: EvaluationAgent = {
  id: "factual-validator",
  name: "Factual Validator",
  version: "4.2",
  description: "Assesses factual accuracy and verifiability of claims. Identifies potentially misleading statements and evaluates evidence quality.",
  iconName: "ClipboardDocumentCheckIcon",
  color: "bg-green-100 text-green-800",
  capabilities: [
    "Claim extraction and verification",
    "Citation and reference quality assessment",
    "Consistency checking across documents",
    "Confidence level assignment for factual claims"
  ],
  use_cases: [
    "Research validation",
    "News and media fact-checking",
    "Educational content verification",
    "Policy document assessment"
  ],
  limitations: [
    "Limited to knowledge available in training data",
    "Cannot independently verify novel claims",
    "May struggle with highly technical domain-specific facts"
  ]
};