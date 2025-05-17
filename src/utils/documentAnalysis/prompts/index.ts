import type { Document } from "../../../types/documents";
import type { EvaluationAgent } from "../../../types/evaluationAgents";

const documentInformationSection = (
  document: Document
) => `## DOCUMENT INFORMATION
Title: ${document.title || "Untitled"}
Author: ${document.author || "Not provided"}
Published: ${document.publishedDate || "Not provided"}
URL: ${document.url || "Not provided"}
`;

function shouldIncludeGrade(agentInfo: EvaluationAgent): boolean {
  return !!agentInfo.gradeInstructions;
}

export function agentContextSection(
  agentInfo: EvaluationAgent,
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
  agentInfo: EvaluationAgent,
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
  agentInfo: EvaluationAgent,
  remainingComments: number
): string {
  return `
${agentContextSection(agentInfo, "comment")}

${documentInformationSection(document)}

## ANALYSIS INSTRUCTIONS
Your task is to analyze this document and provide ${remainingComments} specific comments. Each comment should:
1. Focus on a distinct aspect of the document
2. Include exact text highlights
3. Provide your expert perspective
4. Include an importance rating (0-100)

Format your response in JSON like this:
{
  "comments": [
    {
      "title": "string",
      "description": "string",
      "highlight": {
        "start": "exact text snippet from document where highlight begins",
        "end": "exact text snippet from document where highlight ends"
      },
      "importance": "0-100"${shouldIncludeGrade(agentInfo) ? ',\n  "grade": "number from 0-100"' : ""}
    }
  ]
}

Title: A short string, with optional emojis, bold, or italic formatting.
Description: A short string with Markdown formatting. Make sure to make good use of Markdown formatting to make the comment more readable. Aim for 2-10 sentences.
Importance: A number from 0-100 that represents how important the comment is to the document. Aim to average at around 50.
${shouldIncludeGrade(agentInfo) ? "grade: A number from 0-100 that represents if the highlighted section was negative or positive." : ""}

# DOCUMENT CONTENT
${document.content}`;
}
