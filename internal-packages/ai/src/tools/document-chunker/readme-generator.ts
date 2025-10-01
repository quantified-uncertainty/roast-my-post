/**
 * Programmatic README generator for Document Chunker Tool
 */

import {
  generateToolHeader,
  generateToolsUsedSection,
} from "../utils/readme-helpers";
import { documentChunkerTool } from "./index";

export function generateReadme(): string {
  const dependencies = documentChunkerTool.getToolDependencies?.() ?? [];
  const header = generateToolHeader(documentChunkerTool);
  const toolsSection = generateToolsUsedSection(dependencies);

  return `${header}

${toolsSection}## How It Works

Parses markdown hierarchy to identify sections and headings, then recursively chunks content based on target word count (default 500 words). Handles code blocks, lists, and nested sections intelligently. Automatically merges small gaps between chunks (≤5 chars) and ensures no text is lost by creating filler chunks for larger gaps. Maintains heading context for each chunk.

## Capabilities & Limitations

**Strengths:** Preserves markdown structure and heading hierarchy. Handles code blocks without splitting them. Tracks line numbers and character offsets for each chunk. Returns metadata including chunk type (paragraph/section/code/list/heading/mixed) and completeness confidence. Zero cost - no LLM usage.

**Limitations:** Currently only uses markdown strategy despite having semantic and hybrid methods in code. May not work well for non-markdown text. Target word count is approximate - actual chunks may vary. Cannot handle extremely nested structures beyond reasonable depth.

## Technical Details

- **Strategy:** Always uses markdown-aware chunking (ignores strategy parameter)
- **Default target:** 500 words per chunk (configurable via targetWords)
- **Character limits:** maxChunkSize (default 1500), minChunkSize (default 200)
- **Output:** Chunks with offsets, line numbers, type metadata, and heading context
`;
}
