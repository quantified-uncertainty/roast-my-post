/**
 * Spelling and Grammar Analysis workflow for document analysis
 * 
 * This workflow uses only the spelling/grammar plugin for focused language analysis.
 * It's used when agentInfo.extendedCapabilityId === "spelling-grammar"
 */

import type { Agent } from "@roast/ai";
import type { Document } from "@roast/ai";
import type { Comment } from "@/types/databaseTypes";
import type { HeliconeSessionConfig } from "@roast/ai";
import { PluginManager } from "@roast/ai";
import { PluginType } from "@roast/ai/analysis-plugins/types/plugin-types";
import type { TaskResult } from "../shared/types";
import { logger } from "../../logger";

export async function analyzeSpellingGrammar(
  document: Document,
  agentInfo: Agent,
  options: {
    targetHighlights?: number;
    sessionConfig?: HeliconeSessionConfig;
    jobId?: string;
  } = {}
): Promise<{
  thinking: string;
  analysis: string;
  summary: string;
  grade?: number;
  highlights: Comment[];
  tasks: TaskResult[];
  jobLogString?: string;
}> {
  logger.info(`Starting spelling/grammar analysis for agent ${agentInfo.name}`);
  
  // Create plugin manager with only the spelling plugin
  const manager = new PluginManager({
    sessionConfig: options.sessionConfig,
    jobId: options.jobId,
    pluginSelection: {
      include: [PluginType.SPELLING], // Only use spelling/grammar plugin
    },
  });

  // Delegate to plugin system
  const result = await manager.analyzeDocument(document.content, {
    targetHighlights: options.targetHighlights,
  });

  // The spelling plugin provides a grade, so we can include it
  return {
    thinking: result.thinking,
    analysis: result.analysis,
    summary: result.summary,
    grade: result.grade,
    highlights: result.highlights.filter((h): h is Comment => 
      !!(h.description && h.highlight && typeof h.isValid === 'boolean')
    ),
    tasks: result.tasks,
    jobLogString: result.jobLogString,
  };
}