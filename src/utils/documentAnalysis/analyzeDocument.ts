import { Agent } from "../../types/agentSchema";
import { Document } from "../../types/documents";
import { AnalysisResult } from "../../types/documentSchema";
import { ANALYSIS_MODEL } from "../../types/openai";
import { getCommentData } from "./llmCalls/commentGenerator";
import { generateThinkingAndSummary } from "./llmCalls/thinkingAndSummaryGenerator";
import {
  calculateTargetComments,
  calculateTargetWordCount,
} from "./utils/calculations";

interface AnalyzeDocumentResult {
  review: AnalysisResult;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  llmResponse?: string;
  finalPrompt?: string;
  agentContext?: string;
  tasks: TaskResult[];
}

interface TaskResult {
  name: string;
  modelName: string;
  priceInCents: number;
  timeInSeconds: number;
  log: string;
}

export async function analyzeDocument(
  document: Document,
  agent: Agent
): Promise<AnalyzeDocumentResult> {
  const tasks: TaskResult[] = [];

  // Calculate target word count
  const targetComments = calculateTargetComments(document.content);
  const targetWordCount = calculateTargetWordCount(document.content);

  // Task 1: Generate thinking and summary
  const thinkingStartTime = Date.now();
  const thinkingResult = await generateThinkingAndSummary(
    document,
    targetWordCount,
    agent
  );
  const thinkingEndTime = Date.now();
  const thinkingTimeInSeconds = Math.round(
    (thinkingEndTime - thinkingStartTime) / 1000
  );

  // Estimate cost for thinking task (rough approximation)
  const thinkingCost = Math.round(thinkingResult.llmMessages.length * 0.001);

  const thinkingLogDetails = {
    taskName: "generateThinkingAndSummary",
    model: ANALYSIS_MODEL,
    startTime: new Date(thinkingStartTime).toISOString(),
    endTime: new Date(thinkingEndTime).toISOString(),
    durationSeconds: thinkingTimeInSeconds,
    estimatedCostCents: thinkingCost,
    input: {
      prompt: thinkingResult.llmMessages,
      targetWordCount: targetWordCount,
      agentName: agent.name,
      documentLength: document.content.length,
    },
    output: {
      thinking: thinkingResult.thinking,
      analysis: thinkingResult.analysis,
      summary: thinkingResult.summary,
      grade: thinkingResult.grade,
    },
    summary: `Generated thinking, analysis, and summary with grade ${thinkingResult.grade || "N/A"}`,
  };

  tasks.push({
    name: "generateThinkingAndSummary",
    modelName: ANALYSIS_MODEL,
    priceInCents: thinkingCost,
    timeInSeconds: thinkingTimeInSeconds,
    log: JSON.stringify(thinkingLogDetails, null, 2),
  });

  // Task 2: Get comments
  const commentsStartTime = Date.now();
  console.log(
    `\n📝 Starting comment generation for document with ${document.content.length} characters...`
  );
  console.log(`🎯 Target: ${targetComments} comments`);
  console.log(`🤖 Using agent: ${agent.name}`);

  const commentsResult = await getCommentData(document, agent, targetComments);
  const commentsEndTime = Date.now();
  const commentsTimeInSeconds = Math.round(
    (commentsEndTime - commentsStartTime) / 1000
  );

  // Estimate cost for comments task (rough approximation)
  const commentsCost = Math.round(commentsResult.comments.length * 10); // Approximate cost per comment

  console.log(`\n✅ Comment generation completed:`);
  console.log(`   ⏱️  Time: ${commentsTimeInSeconds} seconds`);
  console.log(`   💰 Estimated cost: ${commentsCost} cents`);
  console.log(`   📊 Comments generated: ${commentsResult.comments.length}`);
  console.log(`   🔄 Total attempts: ${commentsResult.llmInteractions.length}`);

  const commentsLogDetails = {
    taskName: "getCommentData",
    model: ANALYSIS_MODEL,
    startTime: new Date(commentsStartTime).toISOString(),
    endTime: new Date(commentsEndTime).toISOString(),
    durationSeconds: commentsTimeInSeconds,
    estimatedCostCents: commentsCost,
    input: {
      targetComments: targetComments,
      agentName: agent.name,
      documentLength: document.content.length,
      maxAttempts: 3,
    },
    output: {
      totalCommentsGenerated: commentsResult.comments.length,
      targetComments: targetComments,
      commentsAchieved: commentsResult.comments.length,
      successRate: `${Math.round((commentsResult.comments.length / targetComments) * 100)}%`,
    },
    llmInteractions: commentsResult.llmInteractions,
    summary: `Generated ${commentsResult.comments.length} comments out of ${targetComments} target comments across ${commentsResult.llmInteractions.length} LLM attempts`,
  };

  tasks.push({
    name: "getCommentData",
    modelName: ANALYSIS_MODEL,
    priceInCents: commentsCost,
    timeInSeconds: commentsTimeInSeconds,
    log: JSON.stringify(commentsLogDetails, null, 2),
  });

  const totalCostInCents = tasks.reduce(
    (sum, task) => sum + task.priceInCents,
    0
  );

  const documentReview: AnalysisResult = {
    agentId: agent.id,
    createdAt: new Date(),
    costInCents: totalCostInCents,
    thinking: thinkingResult.thinking,
    analysis: thinkingResult.analysis,
    summary: thinkingResult.summary,
    grade: thinkingResult.grade ?? undefined,
    comments: commentsResult.comments,
  };

  // Usage information would come from thinkingResult and comments generation
  // For now, we'll mock it up with approximate values
  const usage = {
    prompt_tokens: 0, // Would be filled from API responses
    completion_tokens: 0, // Would be filled from API responses
    total_tokens: 0, // Would be filled from API responses
  };

  return {
    review: documentReview,
    usage,
    llmResponse: JSON.stringify(documentReview), // This is a simplification
    finalPrompt: thinkingResult.llmMessages,
    agentContext: JSON.stringify(agent), // This is a simplification
    tasks,
  };
}
