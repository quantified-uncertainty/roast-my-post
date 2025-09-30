import { SystemAgentDefinition, PluginType } from '../types';
import { pluginReadmes } from "../generated-plugin-readmes";

export const spellingGrammarAgent: SystemAgentDefinition = {
  id: 'system-spelling-grammar',
  name: 'Spelling & Grammar Checker',
  description: 'Advanced proofreading agent that detects and corrects spelling and grammar errors with US/UK convention support',
  providesGrades: false, // Plugin-based agents don't provide grades
  isRecommended: true, // This is a recommended agent for proofreading
  pluginIds: [PluginType.SPELLING],
  readme: pluginReadmes["spelling-grammar"],
};