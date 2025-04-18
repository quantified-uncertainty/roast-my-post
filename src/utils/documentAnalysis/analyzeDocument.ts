import { DocumentReview } from "../../types/documentReview";
import { Document } from "../../types/documents";
import { getCommentData } from "./llmCalls/commentGenerator";
import { generateThinkingAndSummary } from "./llmCalls/thinkingAndSummaryGenerator";
import { loadAgentInfo } from "./utils/agentUtils";
import {
  calculateTargetComments,
  calculateTargetWordCount,
} from "./utils/calculations";

export async function analyzeDocument(
  document: Document,
  agentId: string
): Promise<DocumentReview> {
  // Load agent info
  const agentInfo = loadAgentInfo(agentId);

  // Calculate target word count
  const targetComments = calculateTargetComments(document.content);
  const targetWordCount = calculateTargetWordCount(document.content);

  const thinkingResult = await generateThinkingAndSummary(
    document,
    targetWordCount,
    agentInfo
  );

  // Get comments
  const comments = await getCommentData(document, agentInfo, targetComments);

  const documentReview: DocumentReview = {
    agentId,
    createdAt: new Date(),
    costInCents: 0,
    thinking: thinkingResult.thinking,
    summary: thinkingResult.summary,
    grade: thinkingResult.grade,
    comments,
  };

  return documentReview;
}
