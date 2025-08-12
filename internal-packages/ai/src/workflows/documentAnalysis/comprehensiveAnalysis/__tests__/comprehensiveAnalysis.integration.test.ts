import { analyzeDocument } from "../../analyzeDocument";
import type { Agent, Document } from "@roast/ai";

// Skip these tests if no API key is available or if using dummy key
const hasApiKey = !!process.env.ANTHROPIC_API_KEY && 
  process.env.ANTHROPIC_API_KEY !== 'dummy-key-for-ci';

describe("Comprehensive Analysis Integration Test", () => {
  if (!hasApiKey) {
    test.skip("requires ANTHROPIC_API_KEY to run", () => {});
    return;
  }
  const mockAgent: Agent = {
    id: "comprehensive-test",
    name: "Comprehensive Test Agent",
    version: "1.0",
    description: "Tests the comprehensive analysis workflow",
    primaryInstructions: "Analyze documents comprehensively and identify key insights",
    providesGrades: true,
  };

  test("generates analysis with highlights from highlightInsights", async () => {
    // Create a test document with clear sections
    const testDocument: Document = {
      id: "test-doc-comprehensive",
      slug: "test-doc-comprehensive",
      title: "Comprehensive Analysis Test Document",
      // This content includes prepend metadata
      content: `# Comprehensive Analysis Test Document

**Author:** Test Author
**Publication:** Test Blog
**Date Published:** January 1, 2024

---

## Introduction

This is the introduction paragraph that sets up the document's main theme.

## Main Arguments

The first main argument is presented here with supporting evidence.

The second argument builds on the first and introduces new concepts.

## Mathematical Example

Here's a simple calculation: 2 + 2 = 4

## Conclusion

The conclusion summarizes the key points and suggests future directions.`,
      author: "Test Author",
      publishedDate: "2024-01-01",
      url: "https://example.com/test",
      platforms: ["Test Blog"],
      reviews: [],
      intendedAgents: [],
    };

    // Run the comprehensive analysis
    const result = await analyzeDocument(
      testDocument,
      mockAgent,
      500, // targetWordCount
      5   // targetHighlights
    );

    // Verify we got results
    expect(result).toBeDefined();
    expect(result.analysis).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.thinking).toBeDefined();
    expect(result.highlights).toBeDefined();
    
    // Log for debugging
    console.log(`Analysis length: ${result.analysis.length}`);
    console.log(`Summary: ${result.summary.substring(0, 100)}...`);
    console.log(`Highlights found: ${result.highlights.length}`);
    
    // Should have generated some highlights
    expect(result.highlights).toBeDefined();
    expect(Array.isArray(result.highlights)).toBe(true);
    
    // If we have highlights, verify them
    if (result.highlights.length > 0) {
      console.log(`\nHighlight details:`);
      result.highlights.forEach((highlight, index) => {
        console.log(`\nHighlight ${index + 1}:`);
        console.log(`- Description: ${highlight.description?.substring(0, 100)}...`);
        console.log(`- Has highlight data: ${!!highlight.highlight}`);
        if (highlight.highlight) {
          console.log(`- Start offset: ${highlight.highlight.startOffset}`);
          console.log(`- End offset: ${highlight.highlight.endOffset}`);
          console.log(`- Quoted text: ${highlight.highlight.quotedText?.substring(0, 50)}...`);
          console.log(`- Is valid: ${highlight.highlight.isValid}`);
        }
      });
      
      // All highlights should have valid positions
      result.highlights.forEach((highlight) => {
        expect(highlight.highlight).toBeDefined();
        expect(highlight.highlight!.isValid).toBe(true);
        
        // Verify the highlight position is correct
        if (highlight.highlight) {
          const { startOffset, endOffset, quotedText } = highlight.highlight;
          expect(startOffset).toBeGreaterThanOrEqual(0);
          expect(endOffset).toBeGreaterThan(startOffset);
          expect(endOffset).toBeLessThanOrEqual(testDocument.content.length);
          
          // Extract text should match quoted text
          const extractedText = testDocument.content.substring(startOffset, endOffset);
          expect(extractedText).toBe(quotedText);
        }
      });

      // Check that highlights are after the prepend section
      const prependEnd = testDocument.content.indexOf("---\n\n") + 5;
      result.highlights.forEach((highlight) => {
        if (highlight.highlight) {
          expect(highlight.highlight.startOffset).toBeGreaterThan(prependEnd);
        }
      });
    } else {
      console.warn("No highlights were generated - this might indicate an issue with the comprehensive analysis workflow");
    }

    // Analysis should be substantial
    expect(result.analysis.length).toBeGreaterThan(200);
    
    // Should have a grade since agent provides grades
    expect(result.grade).toBeDefined();
    expect(result.grade).toBeGreaterThanOrEqual(0);
    expect(result.grade).toBeLessThanOrEqual(100);

    // Should have task results
    expect(result.tasks).toBeDefined();
    expect(result.tasks.length).toBeGreaterThan(0);
    
    // Should have at least the comprehensive analysis and highlight extraction tasks
    const taskNames = result.tasks.map(t => t.name);
    expect(taskNames).toContain("generateComprehensiveAnalysis");
    expect(taskNames).toContain("extractHighlightsFromAnalysis");
  });

  test("handles edge case where highlightInsights are empty", async () => {
    // Very minimal document that might not generate insights
    const minimalDoc: Document = {
      id: "minimal-doc",
      slug: "minimal-doc", 
      title: "Minimal Document",
      content: `# Minimal Document

**Author:** Test Author
**Publication:** Test Blog
**Date Published:** January 1, 2024

---

Short content.`,
      author: "Test Author",
      publishedDate: "2024-01-01",
      url: "",
      platforms: ["Test Blog"],
      reviews: [],
      intendedAgents: [],
    };

    const result = await analyzeDocument(minimalDoc, mockAgent, 200, 3);

    // Should still complete successfully
    expect(result).toBeDefined();
    expect(result.analysis).toBeDefined();
    expect(result.summary).toBeDefined();
    
    // May or may not have highlights for minimal content
    expect(result.highlights).toBeDefined();
    expect(Array.isArray(result.highlights)).toBe(true);
    
    console.log(`Minimal doc highlights: ${result.highlights.length}`);
  });

  test("verifies line number to offset conversion with prepend", async () => {
    // Document with specific content at known line numbers
    const lineNumberDoc: Document = {
      id: "line-test",
      slug: "line-test",
      title: "Line Number Test",
      content: `# Line Number Test

**Author:** Test Author
**Publication:** Test Blog
**Date Published:** January 1, 2024

---

Line 8: This is line 8 after the prepend.
Line 9: This line contains important content.
Line 10: Another line with key information.

Line 12: After a blank line.

## Section at Line 14

Line 16: Content in the section.`,
      author: "Test Author",
      publishedDate: "2024-01-01",
      url: "",
      platforms: ["Test Blog"],
      reviews: [],
      intendedAgents: [],
    };

    const result = await analyzeDocument(lineNumberDoc, mockAgent, 300, 3);

    // Log line information for debugging
    console.log("\nLine number test results:");
    console.log(`Total highlights: ${result.highlights.length}`);
    
    if (result.highlights.length > 0) {
      const lines = lineNumberDoc.content.split('\n');
      console.log(`\nDocument has ${lines.length} lines`);
      
      // Find where the prepend ends
      const prependEndLine = lines.findIndex(line => line === "---") + 2; // +2 for the line after ---
      console.log(`Content starts at line ${prependEndLine} (0-indexed)`);
      
      result.highlights.forEach((highlight, i) => {
        if (highlight.highlight) {
          const { startOffset, quotedText } = highlight.highlight;
          // Calculate which line this offset corresponds to
          const textUpToOffset = lineNumberDoc.content.substring(0, startOffset);
          const lineNumber = textUpToOffset.split('\n').length;
          console.log(`\nHighlight ${i + 1}:`);
          console.log(`- Starts at line ${lineNumber}`);
          console.log(`- Text: "${quotedText?.substring(0, 50)}..."`);
        }
      });
    }
    
    // All highlights should still be valid
    result.highlights.forEach((highlight) => {
      if (highlight.highlight) {
        expect(highlight.highlight.isValid).toBe(true);
      }
    });
  });
});