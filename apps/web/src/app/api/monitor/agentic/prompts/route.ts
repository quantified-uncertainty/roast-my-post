import { NextRequest, NextResponse } from "next/server";
import {
  AGENTIC_SYSTEM_PROMPT,
  ORCHESTRATOR_PROMPT,
  SUBAGENT_PROMPTS,
} from "@roast/ai/agentic/prompts";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { isAdmin } from "@/infrastructure/auth/auth";

/**
 * GET /api/monitor/agentic/prompts
 *
 * Returns the default prompts for the agentic plugin.
 * Used by the profile editor UI to show placeholders.
 */
export async function GET(request: NextRequest) {
  const userId = await authenticateRequest(request);
  if (!userId) return commonErrors.unauthorized();

  const adminCheck = await isAdmin();
  if (!adminCheck) return commonErrors.forbidden();

  return NextResponse.json({
    systemPrompt: AGENTIC_SYSTEM_PROMPT,
    orchestratorPrompt: ORCHESTRATOR_PROMPT,
    subAgentPrompts: SUBAGENT_PROMPTS,
  });
}
