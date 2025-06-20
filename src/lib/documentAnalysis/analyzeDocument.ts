import type { Agent } from "../../types/agentSchema";
import type { Document } from "../../types/documents";
import type { Comment } from "../../types/documentSchema";
import { generateAnalysis } from "./analysis";
import { getCommentData } from "./commentGeneration";
import { analyzeLinkDocument } from "./linkAnalysis/linkAnalysisWorkflow";
import type { TaskResult } from "./shared/types";
import { generateThinking } from "./thinking";

export async function analyzeDocument(
  document: Document,
  agentInfo: Agent,
  targetWordCount: number = 500,
  targetComments: number = 5,
  anthropicApiKey?: string
): Promise<{
  thinking: string;
  analysis: string;
  summary: string;
  grade?: number;
  comments: Comment[];
  tasks: TaskResult[];
}> {
  // Choose workflow based on agent's extended capability
  if (agentInfo.extendedCapabilityId === "simple-link-verifier") {
    console.log(`🔗 Using link analysis workflow for agent ${agentInfo.name}`);
    return await analyzeLinkDocument(
      document,
      agentInfo,
      anthropicApiKey || process.env.ANTHROPIC_API_KEY!,
      targetComments
    );
  }

  console.log(`📝 Using standard analysis workflow for agent ${agentInfo.name}`);

  // Standard workflow
  const tasks: TaskResult[] = [];

  // Step 1: Generate comprehensive thinking
  const thinkingResult = await generateThinking(document, agentInfo);
  tasks.push(thinkingResult.task);

  // Step 2: Generate analysis based on thinking
  const analysisResult = await generateAnalysis(
    document,
    agentInfo,
    thinkingResult.outputs,
    targetWordCount
  );
  tasks.push(analysisResult.task);

  // Step 3: Generate comments based on thinking
  const commentResult = await getCommentData(
    document,
    agentInfo,
    thinkingResult.outputs,
    targetComments
  );
  tasks.push(commentResult.task);

  return {
    thinking: thinkingResult.outputs.thinking,
    analysis: analysisResult.outputs.analysis,
    summary: analysisResult.outputs.summary,
    grade: analysisResult.outputs.grade,
    comments: commentResult.outputs.comments,
    tasks,
  };
}
