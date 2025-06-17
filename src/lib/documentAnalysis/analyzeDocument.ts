import type { Agent } from "../../types/agentSchema";
import type { Document } from "../../types/documents";
import type { Comment } from "../../types/documentSchema";
import { getCommentData } from "./commentGeneration";
import { generateThinkingAndSummary } from "./thinkingAndSummary";
import type { TaskResult, ThinkingAnalysisOutputs, CommentAnalysisOutputs } from "./shared/types";

export async function analyzeDocument(
  document: Document,
  agentInfo: Agent,
  targetWordCount: number = 500,
  targetComments: number = 5
): Promise<{
  thinking: string;
  analysis: string;
  summary: string;
  grade?: number;
  comments: Comment[];
  tasks: TaskResult[];
}> {
  const tasks: TaskResult[] = [];

  // Generate thinking, analysis, and summary
  const thinkingResult = await generateThinkingAndSummary(
    document,
    targetWordCount,
    agentInfo
  );
  tasks.push(thinkingResult.task);

  // Generate comments
  const commentResult = await getCommentData(
    document,
    agentInfo,
    targetComments
  );
  tasks.push(commentResult.task);

  return {
    thinking: thinkingResult.outputs.thinking,
    analysis: thinkingResult.outputs.analysis,
    summary: thinkingResult.outputs.summary,
    grade: thinkingResult.outputs.grade,
    comments: commentResult.outputs.comments,
    tasks,
  };
}
