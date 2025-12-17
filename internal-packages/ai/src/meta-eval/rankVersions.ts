/**
 * Rank multiple evaluation outputs (N-way comparison)
 */

import { randomUUID } from "crypto";
import { callClaude } from "../claude/wrapper";
import { buildRankingPrompt } from "./prompts/rankingPrompt";
import type {
  RankingInput,
  RankingResult,
  CandidateRanking,
  MetaEvalOptions,
} from "./types";
import { DEFAULT_META_EVAL_OPTIONS } from "./types";

interface RawRankingResponse {
  rankings: Array<{
    versionId: string;
    rank: number;
    relativeScore: number;
  }>;
  reasoning: string;
}

function parseJsonFromResponse(text: string): RawRankingResponse {
  // Extract JSON from markdown code block if present
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();

  try {
    return JSON.parse(jsonStr) as RawRankingResponse;
  } catch (e) {
    throw new Error(`Failed to parse ranking response as JSON: ${e}`);
  }
}

function validateRankingResponse(
  raw: RawRankingResponse,
  expectedVersionIds: string[]
): CandidateRanking[] {
  const result: CandidateRanking[] = [];
  const seenIds = new Set<string>();

  for (const ranking of raw.rankings) {
    if (!expectedVersionIds.includes(ranking.versionId)) {
      console.warn(
        `Ranking contains unexpected versionId: ${ranking.versionId}`
      );
      continue;
    }

    if (seenIds.has(ranking.versionId)) {
      console.warn(`Duplicate versionId in ranking: ${ranking.versionId}`);
      continue;
    }

    seenIds.add(ranking.versionId);
    result.push({
      versionId: ranking.versionId,
      rank: Math.max(1, Math.round(ranking.rank)),
      relativeScore: Math.max(0, Math.min(100, Math.round(ranking.relativeScore))),
    });
  }

  // Add any missing candidates with worst rank
  for (const id of expectedVersionIds) {
    if (!seenIds.has(id)) {
      const maxRank = Math.max(...result.map((r) => r.rank), 0);
      result.push({
        versionId: id,
        rank: maxRank + 1,
        relativeScore: 0,
      });
    }
  }

  // Sort by rank
  result.sort((a, b) => a.rank - b.rank);

  return result;
}

/**
 * Rank multiple evaluation outputs relative to each other
 */
export async function rankVersions(
  input: RankingInput,
  options: MetaEvalOptions = {}
): Promise<RankingResult> {
  if (input.candidates.length < 2) {
    throw new Error("Need at least 2 candidates to rank");
  }

  if (input.candidates.length > 10) {
    throw new Error("Cannot rank more than 10 candidates at once");
  }

  const opts = { ...DEFAULT_META_EVAL_OPTIONS, ...options };
  const sessionId = randomUUID();

  const prompt = buildRankingPrompt(input.sourceText, input.candidates);

  const { response } = await callClaude({
    model: opts.model,
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  // Extract text content from response
  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text content in ranking response");
  }

  const raw = parseJsonFromResponse(textContent.text);
  const expectedIds = input.candidates.map((c) => c.versionId);
  const rankings = validateRankingResponse(raw, expectedIds);

  return {
    rankings,
    reasoning: raw.reasoning || "",
    sessionId,
  };
}
