import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import {
  createTestDocument,
  adjustLineReference,
  adjustLineReferences,
  getPrependLineCount
} from "../testUtils";

describe("testUtils", () => {
  describe("createTestDocument", () => {
    it("creates a basic document without prepend", () => {
      const doc = createTestDocument("Test content");
      
      expect(doc.content).toBe("Test content");
      expect(doc.title).toBe("Test Document");
      expect((doc as any).versions).toBeUndefined();
    });

    it("creates a document with prepend when requested", () => {
      const doc = createTestDocument("Test content", { includePrepend: true });
      
      expect((doc as any).versions).toBeDefined();
      expect((doc as any).versions[0].markdownPrepend).toContain("# Test Document");
      expect((doc as any).versions[0].markdownPrepend).toContain("**Author:** Test Author");
    });

    it("uses custom values when provided", () => {
      const doc = createTestDocument("Content", {
        title: "Custom Title",
        author: "Jane Doe",
        platforms: ["Blog", "Twitter"],
        publishedDate: "2024-06-30"
      });
      
      expect(doc.title).toBe("Custom Title");
      expect(doc.author).toBe("Jane Doe");
      expect((doc as any).platforms).toEqual(["Blog", "Twitter"]);
    });
  });

  describe("adjustLineReference", () => {
    it("adjusts single line references", () => {
      expect(adjustLineReference("Line 1", 10)).toBe("Line 11");
      expect(adjustLineReference("Line 42", 5)).toBe("Line 47");
    });

    it("adjusts line range references", () => {
      expect(adjustLineReference("Lines 1-5", 10)).toBe("Lines 11-15");
      expect(adjustLineReference("Lines 20-25", 5)).toBe("Lines 25-30");
    });

    it("returns unchanged for non-matching patterns", () => {
      expect(adjustLineReference("Some other text", 10)).toBe("Some other text");
      expect(adjustLineReference("Line one", 10)).toBe("Line one");
    });
  });

  describe("adjustLineReferences", () => {
    it("adjusts multiple references", () => {
      const refs = ["Line 1", "Lines 5-10", "Line 15"];
      const adjusted = adjustLineReferences(refs, 10);
      
      expect(adjusted).toEqual(["Line 11", "Lines 15-20", "Line 25"]);
    });
  });

  describe("getPrependLineCount", () => {
    it("counts lines from existing prepend", () => {
      const doc = createTestDocument("Content", { includePrepend: true });
      const lineCount = getPrependLineCount(doc);
      
      expect(lineCount).toBeGreaterThan(0);
      expect(lineCount).toBe(10); // Based on the format of generateMarkdownPrepend
    });

    it("generates and counts lines when no prepend exists", () => {
      const doc = createTestDocument("Content");
      const lineCount = getPrependLineCount(doc);
      
      expect(lineCount).toBe(10);
    });
  });
});