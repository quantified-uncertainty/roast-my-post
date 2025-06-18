import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";
import {
  getAgentContextXML,
  getDocumentMetadataXML,
  getTaskPurposeXML,
  shouldIncludeGrade,
} from "../shared/agentContext";

export function agentContextSection(agentInfo: Agent): string {
  return `${getAgentContextXML(agentInfo)}

<task_instructions>
  ${getTaskPurposeXML(agentInfo)}
  <output_format>
    <thinking>
      Provide a comprehensive, detailed thinking process (400-600 words). Use this as your analytical scratchpad. Use markdown formatting with headers, bullet points, emphasis, etc.
    </thinking>
    <analysis>
      Provide a analysis (300-500 words) based on your agent expertise. Use markdown formatting with headers, bullet points, emphasis, etc.
    </analysis>
    <summary>
      Provide a concise 1-2 sentence summary.
    </summary>
    ${
      shouldIncludeGrade(agentInfo)
        ? `<grade>
      Provide a numerical grade from 0-100.
    </grade>`
        : ""
    }
  </output_format>
</task_instructions>
`;
}

export function getThinkingAnalysisSummaryPrompts(
  agentInfo: Agent,
  targetWordCount: number,
  document: Document
): { systemMessage: string; userMessage: string } {
  const systemMessage = agentContextSection(agentInfo);

  const userMessage = `
Analyze the following document according to your agent instructions:

<document>
  ${getDocumentMetadataXML(document)}
  <content>
${document.content}
  </content>
</document>
`;

  return { systemMessage, userMessage };
}
