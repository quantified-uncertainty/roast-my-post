/**
 * Programmatic README generator for Detect Language Convention Tool
 */

import {
  generateToolHeader,
  generateToolsUsedSection,
} from "../utils/readme-helpers";
import { detectLanguageConventionTool } from "./index";

export function generateReadme(): string {
  const dependencies = detectLanguageConventionTool.getToolDependencies?.() ?? [];
  const header = generateToolHeader(detectLanguageConventionTool);
  const toolsSection = generateToolsUsedSection(dependencies);

  return `${header}

${toolsSection}## How It Works

Analyzes text against comprehensive US/UK word pair dictionaries (500+ word variations including -ize/-ise, -or/-our, -er/-re patterns). Applies pattern-based weighting (e.g., -ize/-ise differences weighted higher than -or/-our) and word frequency weights for common terms. Also detects document type (academic, technical, blog, casual) for additional context.

## Capabilities & Limitations

**Strengths:** Zero cost - no API usage. Deterministic and fast (<10ms). Returns confidence (0-1) and consistency scores. Provides evidence list showing which words were detected. Handles mixed conventions by calculating consistency metric. Analyzes up to 2000 characters by default (configurable).

**Limitations:** Frequently fails to detect the correct language convention. Cannot detect Australian, Canadian, or other English variants. Requires sufficient distinctive words for accurate detection. 

## Technical Details

- **Dictionary size:** 500+ US/UK word pairs with variations
- **Pattern weights:** Different patterns weighted by distinctiveness
- **Output:** Convention (US/UK), confidence (0-1), consistency (0-1), evidence array, document type
- **Location:** Implementation in \`/internal-packages/ai/src/tools/detect-language-convention/\`
`;
}
