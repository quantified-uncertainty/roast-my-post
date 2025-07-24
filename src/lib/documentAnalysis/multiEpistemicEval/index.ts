/**
 * Multi-Epistemic Evaluation workflow for document analysis
 * 
 * This is now a simple wrapper around the plugin system.
 * The main logic has been moved to PluginManager.analyzeDocument()
 */

import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";
import type { Comment } from "../../../types/documentSchema";
import type { HeliconeSessionConfig } from "../../helicone/sessions";
import { PluginManager, type FullDocumentAnalysisResult } from "../../analysis-plugins";
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
  // Create plugin manager with session config and job ID for logging
  const manager = new PluginManager({
    sessionConfig: options.sessionConfig,
    jobId: options.jobId,
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

