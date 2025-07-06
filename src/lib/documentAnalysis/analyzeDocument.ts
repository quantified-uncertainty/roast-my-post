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
import { analyzeWithAgent } from "./agenticAnalysis";

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
  // Choose analysis approach
  const useAgentic = true; // Enable new agentic approach
  const useMultiTurn = false; // Old multi-turn approach
  
  // Check if we should use agentic analysis
  if (useAgentic) {
    logger.info(`Using agentic analysis for agent ${agentInfo.name}`);
    
    const result = await analyzeWithAgent(document, agentInfo, {
      budget: (agentInfo as any).claudeCodeBudget || 0.15,
      maxTurns: 15,
      verbose: true,
    });

    // Convert to standard format with dynamic task creation
    const tasks: TaskResult[] = result.toolCalls.map((call, index) => ({
      name: call.tool,
      modelName: "claude-4-sonnet-20250514",
      priceInCents: Math.round((result.totalCost / result.turnsUsed) * 100), // Distribute cost evenly
      timeInSeconds: Math.round(60 / result.turnsUsed), // Estimate time per turn
      log: `${call.tool}: ${call.result}`,
      llmInteractions: [{
        messages: [
          { role: "user" as const, content: JSON.stringify(call.input) },
          { role: "assistant" as const, content: call.result }
        ],
        usage: {
          input_tokens: Math.round(500), // Estimates
          output_tokens: Math.round(200),
        }
      }],
    }));

    return {
      thinking: "", // Agentic analysis doesn't separate thinking
      analysis: result.analysis,
      summary: result.summary,
      grade: result.grade,
      comments: result.comments,
      tasks,
    };
  }
  
  // Check if we should use multi-turn analysis
  else if (useMultiTurn) {
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
          name: "generateComprehensiveAnalysis",
          modelName: "claude-4-sonnet-20250514",
          priceInCents: Math.round(result.totalCost * 0.7 * 100), // 70% of cost for main analysis
          timeInSeconds: Math.round((result.turnCount * 3) * 0.7) || 1,
          log: `Multi-turn analysis completed:\n- Turns: ${result.turnCount}\n- Total cost: $${result.totalCost.toFixed(4)}\n- Budget used: ${result.budgetUsed.toFixed(1)}%\n- Analysis length: ${result.analysis.length} chars\n- Comments extracted: ${result.comments.length}\n- Grade: ${result.grade || 'N/A'}/100\n- Summary: ${result.summary.substring(0, 100)}...`,
          llmInteractions: [{
            messages: result.conversationHistory.slice(0, Math.ceil(result.conversationHistory.length * 0.6)).map(msg => ({
              role: msg.role as "user" | "assistant",
              content: msg.content
            })),
            usage: {
              input_tokens: Math.round(result.totalCost * 1000 / 3 * 0.7),
              output_tokens: Math.round(result.totalCost * 1000 / 15 * 0.7),
            }
          }],
        },
        {
          name: "extractCommentsFromAnalysis",
          modelName: "EXTRACTION_ONLY",
          priceInCents: 0, // No additional LLM cost for extraction
          timeInSeconds: 0,
          log: `Extracted ${result.comments.length} comments from ${result.comments.length} available insights`,
          llmInteractions: [],
        },
        {
          name: "generateSelfCritique",
          modelName: "claude-4-sonnet-20250514",
          priceInCents: Math.round(result.totalCost * 0.3 * 100), // 30% of cost for critique
          timeInSeconds: Math.round((result.turnCount * 3) * 0.3) || 1,
          log: `Self-critique phase completed:\n- Used final ${100 - Math.ceil(result.conversationHistory.length * 0.6 / result.conversationHistory.length * 100)}% of conversation\n- Estimated length: ${Math.round(result.analysis.length * 0.15)} chars`,
          llmInteractions: [{
            messages: result.conversationHistory.slice(Math.ceil(result.conversationHistory.length * 0.6)).map(msg => ({
              role: msg.role as "user" | "assistant",
              content: msg.content
            })),
            usage: {
              input_tokens: Math.round(result.totalCost * 1000 / 3 * 0.3),
              output_tokens: Math.round(result.totalCost * 1000 / 15 * 0.3),
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
