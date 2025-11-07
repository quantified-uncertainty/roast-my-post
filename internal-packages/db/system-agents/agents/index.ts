import { spellingGrammarAgent } from './spelling-grammar';
import { mathCheckerAgent } from './math-checker';
import { factCheckerAgent } from './fact-checker';
import { forecastCheckerAgent } from './forecast-checker';
import { comprehensiveCheckerAgent } from './comprehensive-checker';
import { linkCheckerAgent } from './link-checker';
import { epistemicCriticAgent } from './epistemic-critic';
import { SystemAgentDefinition } from '../types';

export const systemAgents: SystemAgentDefinition[] = [
  spellingGrammarAgent,
  mathCheckerAgent,
  factCheckerAgent,
  forecastCheckerAgent,
  comprehensiveCheckerAgent,
  linkCheckerAgent,
  epistemicCriticAgent,
];

export {
  spellingGrammarAgent,
  mathCheckerAgent,
  factCheckerAgent,
  forecastCheckerAgent,
  comprehensiveCheckerAgent,
  linkCheckerAgent,
  epistemicCriticAgent,
};
