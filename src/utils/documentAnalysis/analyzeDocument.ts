import { DocumentReview } from "../../types/documentReview";
import { Document } from "../../types/documents";
import {
  ANALYSIS_MODEL,
  DEFAULT_TEMPERATURE,
  openai,
} from "../../types/openai";
import { getCommentData } from "./llmCalls/commentGenerator";
import { getThinkingPrompt } from "./prompts";
import { loadAgentInfo } from "./utils/agentUtils";

export async function analyzeDocument(
  document: Document,
  agentId: string
): Promise<DocumentReview> {
  // Load agent info
  const agentInfo = loadAgentInfo(agentId);

  // Calculate target word count
  const baseWords = 200;
  const wordsPerComment = 20;
  const targetComments = Math.ceil(document.content.length / 1000) * 2;
  const targetWordCount = baseWords + targetComments * wordsPerComment;

  // Generate thinking prompt
  const thinkingPrompt = getThinkingPrompt(
    agentInfo,
    targetWordCount,
    document
  );

  // Get thinking response
  const thinkingResponse = await openai.chat.completions.create({
    model: ANALYSIS_MODEL,
    messages: [{ role: "user", content: thinkingPrompt }],
    temperature: DEFAULT_TEMPERATURE,
  });

  if (!thinkingResponse.choices[0]?.message?.content) {
    throw new Error("No response from LLM for thinking");
  }

  // Parse the thinking response (expecting { thinking: string, summary: string, grade?: number })
  const thinkingResult = JSON.parse(
    thinkingResponse.choices[0].message.content
  );

  // Get comments
  const comments = await getCommentData(document, agentInfo, targetComments);

  // Construct and return DocumentReview object
  return {
    agentId,
    createdAt: new Date(),
    costInCents: 0,
    thinking: thinkingResult.thinking,
    summary: thinkingResult.summary,
    grade: thinkingResult.grade,
    comments,
  };
}
