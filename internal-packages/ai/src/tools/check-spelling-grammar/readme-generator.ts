/**
 * Programmatic README generator for Check Spelling & Grammar Tool
 */

import { checkSpellingGrammarTool } from './index';
import { generateToolHeader, getToolDependencies, generateToolsUsedSection } from '../utils/readme-helpers';

export function generateReadme(): string {
  const dependencies = checkSpellingGrammarTool.getToolDependencies();
  const header = generateToolHeader(checkSpellingGrammarTool);
  const toolsSection = generateToolsUsedSection(dependencies);

  return `${header}

${toolsSection}## How It Works

First detects the document's language convention (US/UK/mixed) using the detect-language-convention tool, then sends text to Claude with detailed instructions for error detection. The tool uses importance scoring (0-100) and confidence levels to prioritize errors, with configurable strictness levels (minimal/standard/thorough) that adjust the error detection threshold.

## Capabilities & Limitations

**Strengths:** Intelligent convention handling - can enforce specific US/UK spelling or adapt to mixed conventions. Three strictness levels for different use cases. Returns exact error text with concise corrections, importance scores, and confidence ratings. Provides explanations only for complex errors to reduce noise.

**Limitations:** Costs ~$0.01-0.02 per check using Claude Haiku. Limited to 50 errors by default (configurable). Line numbers are approximate. For exact position finding, combine with fuzzy-text-locator tool.

## Technical Details

- **Strictness levels:** minimal (importance ≥51), standard (≥26), thorough (≥0)
- **Convention modes:** US, UK, or auto-detect with mixed convention support
- **Error scoring:** importance (0-100), confidence (0-100), with contextual descriptions
- **Location:** Implementation in \`/internal-packages/ai/src/tools/check-spelling-grammar/\`
`;
}
