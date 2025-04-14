// Export agents
import type { EvaluationAgent } from '../../types/evaluationAgents';
import biasDetector from './bias-detector.json';
import clarityCoach from './clarity-coach.json';
import researchScholar from './research-scholar.json';

// Export individual agents
export { biasDetector, clarityCoach, researchScholar };

// Export all agents as an array
export const evaluationAgents: EvaluationAgent[] = [
  biasDetector,
  clarityCoach,
  researchScholar,
];
