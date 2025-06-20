import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";
import type { ThinkingOutputs } from "../shared/types";

export function getAnalysisPrompts(
  agentInfo: Agent,
  document: Document,
  thinkingData: ThinkingOutputs,
  targetWordCount: number
): { systemMessage: string; userMessage: string } {
  const systemMessage = `You are ${agentInfo.name}, ${agentInfo.description}.

${agentInfo.genericInstructions}

Your task is to create a concise analysis and summary based on comprehensive thinking that has already been completed.

You should distill the key insights from the thinking into a well-formatted analysis (approximately ${targetWordCount} words) and a brief summary. Do NOT repeat the entire thinking process - instead, extract and present the most important findings, conclusions, and insights in a structured format.

Use heavy markdown formatting with headers, bullet points, emphasis, etc. to make your analysis clear and readable.`;

  const userMessage = `Based on the comprehensive thinking process below, please provide a concise analysis and summary for this document:

**Document Information:**
- **Title:** ${document.title}
- **Author:** ${document.author}
- **Published:** ${new Date(document.publishedDate).toLocaleDateString()}

**Comprehensive Thinking Process:**
${thinkingData.thinking}

Now distill this thinking into a structured analysis and brief summary.`;

  return { systemMessage, userMessage };
}