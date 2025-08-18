import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { extractHighlightsFromAnalysis } from "../index";
import type { Agent, Document } from "@roast/ai";
import type { ComprehensiveAnalysisOutputs } from "../../comprehensiveAnalysis";

describe("Highlight Extraction from Analysis", () => {
  const mockAgent: Agent = {
    id: "test-agent",
    name: "Test Agent",
    version: "1.0",
    description: "Test agent",
    primaryInstructions: "Test",
    providesGrades: true,
  };

  const mockDocument: Document = {
    id: "test-doc",
    slug: "test-doc",
    title: "Test Document",
    content: `# Test Document

**Author:** Test Author
**Publication:** Test Blog
**Date Published:** January 1, 2024

---

Line 8: This is line 8 of the content.
Line 9: This line contains important information.
Line 10: Another line with content.

Line 12: After a blank line.

## Section Header

Line 15: Content in a section.
Line 16: More content here.`,
    author: "Test Author",
    publishedDate: "2024-01-01",
    url: "",
    platforms: ["Test Blog"],
    reviews: [],
    intendedAgents: [],
  };

  test("converts highlightInsights to highlights with correct positions", async () => {
    // Mock comprehensive analysis output with highlightInsights
    const analysisData: ComprehensiveAnalysisOutputs = {
      summary: "Test summary",
      analysis: "Test analysis content",
      highlightInsights: [
        {
          id: "insight-1",
          location: "Line 10",
          suggestedHighlight: "Line 9: This line contains important information."
        },
        {
          id: "insight-2", 
          location: "Lines 17-18",
          suggestedHighlight: "Line 15: Content in a section.\nLine 16: More content here."
        }
      ]
    };

    const result = await extractHighlightsFromAnalysis(
      mockDocument,
      mockAgent,
      analysisData,
      5
    );

    // Should have converted insights to highlights
    expect(result.outputs.highlights).toBeDefined();
    expect(result.outputs.highlights.length).toBe(2);

    // Check first highlight
    const firstHighlight = result.outputs.highlights[0];
    expect(firstHighlight.description).toContain("Line 9: This line contains important information");
    expect(firstHighlight.highlight).toBeDefined();
    
    if (firstHighlight.highlight) {
      // Should find content from line 10
      const { quotedText, isValid, startOffset, endOffset } = firstHighlight.highlight;
      expect(isValid).toBe(true);
      expect(quotedText).toBeDefined();
      
      // The highlight should be after the prepend
      const prependEnd = mockDocument.content.indexOf("---\n\n") + 5;
      expect(startOffset).toBeGreaterThan(prependEnd);
      
      // Verify the extracted text matches
      const extracted = mockDocument.content.substring(startOffset, endOffset);
      expect(extracted).toBe(quotedText);
    }

    // Check second highlight
    const secondHighlight = result.outputs.highlights[1];
    expect(secondHighlight.description).toContain("Line 15: Content in a section");
    expect(secondHighlight.highlight?.isValid).toBe(true);
  });

  test("handles case where line numbers don't match content but text can be found", async () => {
    const analysisData: ComprehensiveAnalysisOutputs = {
      summary: "Test summary", 
      analysis: "Test analysis",
      highlightInsights: [
        {
          id: "insight-1",
          location: "Line 999", // Line that doesn't exist
          suggestedHighlight: "Line 9: This line contains important information." // But this text DOES exist
        }
      ]
    };

    const result = await extractHighlightsFromAnalysis(
      mockDocument,
      mockAgent,
      analysisData,
      1
    );

    // Should create a highlight when text can be found, even if line number is wrong
    expect(result.outputs.highlights.length).toBe(1);
    
    const highlight = result.outputs.highlights[0];
    expect(highlight.description).toBe("Line 9: This line contains important information.");
    expect(highlight.highlight?.isValid).toBe(true);
  });

  test("handles case where line numbers and text don't match content", async () => {
    const analysisData: ComprehensiveAnalysisOutputs = {
      summary: "Test summary", 
      analysis: "Test analysis",
      highlightInsights: [
        {
          id: "insight-1",
          location: "Line 999", // Line that doesn't exist
          suggestedHighlight: "This text does not exist in the document."
        }
      ]
    };

    const result = await extractHighlightsFromAnalysis(
      mockDocument,
      mockAgent,
      analysisData,
      1
    );

    // Should NOT create a highlight when line doesn't exist and text can't be found
    // This is the correct behavior - we shouldn't create highlights for non-existent content
    expect(result.outputs.highlights.length).toBe(0);
  });

  test("handles empty highlightInsights array", async () => {
    // Skip this test if no valid API key is available since it requires LLM fallback
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'dummy-key-for-ci') {
      console.log("Skipping LLM fallback test - no valid API key available");
      return;
    }

    const analysisData: ComprehensiveAnalysisOutputs = {
      summary: "Test summary",
      analysis: "Test analysis", 
      highlightInsights: []
    };

    const result = await extractHighlightsFromAnalysis(
      mockDocument,
      mockAgent,
      analysisData,
      5
    );

    // When no insights provided, it should fall back to LLM extraction
    expect(result.outputs.highlights).toBeDefined();
    expect(Array.isArray(result.outputs.highlights)).toBe(true);
  });

  test("verifies line counting with prepend metadata", async () => {
    // Count actual lines in the document
    const lines = mockDocument.content.split('\n');
    console.log(`Document has ${lines.length} total lines`);
    
    // Find where content starts (after prepend)
    const prependEndIndex = lines.findIndex(line => line === "---") + 2;
    console.log(`Content starts at line ${prependEndIndex + 1} (1-based)`);
    
    // Log some key lines for debugging
    console.log(`Line 8 (0-based idx ${7}): "${lines[7]}"`);
    console.log(`Line 9 (0-based idx ${8}): "${lines[8]}"`);
    
    const analysisData: ComprehensiveAnalysisOutputs = {
      summary: "Test",
      analysis: "Test",
      highlightInsights: [
        {
          id: "line-test",
          location: "Line 9", // Should match "Line 8: This is line 8 of the content."
          suggestedHighlight: "Line 8: This is line 8 of the content."
        }
      ]
    };

    const result = await extractHighlightsFromAnalysis(
      mockDocument,
      mockAgent,
      analysisData,
      1
    );

    expect(result.outputs.highlights.length).toBe(1);
    
    const highlight = result.outputs.highlights[0];
    if (highlight.highlight && highlight.highlight.isValid) {
      const { quotedText, startOffset } = highlight.highlight;
      console.log(`Highlight found text: "${quotedText?.substring(0, 50)}..."`);
      
      // Calculate which line this offset is on
      const textBefore = mockDocument.content.substring(0, startOffset);
      const lineNumber = textBefore.split('\n').length;
      console.log(`Highlight starts on line ${lineNumber} (1-based)`);
    }
  });
});