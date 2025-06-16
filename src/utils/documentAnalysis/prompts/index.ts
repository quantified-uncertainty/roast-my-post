import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";
import {
  LineBasedHighlighter,
  LineCharacterComment,
} from "../../highlightUtils";

const documentInformationSection = (document: Document) => {
  const highlighter = new LineBasedHighlighter(document.content);
  return `## DOCUMENT INFORMATION
Title: ${document.title || "Untitled"}
Author: ${document.author || "Not provided"}
Published: ${document.publishedDate || "Not provided"}
URL: ${document.url || "Not provided"}

## DOCUMENT CONTENT
${highlighter.getNumberedLines()}`;
};

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

${type === "thinking" && agentInfo.summaryInstructions ? `Your instructions for summary are: ${agentInfo.summaryInstructions}.` : ""}

${type === "thinking" && agentInfo.analysisInstructions ? `Your instructions for analysis are: ${agentInfo.analysisInstructions}.` : ""}

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
Your task is to analyze this document and provide your thinking process, detailed analysis, and concise summary. Focus on:
1. Your overall assessment of the document
2. Key themes and patterns you notice
3. Your expert perspective on the content

IMPORTANT: Your response must be a valid JSON object. Do not include any markdown tables or other markdown content outside the JSON object. The JSON object should look like this:

{
  "thinking": "Your detailed thinking process in markdown format. Use \\n for newlines and \\" for quotes.",
  "analysis": "Your detailed analysis and insights. This should be approximately ${targetWordCount} words long.",
  "summary": "A concise 1-2 sentence summary of your key finding or recommendation."${shouldIncludeGrade(agentInfo) ? ',\n  "grade": 85' : ""}
}

Thinking: A detailed thinking process in markdown format. Use \\n for newlines and \\" for quotes. Brainstorm about any key points and insights you find interesting and relevant. Use this as a scratchpad to help you come up with your final analysis and summary.

Analysis: Provide a detailed, high-level analysis given your specific agent instructions. This should be approximately ${targetWordCount} words long. Make heavy use of Markdown formatting to make the analysis more readable. Do not simply summarize the document, but provide a thorough analysis with your expert insights.

Summary: Provide a concise 1-2 sentence summary that captures your main finding, recommendation, or key takeaway from the document.

${shouldIncludeGrade(agentInfo) ? "Grade: A number from 0-100. This is a subjective grade based on your assessment of the document, using your specific agent instructions." : ""}

Here's the document to analyze:

${document.content}`;
}

export function getCommentPrompt(
  document: Document,
  agentInfo: Agent,
  targetComments: number,
  existingComments: LineCharacterComment[] = []
): string {
  const documentInfo = documentInformationSection(document);
  const agentContext = agentContextSection(agentInfo, "comment");
  const gradeSection = shouldIncludeGrade(agentInfo)
    ? "\n- Include a grade (0-100) for each comment"
    : "";

  const existingCommentsSection = existingComments.length
    ? `\n\nEXISTING COMMENTS (DO NOT DUPLICATE THESE):
${existingComments
  .map(
    (c) =>
      `- "${c.title}" (${c.highlight.startLineIndex}-${c.highlight.endLineIndex})`
  )
  .join("\n")}`
    : "";

  return `${documentInfo}

${agentContext}

Please analyze this document and provide ${targetComments} detailed comments. Each comment should:
- Have a clear, descriptive title
- Include a detailed description with specific insights
- Focus on the most important 5-1000 characters of text (DO NOT highlight entire paragraphs)
- For long sections, select only the most crucial 2-3 sentences
- Use line-based highlighting with startLineIndex/endLineIndex and startCharacters/endCharacters
- Include importance score (0-100)${gradeSection}
- Provide relevant external references and connections
- Avoid duplicating existing comments - focus on new sections

CRITICAL LINE NUMBER AND TEXT MATCHING RULES:
1. Line numbers start at 0 (first line is line 0)
2. startCharacters MUST be the EXACT first few characters of the text you want to highlight
3. endCharacters MUST be the EXACT last few characters of the text you want to highlight
4. Copy the characters EXACTLY as they appear in the text, including spaces and punctuation
5. Do not modify or paraphrase the text - use it exactly as written
6. If you can't find the exact text, choose a different section to highlight

EXAMPLES OF CORRECT TEXT MATCHING:

Example 1 - Single line:
If line 5 contains: "The quick brown fox jumps over the lazy dog."
And you want to highlight "quick brown fox":
{
  "startLineIndex": 5,
  "startCharacters": "quick",
  "endLineIndex": 5,
  "endCharacters": "brown fox"
}

Example 2 - Multiple lines:
If line 10 contains: "First line of a quote."
And line 11 contains: "Second line of the quote."
And you want to highlight both lines:
{
  "startLineIndex": 10,
  "startCharacters": "First l",
  "endLineIndex": 11,
  "endCharacters": "quote."
}

Example 3 - With markdown:
If line 15 contains: "**Important point**: This is a key insight."
And you want to highlight "Important point":
{
  "startLineIndex": 15,
  "startCharacters": "**Impo",
  "endLineIndex": 15,
  "endCharacters": "point**"
}

Example 4 - With punctuation:
If line 20 contains: "The author states: 'This is crucial.'"
And you want to highlight "'This is crucial.'":
{
  "startLineIndex": 20,
  "startCharacters": "'This is",
  "endLineIndex": 20,
  "endCharacters": "crucial.'"
}

${existingCommentsSection}

IMPORTANT: Focus ONLY on generating the requested number of comments. Just provide the comments in the following JSON format:

{
  "comments": [
    {
      "title": "string",
      "description": "string",
      "importance": number,
      "grade": number (optional),
      "highlight": {
        "startLineIndex": number,
        "startCharacters": "string",
        "endLineIndex": number,
        "endCharacters": "string"
      }
    }
  ]
}`;
}
