import { describe, expect, it, vi } from "vitest";

import { callClaudeWithTool } from "../../claude/wrapper";
import { ProviderAccessError } from "../../shared/providerErrors";
import { llmSearch } from "./llmSearch";

vi.mock("../../claude/wrapper", () => ({
  callClaudeWithTool: vi.fn(),
  MODEL_CONFIG: { analysis: "test-model" },
}));

vi.mock("../../shared/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe("llmSearch provider failures", () => {
  it("propagates a provider access failure instead of returning no match", async () => {
    vi.mocked(callClaudeWithTool).mockRejectedValue(
      Object.assign(new Error("Your credit balance is too low"), {
        status: 400,
      })
    );

    await expect(llmSearch("needle", "document text")).rejects.toBeInstanceOf(
      ProviderAccessError
    );
  });
});
