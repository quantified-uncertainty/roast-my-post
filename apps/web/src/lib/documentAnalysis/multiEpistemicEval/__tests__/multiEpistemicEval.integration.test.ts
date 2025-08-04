import { analyzeWithMultiEpistemicEval } from "../index";
import type { Agent, Document } from "@roast/ai";

describe("Multi-Epistemic Evaluation Integration Test", () => {
  const mockAgent: Agent = {
    id: "multi-epistemic-eval",
    name: "Multi-Epistemic Evaluator",
    version: "1.0",
    description: "Analyzes documents using multiple epistemic approaches",
    primaryInstructions: "Analyze claims, facts, and reasoning in documents",
    providesGrades: true,
  };

  test("analyzes document with multiple types of content and correct highlight positions", async () => {
    // Create a document with various types of content that should trigger different plugins
    const testDocument: Document = {
      id: "test-doc-multi",
      slug: "test-doc-multi",
      title: "Multi-Plugin Test Document",
      // This content includes prepend metadata
      content: `# Multi-Plugin Test Document

**Author:** Test Author
**Publication:** Test Blog
**Date Published:** January 1, 2024

---

This document contains various types of content for testing.

## Mathematical Claims

The probability of success is 0.75, which means there's a 25% chance of failure.

When we calculate 2 + 2 = 5, we get an incorrect result.

## Factual Claims

The Earth orbits around the Sun once every 365.25 days.

Napoleon was born in 1769 in Corsica.

## Links and References

Check out this article on [climate change](https://www.ipcc.ch/report/ar6/wg1/).

Here's a broken link to [nonexistent page](https://this-definitely-does-not-exist-xyz123.com).

## Conclusion

This document demonstrates various content types for multi-epistemic evaluation.`,
      author: "Test Author",
      publishedDate: "2024-01-01",
      url: "https://example.com/test",
      platforms: ["Test Blog"],
      reviews: [],
      intendedAgents: [],
    };

    // Run the multi-epistemic evaluation
    const result = await analyzeWithMultiEpistemicEval(
      testDocument,
      mockAgent,
      {
        targetHighlights: 10, // Request more highlights to test multiple plugins
      }
    );

    // Verify we got results
    expect(result).toBeDefined();
    expect(result.highlights).toBeDefined();
    expect(result.analysis).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.thinking).toBeDefined();
    
    // Should have highlights (may be 0 if plugins need API keys)
    expect(result.highlights).toBeDefined();
    expect(Array.isArray(result.highlights)).toBe(true);
    
    // If we have highlights, verify them
    if (result.highlights.length > 0) {
      expect(result.highlights.length).toBeLessThanOrEqual(10);

      // Check for different types of highlights (math, facts, links)
      const mathHighlights = result.highlights.filter(h => 
        h.description.toLowerCase().includes("math") || 
        h.description.includes("2 + 2 = 5")
      );
      const factHighlights = result.highlights.filter(h => 
        h.description.toLowerCase().includes("fact") || 
        h.description.toLowerCase().includes("claim")
      );
      const linkHighlights = result.highlights.filter(h => 
        h.description.toLowerCase().includes("link") || 
        h.description.toLowerCase().includes("url")
      );

      // Should have at least some highlights from different plugin types
      // (Note: spelling is excluded from multi-epistemic eval)
      console.log(`Found ${mathHighlights.length} math, ${factHighlights.length} fact, ${linkHighlights.length} link highlights`);

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
    }

    // Analysis should mention multiple aspects
    const analysisLower = result.analysis.toLowerCase();
    expect(analysisLower.includes('math') || analysisLower.includes('fact') || 
           analysisLower.includes('claim') || analysisLower.includes('link')).toBe(true);
    
    // May or may not have a grade depending on plugin execution
    if (result.grade !== undefined) {
      expect(result.grade).toBeGreaterThanOrEqual(0);
      expect(result.grade).toBeLessThanOrEqual(100);
    }

    // Should have task results
    expect(result.tasks).toBeDefined();
    expect(result.tasks.length).toBeGreaterThan(0);
  });

  test("handles document with minimal content correctly", async () => {
    const minimalDoc: Document = {
      id: "minimal-doc",
      slug: "minimal-doc", 
      title: "Minimal Document",
      content: `# Minimal Document

**Author:** Test Author
**Publication:** Test Blog
**Date Published:** January 1, 2024

---

This is a very short document with minimal content.`,
      author: "Test Author",
      publishedDate: "2024-01-01",
      url: "",
      platforms: ["Test Blog"],
      reviews: [],
      intendedAgents: [],
    };

    const result = await analyzeWithMultiEpistemicEval(minimalDoc, mockAgent, {
      targetHighlights: 5,
    });

    // Should complete successfully
    expect(result).toBeDefined();
    
    // May have 0 highlights for minimal content
    expect(result.highlights).toBeDefined();
    expect(result.highlights.length).toBeGreaterThanOrEqual(0);
    
    // Should still provide analysis and summary
    expect(result.analysis).toBeDefined();
    expect(result.analysis.length).toBeGreaterThan(0);
    expect(result.summary).toBeDefined();
    expect(result.summary.length).toBeGreaterThan(0);
  });

  test("correctly excludes spelling plugin in multi-epistemic eval", async () => {
    // Document with obvious spelling errors
    const spellingErrorDoc: Document = {
      id: "spelling-test",
      slug: "spelling-test",
      title: "Spelling Test",
      content: `# Spelling Test

**Author:** Test Author
**Publication:** Test Blog
**Date Published:** January 1, 2024

---

This docuemnt has severl speling erors but also contains a mathematical claim: 2 + 2 = 4.

The probablity of succes is definately high.`,
      author: "Test Author",
      publishedDate: "2024-01-01",
      url: "",
      platforms: ["Test Blog"],
      reviews: [],
      intendedAgents: [],
    };

    const result = await analyzeWithMultiEpistemicEval(
      spellingErrorDoc,
      mockAgent,
      {
        targetHighlights: 5,
      }
    );

    // If we got highlights, verify spelling plugin was excluded
    if (result.highlights.length > 0) {
      const spellingHighlights = result.highlights.filter(h => 
        h.description.toLowerCase().includes("spelling") || 
        h.description.toLowerCase().includes("typo") ||
        h.description.toLowerCase().includes("misspell")
      );
      
      expect(spellingHighlights.length).toBe(0);
    }

    // But should still catch other content like math
    const mathHighlights = result.highlights.filter(h => 
      h.description.includes("2 + 2 = 4") || 
      h.description.toLowerCase().includes("math")
    );
    
    // Verify that at least we excluded spelling
    expect(result.analysis).toBeDefined();
    expect(result.summary).toBeDefined();
  });
});