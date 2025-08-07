import * as yaml from "js-yaml";
import { logger } from "@/infrastructure/logging/logger";

import type { Agent } from "@roast/ai";
import { formatRelativeTime, formatDateTime } from "@/shared/utils/dateUtils";

import type { ExportType } from "./types";

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

export const formatDateWithTime = (dateString: string) => {
  return formatDateTime(dateString);
};

export const formatRelativeDate = (dateString: string) => {
  return formatRelativeTime(dateString);
};

export const getStatusBadgeClass = (status?: string) => {
  if (!status) return null;

  const statusMap = {
    COMPLETED: "bg-green-100 text-green-800",
    RUNNING: "bg-yellow-100 text-yellow-800",
    PENDING: "bg-blue-100 text-blue-800",
    FAILED: "bg-red-100 text-red-800",
  };

  return (
    statusMap[status as keyof typeof statusMap] || "bg-gray-100 text-gray-800"
  );
};

export const getStatusIconType = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return "check-circle";
    case "FAILED":
      return "x-circle";
    case "RUNNING":
      return "play";
    case "PENDING":
      return "clock";
    default:
      return "clock";
  }
};

export const formatDuration = (durationInSeconds?: number | null) => {
  if (!durationInSeconds) return "—";
  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = durationInSeconds % 60;
  return `${minutes}m ${seconds}s`;
};

export const formatCost = (costInCents?: number | null) => {
  if (!costInCents) return "—";
  return `$${(costInCents / 100).toFixed(3)}`;
};

export const exportAgentAsJson = async (
  agent: Agent,
  setExportType: (type: ExportType) => void,
  setCopySuccess: (success: boolean) => void
) => {
  const agentData = {
    id: agent.id,
    name: agent.name,
    version: agent.version,
    description: agent.description,
    primaryInstructions: agent.primaryInstructions,
    selfCritiqueInstructions: agent.selfCritiqueInstructions,
    extendedCapabilityId: agent.extendedCapabilityId,
    owner: agent.owner,
    exportedAt: new Date().toISOString(),
  };

  const jsonString = JSON.stringify(agentData, null, 2);

  try {
    await navigator.clipboard.writeText(jsonString);
    setExportType("JSON");
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  } catch (err) {
    logger.error('Failed to copy to clipboard:', err);
  }
};

export const exportAgentAsMarkdown = async (
  agent: Agent,
  setExportType: (type: ExportType) => void,
  setCopySuccess: (success: boolean) => void
) => {
  const exportDate = new Date().toISOString();

  let markdown = `---
id: ${agent.id}
name: "${agent.name}"
version: ${agent.version}
owner: ${agent.owner?.name || "Unknown"}
created: ${exportDate}
extended_capability: ${agent.extendedCapabilityId || "none"}
---

# ${agent.name}

**Version:** ${agent.version}  
**Owner:** ${agent.owner?.name || "Unknown"}`;

  if (agent.extendedCapabilityId) {
    markdown += `  
**Extended Capability:** ${agent.extendedCapabilityId}`;
  }

  markdown += `

## Description

${agent.description}`;

  if (agent.primaryInstructions) {
    markdown += `

## Instructions

${agent.primaryInstructions}`;
  }

  if (agent.selfCritiqueInstructions) {
    markdown += `

## Self-Critique Instructions

${agent.selfCritiqueInstructions}`;
  }

  markdown += `

---
*Exported from RoastMyPost on ${new Date(exportDate).toLocaleString()}*`;

  try {
    await navigator.clipboard.writeText(markdown);
    setExportType("Markdown");
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  } catch (err) {
    logger.error('Failed to copy to clipboard:', err);
  }
};

export const exportAgentAsYaml = async (
  agent: Agent,
  setExportType: (type: ExportType) => void,
  setCopySuccess: (success: boolean) => void
) => {
  const agentData = {
    id: agent.id,
    name: agent.name,
    version: agent.version,
    description: agent.description,
    primaryInstructions: agent.primaryInstructions,
    selfCritiqueInstructions: agent.selfCritiqueInstructions,
    extendedCapabilityId: agent.extendedCapabilityId,
    owner: {
      id: agent.owner?.id,
      name: agent.owner?.name,
    },
    exportedAt: new Date().toISOString(),
  };

  // Remove null/undefined values to clean up the YAML
  const cleanData = Object.fromEntries(
    Object.entries(agentData).filter(
      ([_, value]) => value !== null && value !== undefined
    )
  );

  try {
    const yamlString = yaml.dump(cleanData, {
      indent: 2,
      lineWidth: 80,
      noRefs: true,
    });

    await navigator.clipboard.writeText(yamlString);
    setExportType("YAML");
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  } catch (err) {
    logger.error('Failed to copy to clipboard:', err);
  }
};
