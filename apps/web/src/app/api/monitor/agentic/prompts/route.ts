import { NextResponse } from "next/server";
import {
  AGENTIC_SYSTEM_PROMPT,
  ORCHESTRATOR_PROMPT,
  SUBAGENT_PROMPTS,
} from "@roast/ai/agentic/prompts";

/**
 * GET /api/monitor/agentic/prompts
 *
 * Returns the default prompts for the agentic plugin.
 * Used by the profile editor UI to show placeholders.
 */
export function GET() {
  return NextResponse.json({
    systemPrompt: AGENTIC_SYSTEM_PROMPT,
    orchestratorPrompt: ORCHESTRATOR_PROMPT,
    subAgentPrompts: SUBAGENT_PROMPTS,
  });
}
