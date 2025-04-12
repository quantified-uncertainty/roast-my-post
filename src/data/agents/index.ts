// Export agents directly from JSON
import type { EvaluationAgent } from '../../types/evaluationAgents';

// Import agent data directly
// Next.js can import JSON files directly
import biasDetectorData from './bias-detector.json';
import clarityCoachData from './clarity-coach.json';

// Export individual agents
export const biasDetector = biasDetectorData as EvaluationAgent;
export const clarityCoach = clarityCoachData as EvaluationAgent;

// Export all agents as an array
export const evaluationAgents: EvaluationAgent[] = [
  biasDetector,
  clarityCoach
];