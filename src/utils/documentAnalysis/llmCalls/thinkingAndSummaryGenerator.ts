import {
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions.mjs";
import { z } from "zod";

import type { Agent } from "../../../types/agentSchema";
import type { Document } from "../../../types/documents";
import {
  ANALYSIS_MODEL,
  DEFAULT_TEMPERATURE,
  openai,
} from "../../../types/openai";
import { BaseLLMProcessor } from "../llmResponseProcessor";
import { getThinkingAndSummaryPrompt } from "../prompts";

const ThinkingGeneratorResultSchema = z.object({
  thinking: z.string(),
  analysis: z.string(),
  summary: z.string(),
  grade: z.number().optional(),
});

export async function generateThinkingAndSummary(
  document: Document,
  targetWordCount: number,
  agentInfo: Agent
): Promise<{
  llmMessages: string;
  thinking: string;
  analysis: string;
  summary: string;
  grade: number | undefined;
}> {
  const thinkingPrompt = getThinkingAndSummaryPrompt(
    agentInfo,
    targetWordCount,
    document
  );

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are an expert document analyst. Provide detailed analysis and insights.",
    },
    {
      role: "user",
      content: thinkingPrompt,
    },
  ];

  const messagesAsString = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const response = await openai.chat.completions.create({
    model: ANALYSIS_MODEL,
    temperature: DEFAULT_TEMPERATURE,
    messages,
  });

  if (!response.choices || response.choices.length === 0) {
    console.error(
      "OpenAI response missing choices:",
      JSON.stringify(response, null, 2)
    );
    throw new Error("No choices received from LLM for thinking/summary/grade");
  }

  const rawContent = response.choices[0]?.message?.content;
  if (!rawContent) {
    console.error(
      "OpenAI choice missing content:",
      JSON.stringify(response.choices[0], null, 2)
    );
    throw new Error("No content received from LLM for thinking/summary/grade");
  }

  const processor = new BaseLLMProcessor(ThinkingGeneratorResultSchema);
  const validationResult = processor.processResponse(rawContent);

  return {
    llmMessages: messagesAsString,
    thinking: validationResult.thinking,
    analysis: validationResult.analysis,
    summary: validationResult.summary,
    grade: validationResult.grade,
  };
}
