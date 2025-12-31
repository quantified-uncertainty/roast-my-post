/**
 * Score a single evaluation output on multiple quality dimensions
 */

import { callClaude } from "../claude/wrapper";
import { buildScoringPrompt } from "./prompts/scoringPrompt";
import type {
  ScoringInput,
  ScoringResult,
  MetaEvalOptions,
  Dimension,
  DimensionScore,
} from "./types";
import {
  DEFAULT_META_EVAL_OPTIONS,
  QUALITY_DIMENSIONS,
  COLLECTION_DIMENSIONS,
} from "./types";

interface RawScoringResponse {
  dimensions: Record<string, { score: number; explanation: string }>;
  overallScore: number;
  reasoning: string;
}

function parseJsonFromResponse(text: string): RawScoringResponse {
  // Extract JSON from markdown code block if present
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();

  try {
    return JSON.parse(jsonStr) as RawScoringResponse;
  } catch (e) {
    throw new Error(`Failed to parse scoring response as JSON: ${e}`);
  }
}

function validateScoringResponse(
  raw: RawScoringResponse
): Record<Dimension, DimensionScore> {
  const allDimensions = [
    ...QUALITY_DIMENSIONS,
    ...COLLECTION_DIMENSIONS,
  ] as const;
  const result: Partial<Record<Dimension, DimensionScore>> = {};

  for (const dim of allDimensions) {
    const dimResult = raw.dimensions[dim];
    if (!dimResult) {
      // Provide default if missing
      result[dim] = {
        score: 5,
        explanation: "(Not evaluated)",
      };
    } else {
      result[dim] = {
        score: Math.max(1, Math.min(10, Math.round(dimResult.score))),
        explanation: dimResult.explanation || "",
      };
    }
  }

  return result as Record<Dimension, DimensionScore>;
}

/**
 * Score comments on multiple quality dimensions
 */
export async function scoreComments(
  input: ScoringInput,
  options: MetaEvalOptions = {}
): Promise<ScoringResult> {
  const opts = { ...DEFAULT_META_EVAL_OPTIONS, ...options };

  const prompt = buildScoringPrompt(
    input.sourceText,
    input.comments,
    input.agentName
  );

  const { response } = await callClaude({
    model: opts.model,
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  // Extract text content from response
  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text content in scoring response");
  }

  const raw = parseJsonFromResponse(textContent.text);
  const dimensions = validateScoringResponse(raw);

  // Calculate overall score if not provided
  const overallScore =
    raw.overallScore ||
    Object.values(dimensions).reduce((sum, d) => sum + d.score, 0) /
      Object.keys(dimensions).length;

  return {
    overallScore: Math.max(1, Math.min(10, Math.round(overallScore * 10) / 10)),
    dimensions,
    reasoning: raw.reasoning || "",
  };
}
