import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";

const documentInformationSection = (document: Document) => {
  return `## DOCUMENT INFORMATION
Title: ${document.title || "Untitled"}
Author: ${document.author || "Not provided"}
Published: ${document.publishedDate || "Not provided"}
URL: ${document.url || "Not provided"}

## DOCUMENT CONTENT
${document.content}`;
};

function shouldIncludeGrade(agentInfo: Agent): boolean {
  return !!agentInfo.gradeInstructions;
}

export function agentContextSection(
  agentInfo: Agent,
  type: "analysis"
): string {
  return `
## AGENT CONTEXT
You are ${agentInfo.name}, an expert ${agentInfo.purpose}.
Your purpose is to ${agentInfo.description}.
Your instructions are: ${agentInfo.genericInstructions}.

${agentInfo.summaryInstructions ? `Your instructions for summary are: ${agentInfo.summaryInstructions}.` : ""}

${agentInfo.analysisInstructions ? `Your instructions for analysis are: ${agentInfo.analysisInstructions}.` : ""}

${agentInfo.gradeInstructions ? `Your instructions for grading are: ${agentInfo.gradeInstructions}.` : ""}
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