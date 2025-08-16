/**
 * Link Analysis workflow - now using unified approach
 */

import type { Agent, Comment as AiComment, Document } from "@roast/ai";
import { analyzeDocumentUnified, WORKFLOW_PRESETS } from "../unified";
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
  return analyzeDocumentUnified(document, agentInfo, {
    targetHighlights,
    plugins: WORKFLOW_PRESETS.LINK_ANALYSIS,
  });
}
