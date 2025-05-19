import { Agent } from "../../types/agentSchema";
import { Document } from "../../types/documents";
import { Evaluation } from "../../types/documentSchema";
import { getCommentData } from "./llmCalls/commentGenerator";
import { generateThinkingAndSummary } from "./llmCalls/thinkingAndSummaryGenerator";
import {
  calculateTargetComments,
  calculateTargetWordCount,
} from "./utils/calculations";

interface AnalyzeDocumentResult {
  review: Evaluation;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  llmResponse?: string;
  finalPrompt?: string;
  agentContext?: string;
}

export async function analyzeDocument(
  document: Document,
  agent: Agent
): Promise<AnalyzeDocumentResult> {
  // Calculate target word count
  const targetComments = calculateTargetComments(document.content);
  const targetWordCount = calculateTargetWordCount(document.content);

  const thinkingResult = await generateThinkingAndSummary(
    document,
    targetWordCount,
    agent
  );

  // Get comments
  const comments = await getCommentData(document, agent, targetComments);

  const documentReview: Evaluation = {
    agentId: agent.id,
    createdAt: new Date(),
    costInCents: 0,
    thinking: thinkingResult.thinking,
    summary: thinkingResult.summary,
    grade: thinkingResult.grade || 0,
    comments,
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
    finalPrompt: "Prompt used to generate the review", // This is a placeholder
    agentContext: JSON.stringify(agent), // This is a simplification
  };
}
