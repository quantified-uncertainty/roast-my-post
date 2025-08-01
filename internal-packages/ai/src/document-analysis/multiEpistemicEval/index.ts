/**
 * Multi-Epistemic Evaluation workflow for document analysis
 * 
 * This is now a simple wrapper around the plugin system.
 * The main logic has been moved to PluginManager.analyzeDocument()
 */

import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";
import type { Comment } from "../../../types/documentSchema";
import type { HeliconeSessionConfig } from "@roast/ai";
import { PluginManager, type FullDocumentAnalysisResult } from "../../analysis-plugins/PluginManager";
import { PluginType } from "../../analysis-plugins/types/plugin-types";
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
    sessionConfig: options.sessionConfig,
    jobId: options.jobId,
    pluginSelection: {
      exclude: [PluginType.SPELLING],
    },
  });

  // Delegate to plugin system
  const result = await manager.analyzeDocument(document, {
    targetHighlights: options.targetHighlights,
  });

  return {
    thinking: result.thinking,
    analysis: result.analysis,
    summary: result.summary,
    grade: result.grade,
    highlights: result.highlights,
    tasks: result.tasks, // TaskResult interface is compatible
    jobLogString: result.jobLogString, // Include centralized plugin logs
  };
}

