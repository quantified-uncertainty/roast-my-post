import { SystemAgentDefinition, PluginType } from '../types';

export const spellingGrammarAgent: SystemAgentDefinition = {
  id: 'system-spelling-grammar',
  name: 'Spelling & Grammar Checker',
  description: 'Advanced proofreading agent that detects and corrects spelling and grammar errors with US/UK convention support',
  providesGrades: false, // Plugin-based agents don't provide grades
  isRecommended: true, // This is a recommended agent for proofreading
  pluginIds: [PluginType.SPELLING],
  readme: `# Spelling & Grammar Checker

A sophisticated proofreading agent that combines language convention detection with Claude-based error analysis. Features adjustable strictness levels and automatic US/UK English convention handling.

## How It Works

First detects the document's language convention (US/UK/mixed) using convention detection, then analyzes text with Claude for error detection. The agent uses importance scoring (0-100) and confidence levels to prioritize errors, with configurable strictness levels (minimal/standard/thorough) that adjust the error detection threshold.

## Capabilities

- **Intelligent convention handling** - Can enforce specific US/UK spelling or adapt to mixed conventions
- **Three strictness levels** for different use cases (minimal, standard, thorough)
- **Returns exact error text** with concise corrections, importance scores, and confidence ratings
- **Provides explanations** only for complex errors to reduce noise
- **Line number tracking** for approximate error locations

## Technical Details

- **Strictness levels:** minimal (importance ≥51), standard (≥26), thorough (≥0)
- **Convention modes:** US, UK, or auto-detect with mixed convention support
- **Error scoring:** importance (0-100), confidence (0-100), with contextual descriptions
- **Maximum errors:** 50 by default (configurable)`,


};