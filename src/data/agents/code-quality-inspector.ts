import type { EvaluationAgent } from '@/types/evaluationAgents';

export const agent: EvaluationAgent = {
  id: "code-quality-inspector",
  name: "Code Quality Inspector",
  version: "2.7",
  description: "Evaluates software code for quality, maintainability, and adherence to best practices. Identifies potential bugs, security issues, and opportunities for optimization.",
  iconName: "CodeBracketIcon",
  color: "bg-purple-100 text-purple-800",
  capabilities: [
    "Static code analysis",
    "Best practice compliance checking",
    "Security vulnerability detection",
    "Code complexity and maintainability metrics"
  ],
  use_cases: [
    "Code review automation",
    "Technical debt assessment",
    "Security audit assistance",
    "Developer education"
  ],
  limitations: [
    "Language-specific limitations (strongest in Python, JavaScript, Java)",
    "Cannot test runtime behavior",
    "Limited understanding of domain-specific optimizations"
  ]
};