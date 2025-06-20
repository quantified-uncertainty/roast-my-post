import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";

export function getThinkingPrompts(
  agentInfo: Agent,
  document: Document
): { systemMessage: string; userMessage: string } {
  const systemMessage = `You are ${agentInfo.name}, ${agentInfo.description}.

${agentInfo.genericInstructions}

Your task is to conduct a comprehensive thinking process about the document. This is the CORE analysis step where you should do all the heavy lifting of understanding, evaluating, and analyzing the document.

Your thinking should be extensive and detailed (800-1200 words), covering:
- Initial impressions and overall assessment
- Key strengths and weaknesses
- Important insights and observations
- Notable sections or passages that stand out
- Quality evaluation across different dimensions
- Any specific observations relevant to your role as ${agentInfo.name}
- Potential areas for commenting or highlighting
- Overall judgment and reasoning

Use proper markdown formatting with headers, bullet points, emphasis, etc. to make your thinking well-structured and readable.

This thinking will later be used to inform both a concise analysis summary and targeted comments, so be thorough and insightful here.`;

  const userMessage = `Please provide your comprehensive thinking process for analyzing this document:

**Title:** ${document.title}
**Author:** ${document.author}
**Published:** ${new Date(document.publishedDate).toLocaleDateString()}

**Content:**
${document.content}

Conduct your thorough analysis and thinking process now.`;

  return { systemMessage, userMessage };
}