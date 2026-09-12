import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProviderAccessError } from "../../../shared/providerErrors";
import { checkSpellingGrammarTool } from "../../../tools/spelling-grammar-checker";
import { TextChunk } from "../../TextChunk";
import { SpellingPlugin } from "./index";

vi.mock("../../../tools/spelling-grammar-checker", () => {
  const tool = { execute: vi.fn() };
  return { checkSpellingGrammarTool: tool, default: tool };
});

vi.mock("../../../shared/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("SpellingPlugin provider failures", () => {
  beforeEach(() => vi.clearAllMocks());

  it("propagates a provider credit failure from a chunk", async () => {
    vi.mocked(checkSpellingGrammarTool.execute).mockRejectedValue(
      Object.assign(new Error("Your credit balance is too low"), {
        status: 400,
      })
    );
    const plugin = new SpellingPlugin();
    const text = "This is a document.";
    const chunks = [
      new TextChunk("chunk-1", text, {
        position: { start: 0, end: text.length },
      }),
    ];

    await expect(plugin.analyze(chunks, text)).rejects.toBeInstanceOf(
      ProviderAccessError
    );
  });
});
