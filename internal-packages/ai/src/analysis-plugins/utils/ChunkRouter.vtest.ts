import { beforeEach, describe, expect, it, vi } from "vitest";

import { callClaudeWithTool } from "../../claude/wrapper";
import { ProviderAccessError } from "../../shared/providerErrors";
import { TextChunk } from "../TextChunk";
import type { SimpleAnalysisPlugin } from "../types";
import { ChunkRouter } from "./ChunkRouter";

vi.mock("../../claude/wrapper", () => ({
  callClaudeWithTool: vi.fn(),
}));

vi.mock("../../shared/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const plugin: SimpleAnalysisPlugin = {
  name: () => "FACT_CHECK",
  promptForWhenToUse: () => "Use for factual claims",
  routingExamples: () => [
    { chunkText: "A factual claim", shouldProcess: true },
  ],
  analyze: vi.fn(),
  getCost: () => 0,
};

describe("ChunkRouter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("propagates provider credit failures instead of returning empty routing", async () => {
    vi.mocked(callClaudeWithTool).mockRejectedValue(
      Object.assign(new Error("Your credit balance is too low"), {
        status: 400,
      })
    );
    const router = new ChunkRouter([plugin]);
    const chunks = [
      new TextChunk("chunk-1", "The population reached 8 billion.", {
        position: { start: 0, end: 33 },
      }),
    ];

    await expect(router.routeChunks(chunks)).rejects.toBeInstanceOf(
      ProviderAccessError
    );
  });

  it("retains the fallback for ordinary routing errors", async () => {
    vi.mocked(callClaudeWithTool).mockRejectedValue(new Error("Invalid JSON"));
    const router = new ChunkRouter([plugin]);
    const chunks = [
      new TextChunk("chunk-1", "The population reached 8 billion in 2022.", {
        position: { start: 0, end: 42 },
      }),
    ];

    const result = await router.routeChunks(chunks);

    expect(result.routingDecisions.get("chunk-1")).toEqual(["FACT_CHECK"]);
  });
});
