/**
 * Programmatic README generator for Link Validator Tool
 */

import {
  generateToolHeader,
  generateToolsUsedSection,
} from "../utils/readme-helpers";
import { linkValidator } from "./index";

export function generateReadme(): string {
  const dependencies = linkValidator.getToolDependencies?.() ?? [];
  const header = generateToolHeader(linkValidator);
  const toolsSection = generateToolsUsedSection(dependencies);

  return `${header}

${toolsSection}## How It Works

Automatically detects all URLs in text (markdown, HTML, plain text) and validates their accessibility using multi-strategy approach: GraphQL APIs for LessWrong and EA Forum posts, HTTP requests (HEAD then GET with different user agents) for other sites. Categorizes each link as working, broken, or blocked with detailed error types.

## Capabilities & Limitations

**Strengths:** Multi-strategy validation (GraphQL + HTTP). Smart fallback mechanisms. Handles up to 20 URLs per request. Categorizes errors (404, 403, timeouts, etc.). Zero LLM usage - fast and cost-effective. Special handling for LessWrong and EA Forum via GraphQL APIs.

**Limitations:** Many websites block automated access even when content exists. Cannot access paywalled content. Best used as first pass before human review. 403 errors often indicate bot detection, not broken content.
`;
}
