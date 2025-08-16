/**
 * Spelling and Grammar Analysis workflow - now using unified approach
 */

import type { Agent, Comment as AiComment, Document } from "@roast/ai";
import { analyzeDocumentUnified, WORKFLOW_PRESETS } from "../unified";
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
  return analyzeDocumentUnified(document, agentInfo, {
    targetHighlights: options.targetHighlights,
    jobId: options.jobId,
    plugins: WORKFLOW_PRESETS.SPELLING_GRAMMAR,
  });
}