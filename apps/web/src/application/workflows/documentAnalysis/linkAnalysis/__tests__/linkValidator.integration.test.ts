import { analyzeLinkDocument } from "../linkAnalysisWorkflow";
import type { Agent, Document } from "@roast/ai";

// This is an integration test - it makes real HTTP requests to validate URLs
// Increase Jest timeout to accommodate network requests
jest.setTimeout(30000);

describe("Link Validator Integration Test", () => {
  const mockAgent: Agent = {
    id: "link-validator",
    name: "Link Validator",
    version: "1.0",
    description: "Validates links in documents",
    primaryInstructions: "Check all links for validity and accessibility",
    providesGrades: false,
  };

  test("validates links with correct highlight positions in short document", async () => {
    // Create a short document with prepend and 2-3 links
    const testDocument: Document = {
      id: "test-doc-links",
      slug: "test-doc-links",
      title: "Test Document with Links",
      // This content includes prepend metadata
      content: `# Test Document with Links

**Author:** Test Author
**Publication:** Test Blog
**Date Published:** January 1, 2024

---

This is a test document with some links to validate.

First, let's link to [Google](https://www.google.com) for searching.

Here's another paragraph with a link to [GitHub](https://github.com) in the middle of the text.

And finally, here's a link to a [broken URL](https://this-url-definitely-does-not-exist-12345.com) that should fail validation.

The end of the document.`,
      author: "Test Author",
      publishedDate: "2024-01-01",
      url: "https://example.com/test",
      platforms: ["Test Blog"],
      reviews: [],
      intendedAgents: [],
    };

    // Run the link analysis
    const result = await analyzeLinkDocument(
      testDocument,
      mockAgent,
      3 // Request up to 3 highlights
    );

    // Verify we got results
    expect(result).toBeDefined();
    expect(result.highlights).toBeDefined();
    
    // Should have exactly 3 highlights - one for each link in the document
    expect(result.highlights).toHaveLength(3);
    expect(result.highlights.length).toBe(3);

    // Find the highlights for each link type
    const googleHighlight = result.highlights.find(h => h.description.includes("google.com"));
    const githubHighlight = result.highlights.find(h => h.description.includes("github.com"));
    const brokenLinkHighlight = result.highlights.find(h => h.description.includes("this-url-definitely-does-not-exist-12345.com"));
    
    // All three highlights should exist
    expect(googleHighlight).toBeDefined();
    expect(githubHighlight).toBeDefined();
    expect(brokenLinkHighlight).toBeDefined();
    
    // Valid links should have success indicators
    expect(googleHighlight!.description).toMatch(/✅|verified|success/i);
    expect(googleHighlight!.grade).toBeGreaterThan(80);
    expect(githubHighlight!.description).toMatch(/✅|verified|success/i);
    expect(githubHighlight!.grade).toBeGreaterThan(80);
    
    // Broken link should have error indicators
    expect(brokenLinkHighlight!.description).toMatch(/❌|broken|inaccessible|not.*exist|failed|error/i);
    expect(brokenLinkHighlight!.grade).toBe(0);

    // Verify highlight position is correct and captures the broken URL
    const highlight = brokenLinkHighlight?.highlight;
    expect(highlight).toBeDefined();
    if (highlight) {
      const { startOffset, endOffset, quotedText, isValid } = highlight;
      
      // Should be marked as valid highlight (the highlight itself is valid, even though the URL is broken)
      expect(isValid).toBe(true);
      
      // The highlight should capture the broken URL
      expect(quotedText).toContain("https://this-url-definitely-does-not-exist-12345.com");
      
      // Verify the offsets point to the correct location in the content
      const extractedText = testDocument.content.substring(startOffset, endOffset);
      expect(extractedText).toBe(quotedText);
      
      // The offset should be after the prepend metadata
      const prependEnd = testDocument.content.indexOf("---\n\n") + 5;
      expect(startOffset).toBeGreaterThan(prependEnd);
      
      // The broken link appears in the last paragraph
      const lastParagraphStart = testDocument.content.indexOf("And finally");
      expect(startOffset).toBeGreaterThan(lastParagraphStart);
    }
    
    // All highlights should have valid positions
    result.highlights.forEach((highlight) => {
      expect(highlight.highlight).toBeDefined();
      expect(highlight.highlight!.isValid).toBe(true);
    });

    // Verify the analysis mentions the broken link
    expect(result.analysis).toBeDefined();
    expect(result.analysis.toLowerCase()).toContain("link");
    expect(result.analysis.toLowerCase()).toMatch(/broken|failed|inaccessible|1/);
    
    // Summary should indicate there's a problem
    expect(result.summary).toBeDefined();
    expect(result.summary.toLowerCase()).toMatch(/issue|problem|broken|1/);
  }, 30000);

  test("handles document with no links correctly", async () => {
    const noLinksDoc: Document = {
      id: "no-links",
      slug: "no-links", 
      title: "Document Without Links",
      content: `# Document Without Links

**Author:** Test Author
**Publication:** Test Blog
**Date Published:** January 1, 2024

---

This document has no links at all. Just plain text content.

Another paragraph with more text but still no links.`,
      author: "Test Author",
      publishedDate: "2024-01-01",
      url: "",
      platforms: ["Test Blog"],
      reviews: [],
      intendedAgents: [],
    };

    const result = await analyzeLinkDocument(noLinksDoc, mockAgent, 3);

    // Should complete successfully
    expect(result).toBeDefined();
    
    // Should have exactly 0 highlights since there are no links to validate
    expect(result.highlights).toHaveLength(0);
    expect(result.highlights.length).toBe(0);
    
    // Analysis should explicitly state that 0 links were found
    expect(result.analysis).toMatch(/Total\s+Links\s+Found:\*?\*?\s*0/i);
    
    // Summary should also indicate no links
    expect(result.summary.toLowerCase()).toContain("no");
    expect(result.summary.toLowerCase()).toContain("link");
  }, 30000);

  test("correctly positions highlights with markdown prepend", async () => {
    // Document where we know exact positions
    const precisePosDoc: Document = {
      id: "precise-pos",
      slug: "precise-pos",
      title: "Precise Position Test",
      content: `# Precise Position Test

**Author:** Test Author
**Publication:** Test Blog
**Date Published:** January 1, 2024

---

Line after prepend. Here's a link: [Test](https://example.com).`,
      author: "Test Author",
      publishedDate: "2024-01-01", 
      url: "",
      platforms: ["Test Blog"],
      reviews: [],
      intendedAgents: [],
    };

    const result = await analyzeLinkDocument(precisePosDoc, mockAgent, 1);

    // Should find exactly 1 highlight for the single link in the document
    expect(result.highlights).toHaveLength(1);
    expect(result.highlights.length).toBe(1);

    const highlight = result.highlights[0];
    if (highlight.highlight) {
      // Find where "https://example.com" appears in the content
      const urlIndex = precisePosDoc.content.indexOf("https://example.com");
      expect(urlIndex).toBeGreaterThan(0);
      
      // The highlight should include this URL
      expect(highlight.highlight.quotedText).toContain("https://example.com");
      
      // Verify the highlight position is correct
      const extracted = precisePosDoc.content.substring(
        highlight.highlight.startOffset,
        highlight.highlight.endOffset
      );
      expect(extracted).toBe(highlight.highlight.quotedText);
      
      // Should be marked as a valid/verified link
      expect(highlight.description).toMatch(/✅|verified|success/i);
      expect(highlight.grade).toBeGreaterThan(80);
      
      // Highlight should have valid position
      expect(highlight.highlight.isValid).toBe(true);
    }
  }, 30000);
});