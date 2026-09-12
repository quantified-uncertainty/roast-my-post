import { describe, expect, it, vi } from "vitest";

import { ProviderAccessError } from "../../shared/providerErrors";
import { checkMathTool } from "../math-validator-llm";
import { checkMathWithMathJsTool } from "../math-validator-mathjs";
import { checkMathHybridTool } from "./index";

vi.mock("../math-validator-llm", () => ({
  checkMathTool: { execute: vi.fn() },
}));

vi.mock("../math-validator-mathjs", () => ({
  checkMathWithMathJsTool: { execute: vi.fn() },
}));

const context = {
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
};

describe("CheckMathHybridTool provider failures", () => {
  it("propagates a provider failure from the LLM fallback", async () => {
    vi.mocked(checkMathWithMathJsTool.execute).mockResolvedValue({
      statement: "The limit is zero",
      status: "cannot_verify",
      explanation: "Requires conceptual analysis",
      llmInteraction: {} as never,
    });
    vi.mocked(checkMathTool.execute).mockRejectedValue(
      new ProviderAccessError("AI provider credit balance is too low.")
    );

    await expect(
      checkMathHybridTool.execute({ statement: "The limit is zero" }, context)
    ).rejects.toBeInstanceOf(ProviderAccessError);
  });
});
