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
  type: "analysis" | "comment"
): string {
  return `
## AGENT CONTEXT
You are ${agentInfo.name}, an expert ${agentInfo.purpose}.
Your purpose is to ${agentInfo.description}.
Your instructions are: ${agentInfo.genericInstructions}.

${type === "comment" && agentInfo.commentInstructions ? `Your instructions for comments are: ${agentInfo.commentInstructions}.` : ""}

${type === "analysis" && agentInfo.summaryInstructions ? `Your instructions for summary are: ${agentInfo.summaryInstructions}.` : ""}

${type === "analysis" && agentInfo.analysisInstructions ? `Your instructions for analysis are: ${agentInfo.analysisInstructions}.` : ""}

${type === "analysis" && agentInfo.gradeInstructions ? `Your instructions for grading are: ${agentInfo.gradeInstructions}.` : ""}
`;
}

export function getThinkingAnalysisSummaryPrompts(
  agentInfo: Agent,
  targetWordCount: number,
  document: Document
): { systemMessage: string; userMessage: string } {
  const systemMessage = agentContextSection(agentInfo, "analysis");

  const userMessage = `
${documentInformationSection(document)}

## ANALYSIS INSTRUCTIONS
Your task is to analyze this document and provide your thinking process, detailed analysis, and concise summary. Focus on:
1. Your overall assessment of the document
2. Key themes and patterns you notice
3. Your expert perspective on the content

**Thinking**: Provide a comprehensive, detailed thinking process (400-600 words). Use this as your analytical scratchpad. Include:
- Key points that stand out to you
- Connections and patterns you notice
- Questions or uncertainties that arise
- Your reasoning process and methodology
- Use proper markdown formatting with headers, bullet points, emphasis, etc.

**Analysis**: Provide a thorough, expert analysis (300-500 words) based on your agent expertise. Include:
- Deep insights beyond simple summarization  
- Your professional perspective and recommendations
- Critical evaluation of the content
- Implications and broader context
- Use rich markdown formatting (headers, bullet points, bold/italic text, etc.)

**Summary**: Provide a concise 1-2 sentence summary that captures your main finding, recommendation, or key takeaway.

${shouldIncludeGrade(agentInfo) ? "**Grade**: Provide a numerical grade from 0-1 based on your assessment." : ""}

Document to analyze:

${document.content}`;

  return { systemMessage, userMessage };
}

export function getCommentPrompts(
  document: Document,
  agentInfo: Agent,
  targetComments: number,
  existingComments: LineCharacterComment[] = []
): { systemMessage: string; userMessage: string } {
  const systemMessage = agentContextSection(agentInfo, "comment");
  const userMessage = `${documentInformationSection(document)}

Please analyze this document and provide ${targetComments} detailed comments. Each comment should:
- Have a clear, descriptive title
- Include a detailed description with specific insights
- Focus on the most important 5-1000 characters of text (DO NOT highlight entire paragraphs)
- For long sections, select only the most crucial 2-3 sentences
- Use line-based highlighting with startLineIndex/endLineIndex and startCharacters/endCharacters
- Include importance score (0-100)${shouldIncludeGrade(agentInfo) ? "\n- Include a grade (0-100) for each comment" : ""}
- Provide relevant external references and connections
- Avoid duplicating existing comments - focus on new sections

CRITICAL LINE NUMBER AND TEXT MATCHING RULES:
1. Line numbers start at 0 (first line is line 0)
2. BEFORE generating highlights, ALWAYS verify the line number by checking the "Line X:" prefix in the document content above
3. startCharacters MUST be the EXACT first few characters of the text you want to highlight - copy them EXACTLY from the line
4. endCharacters MUST be the EXACT last few characters of the text you want to highlight - copy them EXACTLY from the line
5. Copy the characters EXACTLY as they appear in the text, including spaces, punctuation, and capitalization
6. Do not modify or paraphrase the text - use it exactly as written
7. If you can't find the exact text on the specified line, choose a different section to highlight
8. DOUBLE-CHECK: Before submitting, verify that the line number and character snippets match exactly what appears in the document above

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

STEP-BY-STEP HIGHLIGHT CREATION PROCESS:
1. Identify the text you want to highlight in the document
2. Find the line(s) containing that text by looking for "Line X:" in the document content above
3. Copy the EXACT first 3-8 characters of your desired highlight from that line
4. Copy the EXACT last 3-8 characters of your desired highlight from the end line
5. Double-check that the line numbers and character snippets are correct
6. Only then create your highlight object

COMMON MISTAKES TO AVOID:
- Don't guess line numbers - always check the "Line X:" prefix
- Don't modify or clean up the text snippets - copy them exactly
- Don't use line numbers that don't exist in the document
- Don't create highlights that span non-consecutive lines
- Don't use generic terms like "the text" - be specific about what you're highlighting

${
  existingComments.length
    ? `\n\nEXISTING COMMENTS (DO NOT DUPLICATE THESE):
${existingComments
  .map(
    (c) =>
      `- "${c.title}" (${c.highlight.startLineIndex}-${c.highlight.endLineIndex})`
  )
  .join("\n")}`
    : ""
}

IMPORTANT: Focus ONLY on generating the requested number of comments. Just provide the comments in the following JSON format:

{
  "comments": [
    {
      "title": "string",
      "description": "string",
      "importance": number,
      "grade": number, // Optional - only include if shouldIncludeGrade(agentInfo) is true
      "highlight": {
        "startLineIndex": number,
        "startCharacters": "string",
        "endLineIndex": number,
        "endCharacters": "string"
      }
    }
  ]
}

${shouldIncludeGrade(agentInfo) ? "\n- Include a grade (0-100) for each comment" : ""}
`;

  return { systemMessage, userMessage };
}
