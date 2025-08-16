import { spellingGrammarAgent } from './spelling-grammar';
import { mathCheckerAgent } from './math-checker';
import { factCheckerAgent } from './fact-checker';
import { forecastCheckerAgent } from './forecast-checker';
import { epistemicVerificationAgent } from './epistemic-verification';
import { SystemAgentDefinition } from '../types';

export const systemAgents: SystemAgentDefinition[] = [
  spellingGrammarAgent,
  mathCheckerAgent,
  factCheckerAgent,
  forecastCheckerAgent,
  epistemicVerificationAgent,
];

export {
  spellingGrammarAgent,
  mathCheckerAgent,
  factCheckerAgent,
  forecastCheckerAgent,
  epistemicVerificationAgent,
};