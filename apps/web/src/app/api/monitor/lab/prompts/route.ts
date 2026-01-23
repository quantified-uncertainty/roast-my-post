import { NextResponse } from "next/server";
import {
  DEFAULT_EXTRACTOR_SYSTEM_PROMPT,
  DEFAULT_EXTRACTOR_USER_PROMPT,
} from "@roast/ai/fallacy-extractor/prompts";
import { DEFAULT_JUDGE_SYSTEM_PROMPT } from "@roast/ai/fallacy-judge/prompts";
import { DEFAULT_SUPPORTED_ELSEWHERE_SYSTEM_PROMPT } from "@roast/ai/supported-elsewhere-filter/prompts";

/**
 * GET /api/monitor/lab/prompts
 *
 * Returns the default prompts for the fallacy extractor, judge, and filter.
 * Used by the profile editor UI to show placeholders.
 */
export function GET() {
  return NextResponse.json({
    extractorSystemPrompt: DEFAULT_EXTRACTOR_SYSTEM_PROMPT,
    extractorUserPrompt: DEFAULT_EXTRACTOR_USER_PROMPT,
    judgeSystemPrompt: DEFAULT_JUDGE_SYSTEM_PROMPT,
    filterSystemPrompt: DEFAULT_SUPPORTED_ELSEWHERE_SYSTEM_PROMPT,
  });
}
