// Import individual agents
import { agent as emotionalAnalyzer } from './emotional-analyzer';
import { agent as logicEvaluator } from './logic-evaluator';
import { agent as clarityCoach } from './clarity-coach';
import { agent as factualValidator } from './factual-validator';
import { agent as codeQualityInspector } from './code-quality-inspector';
import { agent as statisticalReviewer } from './statistical-reviewer';
import { agent as creativeEvaluator } from './creative-evaluator';
import { agent as technicalAccuracyChecker } from './technical-accuracy-checker';
import { agent as pedagogicalReviewer } from './pedagogical-reviewer';
import { agent as biasDetector } from './bias-detector';

// Export individual agents
export {
  emotionalAnalyzer,
  logicEvaluator,
  clarityCoach,
  factualValidator,
  codeQualityInspector,
  statisticalReviewer,
  creativeEvaluator,
  technicalAccuracyChecker,
  pedagogicalReviewer,
  biasDetector
};

// Export all agents
import type { EvaluationAgent } from '@/types/evaluationAgents';

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
  biasDetector
];