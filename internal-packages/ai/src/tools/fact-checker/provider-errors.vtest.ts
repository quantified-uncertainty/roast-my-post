import { describe, expect, it, vi } from "vitest";

import { callClaudeWithTool } from "../../claude/wrapper";
import { ProviderAccessError } from "../../shared/providerErrors";
import { perplexityResearchTool } from "../perplexity-researcher";
import factCheckerTool from "./index";

vi.mock("../../claude/wrapper", () => ({
  callClaudeWithTool: vi.fn(),
}));

vi.mock("../perplexity-researcher", () => ({
  perplexityResearchTool: { execute: vi.fn() },
}));

const context = {
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
};

describe("FactCheckerTool provider failures", () => {
  it("propagates provider failures from evidence research", async () => {
    vi.mocked(perplexityResearchTool.execute).mockRejectedValue(
      new ProviderAccessError("AI provider credit balance is too low.")
    );

    await expect(
      factCheckerTool.execute(
        { claim: "Earth orbits the Sun", searchForEvidence: true },
        context
      )
    ).rejects.toBeInstanceOf(ProviderAccessError);
    expect(callClaudeWithTool).not.toHaveBeenCalled();
  });
});
