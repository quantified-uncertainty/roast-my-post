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
  // Always use Claude Code for now (hardcoded)
  const useClaudeCode = true;
  
  // Check if agent should use Claude Code
  if (useClaudeCode) {
    logger.info(`Using Claude Code workflow for agent ${agentInfo.name}`);
    
    const result = await analyzeWithClaudeCode(document, agentInfo, {
      budget: (agentInfo as any).claudeCodeBudget || 0.06,
      verbose: true,
    });

    // Convert to standard format
    return {
      thinking: "", // Claude Code doesn't separate thinking
      analysis: result.analysis,
      summary: result.summary,
      grade: result.grade,
      comments: result.comments,
      tasks: [
        {
          name: "Claude Code Analysis",
          modelName: "claude-4-sonnet-20250514",
          priceInCents: Math.round(result.totalCost * 100), // Convert to cents
          timeInSeconds: (result.turnCount * 2) || 0, // Estimate 2 seconds per turn
          log: `Completed ${result.turnCount} turns with ${result.abortReason} reason`,
          llmInteractions: [{
            messages: result.conversation
              .filter(msg => msg.type === "user" || msg.type === "assistant")
              .map(msg => ({
                role: msg.type as "user" | "assistant",
                content: (msg as any).content || ""
              })),
            usage: {
              input_tokens: result.conversation.reduce((sum, msg) => 
                sum + ((msg as any).usage?.input_tokens || 0), 0),
              output_tokens: result.conversation.reduce((sum, msg) => 
                sum + ((msg as any).usage?.output_tokens || 0), 0)
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
