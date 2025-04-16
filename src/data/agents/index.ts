// Export agents
import type { EvaluationAgent } from "../../types/evaluationAgents";
import biasDetector from "./dist/bias-detector.json";
import clarityCoach from "./dist/clarity-coach.json";
import eaImpactEvaluator from "./dist/ea-impact-evaluator.json";
import fakeEliezer from "./dist/fake-eliezer.json";
import quantitativeForecaster from "./dist/quantitative-forecaster.json";
import researchScholar from "./dist/research-scholar.json";

// Export individual agents
export {
  biasDetector,
  clarityCoach,
  eaImpactEvaluator,
  fakeEliezer,
  quantitativeForecaster,
  researchScholar,
};

// Export all agents as an array
export const evaluationAgents: EvaluationAgent[] = [
  biasDetector as EvaluationAgent,
  clarityCoach as EvaluationAgent,
  researchScholar as EvaluationAgent,
  fakeEliezer as EvaluationAgent,
  quantitativeForecaster as EvaluationAgent,
  eaImpactEvaluator as EvaluationAgent,
];
