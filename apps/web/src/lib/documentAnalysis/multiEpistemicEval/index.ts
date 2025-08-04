/**
 * Multi-Epistemic Evaluation workflow for document analysis
 * 
 * This is now a simple wrapper around the plugin system.
 * The main logic has been moved to PluginManager.analyzeDocument()
 */

import type { Agent } from "@roast/ai";
import type { Document } from "@roast/ai";
import type { Comment as AiComment } from "@roast/ai";
import type { Comment as DbComment } from "@/types/databaseTypes";
import type { HeliconeSessionConfig } from "@roast/ai";
import { aiCommentsToDbComments } from "@/lib/typeAdapters";
import { PluginManager } from "@roast/ai/server";
import { PluginType } from "@roast/ai/analysis-plugins/types/plugin-types";
import type { TaskResult } from "../shared/types";

export async function analyzeWithMultiEpistemicEval(
  document: Document,
  agentInfo: Agent,
  options: {
    targetHighlights?: number;
    sessionConfig?: HeliconeSessionConfig;
    jobId?: string; // For logging integration
  } = {}
): Promise<{
  thinking: string;
  analysis: string;
  summary: string;
  grade?: number;
  highlights: Comment[];
  tasks: TaskResult[];
  jobLogString?: string; // Include job log string in results
}> {
  // Create plugin manager with default plugin selection for multi-epistemic eval
  // By default, exclude spelling plugin for multi-epistemic eval
  const manager = new PluginManager({
    // Session tracking is now handled globally via setGlobalSessionManager
    jobId: options.jobId,
    pluginSelection: {
      exclude: [PluginType.SPELLING],
    },
  });

  // Delegate to plugin system
  const result = await manager.analyzeDocument(document.content, {
    targetHighlights: options.targetHighlights,
  });

  // Filter AI comments and convert to database comments
  const validAiComments = result.highlights.filter((h): h is AiComment => 
    !!(h.description && h.highlight && typeof h.highlight?.isValid === 'boolean')
  );

  return {
    thinking: result.thinking,
    analysis: result.analysis,
    summary: result.summary,
    grade: result.grade,
    highlights: aiCommentsToDbComments(validAiComments) as any,
    tasks: result.tasks, // TaskResult interface is compatible
    jobLogString: result.jobLogString, // Include centralized plugin logs
  };
}

