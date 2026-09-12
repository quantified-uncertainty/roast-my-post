import { describe, expect, it, vi } from "vitest";

import { callClaudeWithTool } from "../../claude/wrapper";
import { ProviderAccessError } from "../../shared/providerErrors";
import { checkMathTool } from "./index";

vi.mock("../../claude/wrapper", () => ({
  callClaudeWithTool: vi.fn(),
  MODEL_CONFIG: { analysis: "test-model" },
}));

const context = {
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
};

describe("CheckMathTool provider failures", () => {
  it("propagates a provider access failure", async () => {
    vi.mocked(callClaudeWithTool).mockRejectedValue(
      Object.assign(new Error("Insufficient credits"), { status: 400 })
    );

    await expect(
      checkMathTool.execute({ statement: "x + 1 = 2" }, context)
    ).rejects.toBeInstanceOf(ProviderAccessError);
  });
});
