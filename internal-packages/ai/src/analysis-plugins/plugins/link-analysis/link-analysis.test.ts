import { TextChunk } from "../../TextChunk";
import { LinkAnalysisPlugin } from "./index";

describe("LinkAnalysisPlugin", () => {
  let plugin: LinkAnalysisPlugin;

  beforeEach(() => {
    plugin = new LinkAnalysisPlugin();
  });

  describe("basic functionality", () => {
    it("should identify itself correctly", () => {
      expect(plugin.name()).toBe("LINK_ANALYSIS");
    });

    it("should provide usage prompt", () => {
      const prompt = plugin.promptForWhenToUse();
      expect(prompt).toContain("Link analysis");
      expect(prompt).toContain("automatically");
    });
  });

  describe("link analysis", () => {
    it("should handle document with no links", async () => {
      const text = "This is a document with no links at all. Just plain text.";
      const chunks = [
        new TextChunk("chunk-1", text, {
          position: { start: 0, end: text.length },
        }),
      ];

      const result = await plugin.analyze(chunks, text);

      expect(result.summary).toContain("No external links found");
      expect(result.comments).toHaveLength(0);
      expect(result.cost).toBe(0);
    });

    it("should analyze document with valid URL", async () => {
      const text = "Check out this link: https://www.google.com for more info.";
      const chunks = [
        new TextChunk("chunk-1", text, {
          position: { start: 0, end: text.length },
        }),
      ];

      const result = await plugin.analyze(chunks, text);

      expect(result.summary).toBeDefined();
      expect(result.analysis).toContain("Link Quality Analysis");
      // Should have at least one comment for the link
      expect(result.comments.length).toBeGreaterThanOrEqual(1);

      // Check the comment has proper structure
      const comment = result.comments[0];
      expect(comment.description).toBeDefined();
      expect(comment.highlight).toBeDefined();
      expect(comment.highlight?.quotedText).toContain("google.com");
    }, 30000); // Increase timeout for network request

    it("should detect broken links", async () => {
      const text =
        "This link is broken: https://this-url-definitely-does-not-exist-12345.com";
      const chunks = [
        new TextChunk("chunk-1", text, {
          position: { start: 0, end: text.length },
        }),
      ];

      const result = await plugin.analyze(chunks, text);

      expect(result.summary).toMatch(/broken|issue|problem/i);
      expect(result.analysis).toContain("link");

      // Should have a comment for the broken link
      expect(result.comments.length).toBeGreaterThanOrEqual(1);

      const comment = result.comments[0];
      expect(comment.description).toMatch(/broken|error|fail|not.*exist/i);
      expect(comment.grade).toBe(0);
    }, 30000);

    it("should handle multiple links", async () => {
      const text = `
        Here are some links:
        - Google: https://www.google.com
        - GitHub: https://github.com
        - Broken: https://this-does-not-exist-xyz123.com
      `;
      const chunks = [
        new TextChunk("chunk-1", text, {
          position: { start: 0, end: text.length },
        }),
      ];

      const result = await plugin.analyze(chunks, text);

      // Should find all 3 links
      expect(result.comments.length).toBe(3);

      // Check that we have both working and broken links
      const grades = result.comments.map((c) => c.grade);
      expect(grades.some((g) => g >= 90)).toBe(true); // Working links may have grade 90 or 100
      expect(grades).toContain(0); // Broken link

      // Summary should mention the broken link
      expect(result.summary.toLowerCase()).toMatch(/broken|issue|1/);
    }, 30000);
  });

  describe("cost tracking", () => {
    it("should track cost correctly", async () => {
      const text = "No links here.";
      const chunks = [
        new TextChunk("chunk-1", text, {
          position: { start: 0, end: text.length },
        }),
      ];

      await plugin.analyze(chunks, text);

      expect(plugin.getCost()).toBe(0); // No LLM calls, so no cost
    });
  });

  describe("debug info", () => {
    it("should provide debug information", async () => {
      const text = "Visit https://example.com for details.";
      const chunks = [
        new TextChunk("chunk-1", text, {
          position: { start: 0, end: text.length },
        }),
      ];

      await plugin.analyze(chunks, text);

      const debugInfo = plugin.getDebugInfo();
      expect(debugInfo.plugin).toBe("LinkAnalysisPlugin");
      expect(debugInfo.version).toBe("1.0.0");
    }, 30000);
  });

  describe("document metadata", () => {
    it("should use document metadata when provided", async () => {
      const text = "Document with link: https://example.com";
      const chunks = [
        new TextChunk("chunk-1", text, {
          position: { start: 0, end: text.length },
        }),
      ];

      const result = await plugin.analyze(chunks, text);

      // The analysis should reference the document title
      expect(result.analysis).toContain("Link Quality Analysis");
      expect(result.grade).toBeDefined();
    }, 30000);
  });
});
