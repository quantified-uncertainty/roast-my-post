/**
 * Link Analysis workflow for document analysis
 *
 * This is now a simple wrapper around the plugin system.
 * It's used when agentInfo.extendedCapabilityId === "simple-link-verifier"
 */

import type {
  Agent,
  Comment as AiComment,
  Document,
} from "@roast/ai";
import { PluginType } from "@roast/ai/analysis-plugins/types/plugin-types";
import { PluginManager } from "@roast/ai/server";

import type { TaskResult } from "../shared/types";

export async function analyzeLinkDocument(
  document: Document,
  agentInfo: Agent,
  targetHighlights: number = 50
): Promise<{
  thinking: string;
  analysis: string;
  summary: string;
  grade?: number;
  selfCritique?: string;
  highlights: AiComment[];
  tasks: TaskResult[];
  jobLogString?: string;
}> {
  // Create plugin manager with only link analysis plugin
  const manager = new PluginManager({
    pluginSelection: {
      include: [PluginType.LINK_ANALYSIS], // Only use link analysis plugin
    },
  });

  // Delegate to plugin system
  const result = await manager.analyzeDocument(document.content, {
    targetHighlights,
  });


  // The highlights from the plugin are already valid Comment objects
  // Just pass them through directly since the plugin handles all validation
  return {
    thinking: result.thinking,
    analysis: result.analysis,
    summary: result.summary,
    grade: result.grade,
    selfCritique: undefined, // Link analysis doesn't generate self-critique
    highlights: result.highlights as AiComment[],
    tasks: result.tasks,
    jobLogString: result.jobLogString,
  };
}
