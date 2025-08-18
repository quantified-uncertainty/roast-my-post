import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { TextChunk } from "../../TextChunk";
import { LinkAnalysisPlugin } from "./index";

describe("LinkAnalysisPlugin", () => {
  const plugin = new LinkAnalysisPlugin();
  const mockChunk = (text: string) => [
    new TextChunk("chunk-1", text, { position: { start: 0, end: text.length } })
  ];

  it("implements plugin interface correctly", () => {
    expect(plugin.name()).toBe("LINK_ANALYSIS");
    expect(plugin.promptForWhenToUse()).toContain("automatically");
    expect(plugin.routingExamples()).toEqual([]);
    expect(plugin.getCost()).toBe(0);
    expect(plugin.runOnAllChunks).toBe(true);
  });

  it("handles documents without links", async () => {
    const result = await plugin.analyze(mockChunk("No links here"), "No links here");
    expect(result.summary).toContain("No external links");
    expect(result.comments).toHaveLength(0);
    expect(result.grade).toBe(100);
  });

  it("analyzes documents with links", async () => {
    const text = "Check https://example.com and https://broken-link-xyz123.com";
    const result = await plugin.analyze(mockChunk(text), text);
    
    expect(result.summary).toBeDefined();
    expect(result.analysis).toContain("Link");
    expect(result.comments.length).toBeGreaterThan(0);
    expect(result.grade).toBeDefined();
  }, 30000);
});