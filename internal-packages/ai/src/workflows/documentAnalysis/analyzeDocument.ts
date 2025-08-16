import { logger } from "../../utils/logger";
import type { Document } from "../../types/documents";
import type { Agent } from "../../types/agentSchema";
import type { Comment } from "../../shared/types";
import { analyzeDocumentUnified } from "./unified";
import { PluginType } from "../../analysis-plugins/types/plugin-types";
import type { TaskResult } from "./shared/types";

export async function analyzeDocument(
  document: Document,
  agentInfo: Agent,
  targetWordCount: number = 500,
  targetHighlights: number = 5,
  jobId?: string
): Promise<{
  thinking: string;
  analysis: string;
  summary: string;
  grade?: number;
  selfCritique?: string;
  highlights: Comment[];
  tasks: TaskResult[];
  jobLogString?: string; // Include job log string for Job.logs field
}> {
  // Validate that all plugin IDs are valid PluginType entries
  const validPlugins = (agentInfo.pluginIds || []).filter((p): p is PluginType =>
    Object.values(PluginType).includes(p as PluginType)
  );
  
  // Log warning if any invalid plugins were filtered out
  const invalidPlugins = (agentInfo.pluginIds || []).filter(p => !validPlugins.includes(p));
  if (invalidPlugins.length > 0) {
    logger.warn(`Filtered out invalid plugin IDs for agent ${agentInfo.name}: ${invalidPlugins.join(', ')}`);
  }
  
  // Require at least one valid plugin
  if (validPlugins.length === 0) {
    throw new Error(`Agent ${agentInfo.name} has no valid plugins. Please configure at least one plugin from: ${Object.values(PluginType).join(', ')}`);
  }
  
  // Sanitize plugin list for safe logging (limit length to prevent log injection)
  const pluginListForLog = validPlugins
    .map(String)
    .join(', ')
    .slice(0, 500);
  logger.info(`Using plugin-based workflow for agent ${agentInfo.name} with plugins: ${pluginListForLog}`);
  
  return await analyzeDocumentUnified(document, agentInfo, {
    targetHighlights,
    jobId,
    plugins: {
      include: validPlugins
    }
  });
}
