import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";
import { getDocumentFullContent } from "../../../utils/documentContentHelpers";

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

### Highlight [#]
- **Location**: Line X or Lines X-Y
- **Context**: What this passage is about
- **Your Contribution**: Your specific comment/insight/resource (100-300 words). Start with a clear summary sentence that captures the main point, then provide your detailed analysis.

Important formatting notes:
- Use single line numbers like "Line 42" or ranges like "Lines 156-162"
- Number highlights sequentially (Highlight 1, Highlight 2, etc.)
- Make your contributions specific and actionable
- Begin each contribution with a strong opening sentence that summarizes the key point
- Use markdown formatting (headers, lists, emphasis, code blocks) throughout

${agentInfo.providesGrades ? "\nInclude a grade (0-100) with justification based on your grading criteria." : ""}`;

  // Get the full content with prepend using the centralized helper
  const { content: fullContent } = getDocumentFullContent(document);

  // Number the lines exactly like in comment extraction
  const numberedContent = fullContent
    .split("\n")
    .map((line, i) => `${(i + 1).toString().padStart(4, " ")} ${line}`)
    .join("\n");

  const userMessage = `Document to process:

${numberedContent}`;

  return { systemMessage, userMessage };
}
