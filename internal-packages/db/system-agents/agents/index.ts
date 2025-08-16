import { spellingGrammarAgent } from './spelling-grammar';
import { mathCheckerAgent } from './math-checker';
import { factCheckerAgent } from './fact-checker';
import { SystemAgentDefinition } from '../types';

export const systemAgents: SystemAgentDefinition[] = [
  spellingGrammarAgent,
  mathCheckerAgent,
  factCheckerAgent,
];

export {
  spellingGrammarAgent,
  mathCheckerAgent,
  factCheckerAgent,
};