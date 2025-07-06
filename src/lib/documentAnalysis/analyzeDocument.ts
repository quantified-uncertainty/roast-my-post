import type { Agent } from "../../types/agentSchema";
import { logger } from "@/lib/logger";
import type { Document } from "../../types/documents";
import type { Comment } from "../../types/documentSchema";
import { extractCommentsFromAnalysis } from "./commentExtraction";
import { generateComprehensiveAnalysis } from "./comprehensiveAnalysis";
import { analyzeLinkDocument } from "./linkAnalysis/linkAnalysisWorkflow";
import { generateSelfCritique } from "./selfCritique";
import type { TaskResult } from "./shared/types";
import { analyzeWithClaudeCode } from "./claudeCodeAnalysis";
import { analyzeWithMultiTurn } from "./multiTurnAnalysis";

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
  selfCritique?: string;
  comments: Comment[];
  tasks: TaskResult[];
}> {
  // Use the new multi-turn approach instead of Claude Code
  const useMultiTurn = true;
  
  // Check if we should use multi-turn analysis
  if (useMultiTurn) {
    logger.info(`Using multi-turn analysis for agent ${agentInfo.name}`);
    
    const result = await analyzeWithMultiTurn(document, agentInfo, {
      budget: (agentInfo as any).claudeCodeBudget || 0.10,
      maxTurns: 5,
      verbose: true,
    });

    // Convert to standard format
    return {
      thinking: "", // Multi-turn analysis doesn't separate thinking
      analysis: result.analysis,
      summary: result.summary,
      grade: result.grade,
      comments: result.comments,
      tasks: [
        {
          name: "Multi-Turn Analysis",
          modelName: "claude-4-sonnet-20250514",
          priceInCents: Math.round(result.totalCost * 100), // Convert to cents
          timeInSeconds: (result.turnCount * 3) || 0, // Estimate 3 seconds per turn
          log: `Completed ${result.turnCount} turns, budget used: ${result.budgetUsed.toFixed(1)}%`,
          llmInteractions: [{
            messages: result.conversationHistory.map(msg => ({
              role: msg.role as "user" | "assistant",
              content: msg.content
            })),
            usage: {
              input_tokens: Math.round(result.totalCost * 1000 / 3), // Rough estimate
              output_tokens: Math.round(result.totalCost * 1000 / 15), // Rough estimate
            }
          }],
        },
      ],
    };
  }

  // Choose workflow based on agent's extended capability
  if (agentInfo.extendedCapabilityId === "simple-link-verifier") {
    logger.info(`Using link analysis workflow for agent ${agentInfo.name}`);
    return await analyzeLinkDocument(document, agentInfo, targetComments);
  }

  logger.info(
    `Using comprehensive analysis workflow for agent ${agentInfo.name}`
  );

  const tasks: TaskResult[] = [];

  try {
    // Step 1: Generate comprehensive analysis (includes everything)
    logger.info(`Starting comprehensive analysis generation...`);
    const analysisResult = await generateComprehensiveAnalysis(
      document,
      agentInfo,
      targetWordCount,
      targetComments
    );
    logger.info(
      `Comprehensive analysis generated, length: ${analysisResult.outputs.analysis.length}, insights: ${analysisResult.outputs.commentInsights.length}`
    );
    tasks.push(analysisResult.task);

    // Step 2: Extract and format comments from the analysis
    logger.info(`Extracting comments from analysis...`);
    const commentResult = await extractCommentsFromAnalysis(
      document,
      agentInfo,
      analysisResult.outputs,
      targetComments
    );
    logger.info(
      `Extracted ${commentResult.outputs.comments.length} comments`
    );
    tasks.push(commentResult.task);

    // Step 3: Generate self-critique if instructions are provided and randomly selected (10% chance)
    let selfCritique: string | undefined;
    if (agentInfo.selfCritiqueInstructions) {
      logger.info(`Generating self-critique...`);
      const critiqueResult = await generateSelfCritique(
        {
          summary: analysisResult.outputs.summary,
          analysis: analysisResult.outputs.analysis,
          grade: analysisResult.outputs.grade,
          comments: commentResult.outputs.comments.map((c) => {
            return {
              title: c.description || c.highlight?.quotedText?.substring(0, 50) || "Comment",
              text: c.description,
            };
          }),
        },
        agentInfo
      );
      logger.info(`Generated self-critique`);
      selfCritique = critiqueResult.outputs.selfCritique;
      tasks.push(critiqueResult.task);
    }

    return {
      thinking: "", // Keep thinking empty when using comprehensive analysis
      analysis: analysisResult.outputs.analysis,
      summary: analysisResult.outputs.summary,
      grade: analysisResult.outputs.grade,
      selfCritique,
      comments: commentResult.outputs.comments,
      tasks,
    };
  } catch (error) {
    logger.error(`Error in comprehensive analysis workflow:`, error);
    throw error;
  }
}
