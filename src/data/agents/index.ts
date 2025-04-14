// Export agents
import type { EvaluationAgent } from '../../types/evaluationAgents';
import biasDetector from './dist/bias-detector.json';
import clarityCoach from './dist/clarity-coach.json';
import researchScholar from './dist/research-scholar.json';

// Export individual agents
export { biasDetector, clarityCoach, researchScholar };

// Export all agents as an array
export const evaluationAgents: EvaluationAgent[] = [
  biasDetector,
  clarityCoach,
  researchScholar,
];
