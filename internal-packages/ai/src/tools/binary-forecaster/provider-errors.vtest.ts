import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProviderAccessError } from "../../shared/providerErrors";
import { perplexityResearchTool } from "../perplexity-researcher/index";
import { callClaudeWithTool } from "../../claude/wrapper";
import { generateForecastWithAggregation } from "./generator";

vi.mock("../../claude/wrapper", () => ({
  callClaudeWithTool: vi.fn(),
  MODEL_CONFIG: { forecasting: "test-model" },
}));

vi.mock("../perplexity-researcher/index", () => ({
  perplexityResearchTool: { execute: vi.fn() },
}));

describe("binary forecaster provider failures", () => {
  beforeEach(() => vi.clearAllMocks());

  it("propagates a provider failure from any parallel forecast", async () => {
    vi.mocked(callClaudeWithTool).mockRejectedValue(
      new ProviderAccessError("AI provider authentication failed")
    );

    await expect(
      generateForecastWithAggregation({
        question: "Will the event happen?",
        numForecasts: 3,
        usePerplexity: false,
      })
    ).rejects.toBeInstanceOf(ProviderAccessError);
  });

  it("propagates a provider failure from optional research", async () => {
    vi.mocked(perplexityResearchTool.execute).mockRejectedValue(
      new ProviderAccessError("AI provider billing rejected the request")
    );

    await expect(
      generateForecastWithAggregation({
        question: "Will the event happen?",
        numForecasts: 3,
        usePerplexity: true,
      })
    ).rejects.toBeInstanceOf(ProviderAccessError);
    expect(callClaudeWithTool).not.toHaveBeenCalled();
  });
});
