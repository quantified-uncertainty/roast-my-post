import type { Document } from "../../../types/documents";
import type { EvaluationAgent } from "../../../types/evaluationAgents";
import {
  ANALYSIS_MODEL,
  DEFAULT_TEMPERATURE,
  openai,
} from "../../../types/openai";
import { getThinkingPrompt } from "../prompts";

export async function generateThinking(
  document: Document,
  targetWordCount: number,
  agentInfo: EvaluationAgent
) {
  const thinkingPrompt = getThinkingPrompt(
    agentInfo,
    targetWordCount,
    document
  );

  const response = await openai.chat.completions.create({
    model: ANALYSIS_MODEL,
    temperature: DEFAULT_TEMPERATURE,
    messages: [
      {
        role: "system",
        content:
          "You are an expert document analyst. Provide detailed analysis and insights.",
      },
      {
        role: "user",
        content: thinkingPrompt,
      },
    ],
  });

  if (!response.choices[0]?.message?.content) {
    throw new Error("No response from LLM for thinking");
  }

  return {
    thinking: JSON.parse(response.choices[0].message.content),
    usage: response.usage,
    llmResponse: response.choices[0].message.content,
    finalPrompt: thinkingPrompt,
  };
}
