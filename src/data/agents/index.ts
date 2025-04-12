// Export agents
import type { EvaluationAgent } from '../../types/evaluationAgents';
import biasDetector from './bias-detector.json';
import clarityCoach from './clarity-coach.json';

// Export individual agents
export { biasDetector, clarityCoach };

// Export all agents as an array
export const evaluationAgents: EvaluationAgent[] = [biasDetector, clarityCoach];
