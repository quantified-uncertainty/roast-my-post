/**
 * Spelling and Grammar Analysis workflow for document analysis
 *
 * This workflow uses only the spelling/grammar plugin for focused language analysis.
 * It's used when agentInfo.extendedCapabilityId === "spelling-grammar"
 */

import { aiCommentsToDbComments } from "../typeAdapters";
import type { Agent, Comment as AiComment, Document } from "@roast/ai";
import { PluginType } from "@roast/ai/analysis-plugins/types/plugin-types";
import { PluginManager } from "@roast/ai/server";

import { logger } from '../../../utils/logger';
import type { TaskResult } from "../shared/types";

export async function analyzeSpellingGrammar(
  document: Document,
  agentInfo: Agent,
  options: {
    targetHighlights?: number;
    jobId?: string;
  } = {}
): Promise<{
  thinking: string;
  analysis: string;
  summary: string;
  grade?: number;
  highlights: AiComment[];
  tasks: TaskResult[];
  jobLogString?: string;
}> {
  logger.info(`Starting spelling/grammar analysis for agent ${agentInfo.name}`);

  // Create plugin manager with only the spelling plugin
  const manager = new PluginManager({
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
  // Filter AI comments and convert to database comments
  const validAiComments = result.highlights.filter(
    (h): h is AiComment =>
      !!(
        h.description &&
        h.highlight &&
        typeof h.highlight?.isValid === "boolean"
      )
  );

  return {
    thinking: result.thinking,
    analysis: result.analysis,
    summary: result.summary,
    grade: result.grade,
    highlights: aiCommentsToDbComments(validAiComments) as any,
    tasks: result.tasks,
    jobLogString: result.jobLogString,
  };
}
