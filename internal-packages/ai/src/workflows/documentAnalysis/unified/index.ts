/**
 * Unified Document Analysis Workflow
 * 
 * A single, flexible workflow that can be configured with different plugin selections.
 * This replaces the need for separate workflow implementations.
 */

import { aiCommentsToDbComments } from "../typeAdapters";
import type { Agent, Comment as AiComment, Document } from "@roast/ai";
import { PluginType } from "@roast/ai/analysis-plugins/types/plugin-types";
import { PluginManager } from "@roast/ai/server";
import type { TaskResult } from "../shared/types";

export interface UnifiedAnalysisOptions {
  targetHighlights?: number;
  jobId?: string;
  plugins?: {
    include?: PluginType[];
    exclude?: PluginType[];
  };
}

export async function analyzeDocumentUnified(
  document: Document,
  agentInfo: Agent,
  options: UnifiedAnalysisOptions = {}
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
  // Create plugin manager with specified plugin selection
  const manager = new PluginManager({
    jobId: options.jobId,
    pluginSelection: options.plugins,
  });

  // Delegate to plugin system
  const result = await manager.analyzeDocument(document.content, {
    targetHighlights: options.targetHighlights,
  });

  // Filter and convert comments as needed
  const validAiComments = result.highlights.filter(
    (h): h is AiComment =>
      !!(h.description && h.highlight && typeof h.highlight?.isValid === "boolean")
  );

  return {
    thinking: result.thinking,
    analysis: result.analysis,
    summary: result.summary,
    grade: result.grade,
    selfCritique: undefined, // Most plugins don't generate self-critique
    highlights: aiCommentsToDbComments(validAiComments) as any,
    tasks: result.tasks,
    jobLogString: result.jobLogString,
  };
}

// Preset configurations for common use cases
export const WORKFLOW_PRESETS = {
  LINK_ANALYSIS: {
    include: [PluginType.LINK_ANALYSIS],
  },
  SPELLING_GRAMMAR: {
    include: [PluginType.SPELLING],
  },
  MULTI_EPISTEMIC: {
    exclude: [PluginType.SPELLING],
  },
  MATH_ANALYSIS: {
    include: [PluginType.MATH],
  },
  FACT_CHECK: {
    include: [PluginType.FACT_CHECK],
  },
  COMPREHENSIVE: {
    // Use all plugins (default behavior when no selection specified)
  },
} as const;