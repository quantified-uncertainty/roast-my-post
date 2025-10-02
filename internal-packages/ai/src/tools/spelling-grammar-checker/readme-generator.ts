/**
 * Programmatic README generator for Check Spelling & Grammar Tool
 */

import {
  generateToolHeader,
  generateToolsUsedSection,
} from "../utils/readme-helpers";
import {
  checkSpellingGrammarTool,
  DEFAULT_MAX_ERRORS,
} from "./index";
import { MODEL_CONFIG } from "../../claude/wrapper";
import { getModelDisplayName } from "../../types";

export function generateReadme(): string {
  const dependencies = checkSpellingGrammarTool.getToolDependencies?.() ?? [];
  const header = generateToolHeader(checkSpellingGrammarTool);
  const toolsSection = generateToolsUsedSection(dependencies);

  return `${header}

${toolsSection}## How It Works

First detects the document's language convention (US/UK/mixed) using the detect-language-convention tool, then sends text to Claude with detailed instructions for error detection. The tool uses importance scoring and confidence levels to prioritize errors, with configurable strictness levels (minimal/standard/thorough) that adjust the error detection threshold.

## Example

**Input:** "The team of engineers are working on the project."

**Output:**
\`\`\`json
{
  "text": "are",
  "correction": "is", 
  "displayCorrection": "<r:replace from=\\"are\\" to=\\"is\\"/>",
  "type": "grammar",
  "context": "engineers are working on",
  "importance": 45,
  "confidence": 85,
  "description": "The subject 'team' is singular and requires the singular verb 'is', not the plural 'are'.",
  "lineNumber": 1
}
\`\`\`

## Limitations

Uses ${getModelDisplayName(MODEL_CONFIG.analysis)} model. Limited to \`${DEFAULT_MAX_ERRORS}\` errors by default (configurable). Line numbers are approximate. For exact position finding, combine with fuzzy-text-locator tool.

## Technical Details

- **Strictness levels:** minimal (importance ≥51), standard (≥26), thorough (≥0)
- **Convention modes:** US, UK, or auto-detect with mixed convention support
- **Error scoring:** importance (0-100), confidence (0-100), with contextual descriptions
`;
}
