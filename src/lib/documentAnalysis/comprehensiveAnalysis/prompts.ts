import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";

export function getComprehensiveAnalysisPrompts(
  agentInfo: Agent,
  document: Document,
  targetWordCount: number,
  targetComments: number = 5
): { systemMessage: string; userMessage: string } {
  const systemMessage = `You are ${agentInfo.name}, ${agentInfo.description}.

${agentInfo.genericInstructions}

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

${/* TODO: NEEDS GRADE FLAG - Replace with agentInfo.providesGrades */false ? "\nInclude a grade (0-100) with justification based on your grading criteria." : ""}`;

  // Number the lines exactly like in comment extraction
  const numberedContent = document.content
    .split("\n")
    .map((line, i) => `${(i + 1).toString().padStart(4, " ")} ${line}`)
    .join("\n");

  const userMessage = `Document to process:

Title: ${document.title}
Author: ${document.author}
Published: ${new Date(document.publishedDate).toLocaleDateString()}

${numberedContent}`;

  return { systemMessage, userMessage };
}
