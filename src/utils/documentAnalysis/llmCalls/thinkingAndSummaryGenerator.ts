import { z } from "zod";

import type { Document } from "../../../types/documents";
import type { EvaluationAgent } from "../../../types/evaluationAgents";
import {
  ANALYSIS_MODEL,
  DEFAULT_TEMPERATURE,
  openai,
} from "../../../types/openai";
import { getThinkingAndSummaryPrompt } from "../prompts";

const ThinkingGeneratorResultSchema = z.object({
  thinking: z.string(),
  summary: z.string(),
  grade: z.number().optional(),
});

export async function generateThinkingAndSummary(
  document: Document,
  targetWordCount: number,
  agentInfo: EvaluationAgent
): Promise<{
  thinking: string;
  summary: string;
  grade: number | undefined;
}> {
  const thinkingPrompt = getThinkingAndSummaryPrompt(
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

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawContent);
  } catch (jsonError) {
    console.error(
      "Failed to parse thinkingGenerator response JSON:",
      jsonError
    );
    throw new Error(
      `Failed to parse thinkingGenerator response JSON. Raw content: ${rawContent}`
    );
  }

  const validationResult = ThinkingGeneratorResultSchema.safeParse(parsedJson);
  if (!validationResult.success) {
    console.error(
      "thinkingGenerator response JSON failed schema validation:",
      validationResult.error.flatten()
    );
    throw new Error(
      `thinkingGenerator response JSON failed schema validation. Raw content: ${rawContent}`
    );
  }

  return {
    thinking: validationResult.data.thinking,
    summary: validationResult.data.summary,
    grade: validationResult.data.grade,
  };
}
