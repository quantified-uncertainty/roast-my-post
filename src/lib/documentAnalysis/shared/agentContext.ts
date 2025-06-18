import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";

function getPurposeDescription(purpose: string): string {
  switch (purpose) {
    case "ASSESSOR":
      return "You are an Assessor. This means you evaluate and judge content based on specific criteria, providing critical assessment and grades.";
    case "ADVISOR":
      return "You are an Advisor. This means you provide recommendations, guidance, and actionable suggestions to improve or address issues in the content.";
    case "ENRICHER":
      return "You are an Enricher. This means you add context, connections, and deeper insights to enhance understanding of the content.";
    case "EXPLAINER":
      return "You are an Explainer. This means you clarify complex concepts, break down difficult ideas, and make content more accessible.";
    default:
      return "You are analyzing this document from your specialized perspective.";
  }
}

export function shouldIncludeGrade(agentInfo: Agent): boolean {
  return !!agentInfo.gradeInstructions;
}

export function getAgentContextXML(agentInfo: Agent): string {
  return `<agent>
  <name>${agentInfo.name}</name>
  <expertise>${agentInfo.purpose}</expertise>
  <purpose>${agentInfo.description}</purpose>
  <general_instructions>${agentInfo.genericInstructions}</general_instructions>
  <summary_instructions>${agentInfo.summaryInstructions}</summary_instructions>
  <analysis_instructions>${agentInfo.analysisInstructions}</analysis_instructions>
  <comment_instructions>${agentInfo.commentInstructions}</comment_instructions>
  ${shouldIncludeGrade(agentInfo) ? `<grade_instructions>${agentInfo.gradeInstructions}</grade_instructions>` : ""}
</agent>`;
}

export function getTaskPurposeXML(agentInfo: Agent): string {
  return `<purpose>
  ${getPurposeDescription(agentInfo.purpose)}
</purpose>`;
}

export function getDocumentMetadataXML(document: Document): string {
  return `<document_metadata>
  <title>${document.title || "Untitled"}</title>
  <author>${document.author || "Unknown"}</author>
  <published_date>${document.publishedDate || "Unknown"}</published_date>
  <source_url>${document.url || "Not available"}</source_url>
</document_metadata>`;
}
