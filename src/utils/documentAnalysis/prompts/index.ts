import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";
import { LineBasedHighlighter } from "../../highlightUtils";

const documentInformationSection = (
  document: Document
) => `## DOCUMENT INFORMATION
Title: ${document.title || "Untitled"}
Author: ${document.author || "Not provided"}
Published: ${document.publishedDate || "Not provided"}
URL: ${document.url || "Not provided"}
`;

function shouldIncludeGrade(agentInfo: Agent): boolean {
  return !!agentInfo.gradeInstructions;
}

export function agentContextSection(
  agentInfo: Agent,
  type: "comment" | "thinking"
): string {
  return `
## AGENT CONTEXT
You are ${agentInfo.name}, an expert ${agentInfo.purpose}.
Your purpose is to ${agentInfo.description}.
Your instructions are: ${agentInfo.genericInstructions}.

${type === "comment" && agentInfo.commentInstructions ? `Your instructions for comments are: ${agentInfo.commentInstructions}.` : ""}

${type === "thinking" && agentInfo.summaryInstructions ? `Your instructions for thinking are: ${agentInfo.summaryInstructions}.` : ""}

${type === "thinking" && agentInfo.gradeInstructions ? `Your instructions for grading are: ${agentInfo.gradeInstructions}.` : ""}
`;
}

export function getThinkingAndSummaryPrompt(
  agentInfo: Agent,
  targetWordCount: number,
  document: Document
): string {
  return `
${agentContextSection(agentInfo, "thinking")}

${documentInformationSection(document)}

## ANALYSIS INSTRUCTIONS
Your task is to analyze this document and provide your thinking process and summary. Focus on:
1. Your overall assessment of the document
2. Key themes and patterns you notice
3. Your expert perspective on the content

Format your response in JSON like this:
{
  "thinking": "Your detailed thinking process in markdown format. Use \\n for newlines and \\" for quotes.",
  "summary": "Your specific perspective and key insights. This should be approximately ${targetWordCount} words long."${shouldIncludeGrade(agentInfo) ? ',\n  "grade": 85' : ""}
}

Thinking: A detailed thinking process in markdown format. Use \\n for newlines and \\" for quotes. Brainstorm about any key points and insights you find interesting and relevant. Use this as a scratchpad to help you come up with your final summary.

Summary: Provide a high-level analysis, given your specific agent instructions. This should be approximately ${targetWordCount} words long. Make heavy use of Markdown formatting to make the summary more readable. Do not simply summarize the document, but provide a high-level analysis.

${shouldIncludeGrade(agentInfo) ? "Grade: A number from 0-100. This is a subjective grade based on your assessment of the document, using your specific agent instructions." : ""}

Here's the document to analyze:

${document.content}`;
}

export function getCommentPrompt(
  document: Document,
  agentInfo: Agent,
  remainingComments: number
): string {
  const highlighter = new LineBasedHighlighter(document.content);
  const numberedLines = highlighter.getNumberedLines();
  const stats = highlighter.getStats();

  return `
${agentContextSection(agentInfo, "comment")}

${documentInformationSection(document)}

## ANALYSIS INSTRUCTIONS
Your task is to analyze this document and provide ${remainingComments} specific comments using LINE-BASED highlighting.

The document is shown with LINE NUMBERS. Each line is numbered (0, 1, 2, etc.).
For highlights, specify the LINE INDEX and the first/last few CHARACTERS of what you want to highlight.

## EXAMPLES:

**Example: Highlighting within a single line**
Line 5: When I started this blog in high school, I did not imagine that I would cause [_The Daily Show_] to do an episode about shrimp.

To highlight "The Daily Show":
\`\`\`json
{
  "startLineIndex": 5,
  "startCharacters": "[_The ",
  "endLineIndex": 5,
  "endCharacters": "Show_]"
}
\`\`\`

**Example: Highlighting across multiple lines**
Line 10: > Andres: I was working in investment banking. My wife was helping refugees,
Line 11: > and I saw how meaningful her work was. And I decided to do the same.

To highlight the full quote:
\`\`\`json
{
  "startLineIndex": 10,
  "startCharacters": "> Andre",
  "endLineIndex": 11,
  "endCharacters": "same."
}
\`\`\`

## DOCUMENT ANALYSIS:
- Total lines: ${stats.totalLines}
- Content lines: ${stats.totalLines} (excluding empty lines)
- Average line length: ${stats.averageLineLength} characters
- Longest line: ${stats.longestLine} characters

## NUMBERED DOCUMENT:
${numberedLines}

## RESPONSE FORMAT:
{
  "comments": [
    {
      "title": "Comment title with optional emojis",
      "description": "Detailed description with Markdown formatting",
      "importance": 75,
      "highlight": {
        "startLineIndex": 0,
        "startCharacters": "First ",
        "endLineIndex": 0,
        "endCharacters": "chars."
      }${shouldIncludeGrade(agentInfo) ? ',\n      "grade": 85' : ""}
    }
  ]
}

## RULES:
1. **Count line numbers carefully** - Line 0 is the first line, Line 1 is the second, etc.
2. **Use 4-8 characters** for startCharacters and endCharacters
3. **Copy characters exactly** - include spaces, punctuation, markdown syntax
4. **Make characters distinctive** - choose unique snippets that won't appear elsewhere in the line
5. **Can span multiple lines** - endLineIndex can be different from startLineIndex
6. **Choose complete thoughts** - highlight logical phrases or sentences
7. **Include markdown syntax** when relevant (links, emphasis, blockquotes)
8. **Importance**: 0-100 (higher for key insights)
${shouldIncludeGrade(agentInfo) ? "9. **Grade**: 0-100 (positive feedback = higher grades)" : ""}

## TIPS:
- Look at the line numbers to orient yourself
- Choose character snippets that are unique within their respective lines
- For markdown links like [text](url), include the brackets in your characters
- For blockquotes, include the ">" in your characters
- If a line is very long, choose distinctive characters that won't repeat`;
}
