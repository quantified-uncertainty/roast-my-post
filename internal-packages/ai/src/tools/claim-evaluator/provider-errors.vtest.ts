import { describe, expect, it, vi } from "vitest";

import type { ToolContext } from "../base/Tool";
import { ProviderAccessError } from "../../shared/providerErrors";
import { callOpenRouterChat } from "../../utils/openrouter";
import { ClaimEvaluatorTool } from "./index";

vi.mock("../../utils/openrouter", () => ({
  callOpenRouterChat: vi.fn(),
  normalizeTemperature: vi.fn((temperature) => temperature),
  OPENROUTER_MODELS: {
    CLAUDE_SONNET_4_5: "anthropic/claude-sonnet-4.5",
    GPT_5_MINI: "openai/gpt-5-mini",
    DEEPSEEK_CHAT_V3_1: "deepseek/deepseek-chat-v3.1",
    GROK_4: "x-ai/grok-4",
  },
}));

describe("claim evaluator provider failures", () => {
  it("propagates rejected provider access instead of returning failed entries", async () => {
    vi.mocked(callOpenRouterChat).mockRejectedValue(
      new ProviderAccessError("AI provider authentication failed")
    );
    const context = {
      userId: "test-user",
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      },
    } as unknown as ToolContext;

    await expect(
      new ClaimEvaluatorTool().execute(
        { claim: "The claim", models: ["openai/gpt-5-mini"] },
        context
      )
    ).rejects.toBeInstanceOf(ProviderAccessError);
  });
});
