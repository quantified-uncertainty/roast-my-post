import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";

export function shouldIncludeGrade(agentInfo: Agent): boolean {
  return !!agentInfo.gradeInstructions;
}

export function getAgentContextXML(agentInfo: Agent): string {
  return `<agent>
  <name>${agentInfo.name}</name>
  <description>${agentInfo.description}</description>
  ${agentInfo.genericInstructions ? `<general_instructions>${agentInfo.genericInstructions}</general_instructions>` : ""}
  ${agentInfo.summaryInstructions ? `<summary_instructions>${agentInfo.summaryInstructions}</summary_instructions>` : ""}
  ${agentInfo.analysisInstructions ? `<analysis_instructions>${agentInfo.analysisInstructions}</analysis_instructions>` : ""}
  ${agentInfo.commentInstructions ? `<comment_instructions>${agentInfo.commentInstructions}</comment_instructions>` : ""}
  ${shouldIncludeGrade(agentInfo) ? `<grade_instructions>${agentInfo.gradeInstructions}</grade_instructions>` : ""}
</agent>`;
}

export function getDocumentMetadataXML(document: Document): string {
  return `<document_metadata>
  <title>${document.title || "Untitled"}</title>
  <author>${document.author || "Unknown"}</author>
  <published_date>${document.publishedDate || "Unknown"}</published_date>
  <source_url>${document.url || "Not available"}</source_url>
</document_metadata>`;
}
