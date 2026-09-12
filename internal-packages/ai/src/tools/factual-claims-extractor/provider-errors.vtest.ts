import { describe, expect, it, vi } from "vitest";

import { callClaudeWithTool } from "../../claude/wrapper";
import { ProviderAccessError } from "../../shared/providerErrors";
import fuzzyTextLocatorTool from "../smart-text-searcher";
import { ExtractFactualClaimsTool } from "./index";

vi.mock("../../claude/wrapper", () => ({
  callClaudeWithTool: vi.fn(),
}));

vi.mock("../smart-text-searcher", () => ({
  default: { execute: vi.fn() },
}));

const context = {
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
};

describe("ExtractFactualClaimsTool provider failures", () => {
  it("propagates provider failures from claim location", async () => {
    vi.mocked(callClaudeWithTool).mockResolvedValue({
      toolResult: {
        claims: [
          {
            claim: "Earth orbits the Sun.",
            exactText: "Earth orbits the Sun.",
            topic: "science",
            importanceScore: 80,
            checkabilityScore: 90,
            truthProbability: 99,
          },
        ],
      },
    } as never);
    vi.mocked(fuzzyTextLocatorTool.execute).mockRejectedValue(
      new ProviderAccessError("AI provider credit balance is too low.")
    );

    const tool = new ExtractFactualClaimsTool();
    await expect(
      tool.execute({ text: "Earth orbits the Sun." }, context)
    ).rejects.toBeInstanceOf(ProviderAccessError);
  });
});
