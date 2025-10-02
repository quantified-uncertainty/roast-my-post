/**
 * Programmatic README generator for Spelling Plugin
 * Generates documentation from actual plugin configuration
 */

import {
  MAX_ERRORS_PER_CHUNK,
  MIN_CONFIDENCE_THRESHOLD,
  HIGH_IMPORTANCE_THRESHOLD,
  CONVENTION_SAMPLE_SIZE,
  LOW_CONFIDENCE_THRESHOLD,
  LOW_CONSISTENCY_THRESHOLD,
} from './constants';
import { SpellingPlugin } from './index';
import { generateToolsUsedSection } from '../../utils/readme-helpers';

export function generateReadme(): string {
  const plugin = new SpellingPlugin();
  const tools = plugin.getToolDependencies();
  const toolsSection = generateToolsUsedSection(tools);

  return `# Spelling & Grammar Checker

A sophisticated proofreading agent that combines language convention detection with Claude-based error analysis. Features adjustable strictness levels and automatic US/UK English convention handling.

${toolsSection}

## Configuration

**Error Processing:**
- Maximum errors per chunk: **${MAX_ERRORS_PER_CHUNK}**
- Minimum confidence threshold: **${MIN_CONFIDENCE_THRESHOLD}**
- High importance threshold: **${HIGH_IMPORTANCE_THRESHOLD}**

**Language Convention Detection:**
- Sample size for detection: **${CONVENTION_SAMPLE_SIZE} characters**
- Low confidence threshold: **${LOW_CONFIDENCE_THRESHOLD}**
- Low consistency threshold: **${LOW_CONSISTENCY_THRESHOLD}**

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
- **Maximum errors:** 50 by default (configurable)

---
*This documentation is programmatically generated from source code. Do not edit manually.*
`;
}
