import { describe, expect, it, vi } from "vitest";

import { ProviderAccessError } from "../shared/providerErrors";
import { PluginManager } from "./PluginManager";
import { AgenticPlugin } from "./plugins/agentic";
import type { SimpleAnalysisPlugin } from "./types";

describe("provider error propagation", () => {
  it("does not convert provider failures into a successful document result", async () => {
    const manager = new PluginManager();
    vi.spyOn(manager, "analyzeDocumentSimple").mockRejectedValue(
      new ProviderAccessError("AI provider credit balance is too low.")
    );

    await expect(
      manager.analyzeDocument("Document text")
    ).rejects.toBeInstanceOf(ProviderAccessError);
  });

  it("propagates provider failures thrown by a plugin", async () => {
    const manager = new PluginManager();
    const plugin: SimpleAnalysisPlugin = {
      name: () => "TEST_PLUGIN",
      promptForWhenToUse: () => "Always run in this test",
      routingExamples: () => [],
      runOnAllChunks: true,
      analyze: async () => {
        throw Object.assign(new Error("Insufficient credits"), { status: 400 });
      },
    };

    await expect(
      manager.analyzeDocumentSimple("Document text", [plugin])
    ).rejects.toBeInstanceOf(ProviderAccessError);
  });

  it("rejects an Agent SDK success message that contains a credit failure", () => {
    const plugin = new AgenticPlugin();
    const parseResult = (
      plugin as unknown as {
        parseResult: (result: string) => unknown;
      }
    ).parseResult.bind(plugin);

    expect(() => parseResult("Credit balance is too low")).toThrow(
      ProviderAccessError
    );
  });
});
