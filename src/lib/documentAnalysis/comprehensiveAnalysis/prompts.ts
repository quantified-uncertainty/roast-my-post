import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";
import { generateMarkdownPrepend } from "../../../utils/documentMetadata";

export function getComprehensiveAnalysisPrompts(
  agentInfo: Agent,
  document: Document,
  targetWordCount: number,
  targetComments: number = 5
): { systemMessage: string; userMessage: string } {
  const systemMessage = `You are ${agentInfo.name}, ${agentInfo.description}.

${agentInfo.primaryInstructions}

Structure your response as a markdown document (${targetWordCount}+ words) with:

1. A brief summary section
2. Your main content (structured according to your role)
3. A "Key Highlights" section with approximately ${targetComments} specific comments

For the Key Highlights section, use this format for each comment:

### Highlight [#]: [Title]
- **Location**: Line X or Lines X-Y
- **Context**: What this passage is about
- **Your Contribution**: Your specific comment/insight/resource (100-300 words)

Important formatting notes:
- Use single line numbers like "Line 42" or ranges like "Lines 156-162"
- Number highlights sequentially (Highlight 1, Highlight 2, etc.)
- Make your contributions specific and actionable
- Use markdown formatting (headers, lists, emphasis, code blocks) throughout

${agentInfo.providesGrades ? "\nInclude a grade (0-100) with justification based on your grading criteria." : ""}`;

  // Check if document has markdownPrepend (for backward compatibility)
  const markdownPrepend = (document as any).versions?.[0]?.markdownPrepend || generateMarkdownPrepend({
    title: document.title,
    author: document.author,
    platforms: (document as any).platforms,
    publishedDate: document.publishedDate
  });

  // Combine prepend with content
  const fullContent = markdownPrepend + document.content;

  // Number the lines exactly like in comment extraction
  const numberedContent = fullContent
    .split("\n")
    .map((line, i) => `${(i + 1).toString().padStart(4, " ")} ${line}`)
    .join("\n");

  const userMessage = `Document to process:

${numberedContent}`;

  return { systemMessage, userMessage };
}
