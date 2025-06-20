import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";

export function getLinkAnalysisPrompts(
  agentInfo: Agent,
  document: Document,
  urls: string[]
): { systemMessage: string; userMessage: string } {
  const systemMessage = `You are ${agentInfo.name}, ${agentInfo.description}.

${agentInfo.genericInstructions}

Your task is to analyze the links found in this document, determine which ones should be validated, and describe what content is expected from each relevant link.

For each numbered link, you should:
1. First determine if this URL should be validated (shouldAnalyze: true/false)
2. URLs should NOT be validated if they are examples, placeholders, hypothetical scenarios, templates, or fictional references
3. URLs SHOULD be validated if they are actual citations, references, or links readers are expected to visit
4. If shouldAnalyze is true, write 20-200 words describing what you expect to find when following that link
5. Be specific about the expected content, purpose, and relevance

Focus on understanding the author's intent and whether each link is meant to be a real, working reference.`;

  const userMessage = `Please analyze the links found in this document:

**Document Title:** ${document.title}
**Author:** ${document.author}

**Document Content:**
${document.content}

**Links Found (numbered for reference):**
${urls.map((url, index) => `${index + 1}. ${url}`).join('\n')}

For each numbered link above, provide your analysis in this exact format:

## Link X - [Title/Description]
**URL:** [exact URL from list]
**shouldAnalyze:** true/false
**Expected Content:** [20-200 words describing what you expect to find, only if shouldAnalyze is true]

Consider:
- Is this a real citation/reference that should work, or an example/placeholder?
- What type of content should be there (research paper, news article, documentation, etc.)?
- How does it relate to the surrounding text?
- What would make this link valuable and appropriate for the document?

Only provide expected content analysis for URLs where shouldAnalyze is true.`;

  return { systemMessage, userMessage };
}