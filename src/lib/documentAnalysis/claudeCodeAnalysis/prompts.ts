import type { Document } from "../../../types/documents";
import type { Agent } from "../../../types/agentSchema";

export function buildSystemPrompt(agent: Agent): string {
  return `You are an AI document analysis assistant. Your goal is to provide a thorough, multi-step analysis of the provided document.

IMPORTANT: This is NOT a coding task. You should NOT use any tools like Bash, Read, Write, etc. This is purely a document analysis task.

${agent.primaryInstructions || ""}

Analysis Structure:
1. First, read and summarize the document's main thesis and structure
2. Identify key arguments, claims, and evidence
3. Evaluate the logical coherence and potential weaknesses
4. Generate specific comments with exact quotes
5. Provide an overall grade if applicable

For each comment, include:
- The exact quote from the document
- The line number or section
- Your specific feedback or concern
- Suggestions for improvement

Continue your analysis across multiple responses to ensure thoroughness.`;
}

export function buildInitialPrompt(document: Document, agent: Agent): string {
  const documentContent = document.content || "";
  const title = document.title || "Untitled Document";
  
  return `Please analyze the following document titled "${title}":

---
${documentContent}
---

Begin your analysis by first understanding the document's main purpose and structure. In subsequent turns, we'll dive deeper into specific aspects.`;
}

export function buildContinuationPrompt(turnNumber: number): string {
  const prompts = [
    "Now, let's identify the key arguments or claims made in the document. What evidence supports them?",
    "Please examine the document's logical structure and coherence. Are there any gaps or inconsistencies?",
    "Let's focus on specific areas that could be improved. What constructive feedback would you provide?",
    "Based on your analysis so far, what are the most important insights or takeaways?",
    "Now, please generate specific comments with exact quotes and line references for the key issues you've identified.",
  ];

  if (turnNumber - 1 < prompts.length) {
    return prompts[turnNumber - 1];
  }

  return "Please continue your analysis, focusing on any aspects we haven't covered yet.";
}

export function buildFinalPrompt(): string {
  return `Based on your complete analysis, please provide:

1. A comprehensive summary of your findings (2-3 paragraphs)
2. A structured analysis with key points
3. An overall grade (if applicable) on a scale of 0-100
4. A final list of specific comments with exact quotes and locations

Format your response as a complete evaluation that could stand alone.`;
}