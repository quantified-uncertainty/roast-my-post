import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";
import { generateMarkdownPrepend } from "../../../utils/documentMetadata";

export function getLinkAnalysisPrompts(
  agentInfo: Agent,
  document: Document,
  urls: string[]
): { systemMessage: string; userMessage: string } {
  const systemMessage = `Context: ${agentInfo.name} - ${agentInfo.description}

${agentInfo.primaryInstructions}

This process analyzes links found in the document to determine which should be validated and what content is expected.

For each numbered link:
1. Determine if the URL should be validated (shouldAnalyze: true/false)
2. URLs should NOT be validated if they are examples, placeholders, hypothetical scenarios, templates, or fictional references
3. URLs SHOULD be validated if they are actual citations, references, or links readers are expected to visit
4. If shouldAnalyze is true, describe the expected content (20-200 words)
5. Include specifics about content type, purpose, and relevance

The analysis focuses on understanding authorial intent and identifying genuine references.`;

  // Check if document has markdownPrepend (for backward compatibility)
  const markdownPrepend = (document as any).versions?.[0]?.markdownPrepend || generateMarkdownPrepend({
    title: document.title,
    author: document.author,
    platforms: (document as any).platforms,
    publishedDate: document.publishedDate
  });

  // Combine prepend with content
  const fullContent = markdownPrepend + document.content;

  const userMessage = `Please analyze the links found in this document:

**Document Content:**
${fullContent}

**Links Found (numbered for reference):**
${urls.map((url, index) => `${index + 1}. ${url}`).join('\n')}

For each numbered link above, provide your analysis in this exact format:

## Link X - [Title/Description]
**URL:** [exact URL from list]
**shouldAnalyze:** true/false
**Expected Content:** [20-200 words describing what you expect to find, only if shouldAnalyze is true]

Consider:
- Is this a real citation/reference that should work, or an example/placeholder?
- What type of content should be there (research paper, news article, documentation, etc.)?
- How does it relate to the surrounding text?
- What would make this link valuable and appropriate for the document?

Only provide expected content analysis for URLs where shouldAnalyze is true.`;

  return { systemMessage, userMessage };
}