import { describe, expect, it, vi } from "vitest";

import { ProviderAccessError } from "../shared/providerErrors";
import { PluginManager } from "./PluginManager";
import { AgenticPlugin } from "./plugins/agentic";
import type { SimpleAnalysisPlugin } from "./types";

interface AgenticPluginInternals {
  parseResult: (result: string) => unknown;
  ensureWorkspace: (documentText: string) => Promise<void>;
}

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
      getCost: () => 0,
    };

    await expect(
      manager.analyzeDocumentSimple("Document text", [plugin])
    ).rejects.toBeInstanceOf(ProviderAccessError);
  });

  it("rejects an Agent SDK success message that contains a credit failure", () => {
    const plugin = new AgenticPlugin();
    const parseResult = (
      plugin as unknown as AgenticPluginInternals
    ).parseResult.bind(plugin);

    expect(() => parseResult("Credit balance is too low")).toThrow(
      ProviderAccessError
    );
  });

  it("keeps malformed analysis that merely quotes provider-error language", () => {
    const plugin = new AgenticPlugin();
    const parseResult = (
      plugin as unknown as AgenticPluginInternals
    ).parseResult.bind(plugin);

    expect(
      parseResult('Analysis of the quoted phrase "payment required"')
    ).toMatchObject({
      summary: 'Analysis of the quoted phrase "payment required"',
    });
  });

  it("keeps local permission errors in the existing plugin fallback", async () => {
    const plugin = new AgenticPlugin();
    vi.spyOn(
      plugin as unknown as AgenticPluginInternals,
      "ensureWorkspace"
    ).mockRejectedValue(new Error("EACCES: permission denied, mkdir /tmp/job"));

    await expect(plugin.analyze([], "Document text")).resolves.toMatchObject({
      summary: expect.stringContaining("Agentic analysis failed"),
    });
  });
});
