import { spellingGrammarAgent } from './spelling-grammar';
import { mathCheckerAgent } from './math-checker';
import { factCheckerAgent } from './fact-checker';
import { forecastCheckerAgent } from './forecast-checker';
import { epistemicVerificationAgent } from './epistemic-verification';
import { linkVerifierAgent } from './link-verifier';
import { SystemAgentDefinition } from '../types';

export const systemAgents: SystemAgentDefinition[] = [
  spellingGrammarAgent,
  mathCheckerAgent,
  factCheckerAgent,
  forecastCheckerAgent,
  epistemicVerificationAgent,
  linkVerifierAgent,
];

export {
  spellingGrammarAgent,
  mathCheckerAgent,
  factCheckerAgent,
  forecastCheckerAgent,
  epistemicVerificationAgent,
  linkVerifierAgent,
};