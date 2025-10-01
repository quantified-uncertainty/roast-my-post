/**
 * Programmatic README generator for Link Validator Tool
 */

import {
  generateToolHeader,
  generateToolsUsedSection,
  getToolDependencies,
} from "../utils/readme-helpers";
import { linkValidator } from "./index";

export function generateReadme(): string {
  const dependencies = getToolDependencies(linkValidator);
  const header = generateToolHeader(linkValidator);
  const toolsSection = generateToolsUsedSection(dependencies);

  return `${header}

${toolsSection}## How It Works

Automatically detects all URLs in text (markdown, HTML, plain text) and validates their accessibility using multi-strategy approach: GraphQL APIs for LessWrong and EA Forum posts, HTTP requests (HEAD then GET with different user agents) for other sites. Categorizes each link as working, broken, or blocked with detailed error types.

## Limitations

Many websites block automated access even when content exists. Cannot access paywalled content. Best used as first pass before human review. 403 errors often indicate bot detection, not broken content.
`;
}
