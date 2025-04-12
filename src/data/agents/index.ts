// Export all agents
import type { EvaluationAgent } from '../../types/evaluationAgents';
import { agent as biasDetector } from './bias-detector';
import { agent as clarityCoach } from './clarity-coach';
import { agent as codeQualityInspector } from './code-quality-inspector';
import { agent as creativeEvaluator } from './creative-evaluator';
// Import individual agents
import { agent as emotionalAnalyzer } from './emotional-analyzer';
import { agent as factualValidator } from './factual-validator';
import { agent as logicEvaluator } from './logic-evaluator';
import { agent as pedagogicalReviewer } from './pedagogical-reviewer';
import { agent as statisticalReviewer } from './statistical-reviewer';
import {
  agent as technicalAccuracyChecker,
} from './technical-accuracy-checker';

// Export individual agents
export {
  biasDetector,
  clarityCoach,
  codeQualityInspector,
  creativeEvaluator,
  emotionalAnalyzer,
  factualValidator,
  logicEvaluator,
  pedagogicalReviewer,
  statisticalReviewer,
  technicalAccuracyChecker,
};

export const evaluationAgents: EvaluationAgent[] = [
  emotionalAnalyzer,
  logicEvaluator,
  clarityCoach,
  factualValidator,
  codeQualityInspector,
  statisticalReviewer,
  creativeEvaluator,
  technicalAccuracyChecker,
  pedagogicalReviewer,
  biasDetector,
];
