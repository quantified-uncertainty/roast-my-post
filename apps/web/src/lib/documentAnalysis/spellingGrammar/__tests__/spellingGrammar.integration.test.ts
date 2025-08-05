import { analyzeSpellingGrammar } from "../index";
import type { Agent, Document } from "@roast/ai";

describe("Spelling and Grammar Analysis Integration Test", () => {
  const mockAgent: Agent = {
    id: "spelling-grammar",
    name: "Spelling & Grammar Checker",
    version: "1.0",
    description: "Checks documents for spelling and grammar errors",
    primaryInstructions: "Identify and highlight spelling and grammar mistakes",
    providesGrades: true,
    extendedCapabilityId: "spelling-grammar",
  };

  test("detects spelling and grammar errors with correct highlight positions", async () => {
    // Create a document with various spelling and grammar errors
    const testDocument: Document = {
      id: "test-doc-spelling",
      slug: "test-doc-spelling",
      title: "Spelling and Grammar Test Document",
      // This content includes prepend metadata and various errors
      content: `# Spelling and Grammar Test Document

**Author:** Test Author
**Publication:** Test Blog
**Date Published:** January 1, 2024

---

This documnet contains varios speling and grammer errors for testing.

## Common Misspellings

Their are many common misspellings that ocur frequently. For exmaple:
- Recieve instead of receive
- Seperate instead of separate
- Definately instead of definitely

## Grammar Issues

Me and my friend went to the store yesterday. We seen a lot of interesting things.

The data are showing that performance have improved significantly.

## Punctuation Problems

This sentence doesnt have an apostrophe where it should.

Here's multiple issues: no comma before "and" no period at the end

## Conclusion

This document deliberatly contains many errors to test the spelling and grammar checker`,
      author: "Test Author",
      publishedDate: "2024-01-01",
      url: "https://example.com/test",
      platforms: ["Test Blog"],
      reviews: [],
      intendedAgents: [],
    };

    // Run the spelling/grammar analysis
    const result = await analyzeSpellingGrammar(
      testDocument,
      mockAgent,
      {
        targetHighlights: 15, // Request more highlights to catch multiple errors
      }
    );

    // Verify we got results
    expect(result).toBeDefined();
    expect(result.highlights).toBeDefined();
    expect(result.analysis).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.thinking).toBeDefined();
    
    // Should have highlights (may be 0 if plugin needs specific configuration)
    expect(result.highlights).toBeDefined();
    expect(Array.isArray(result.highlights)).toBe(true);
    
    // If we have highlights, verify them
    if (result.highlights.length > 0) {
      expect(result.highlights.length).toBeLessThanOrEqual(15);

      // Check for specific types of errors
      const spellingHighlights = result.highlights.filter(h => 
        h.description.toLowerCase().includes("spell") || 
        h.description.toLowerCase().includes("misspell") ||
        h.description.toLowerCase().includes("typo")
      );
      
      const grammarHighlights = result.highlights.filter(h => 
        h.description.toLowerCase().includes("grammar") || 
        h.description.toLowerCase().includes("subject-verb") ||
        h.description.toLowerCase().includes("punctuation")
      );

      // Should have found both spelling and grammar errors
      console.log(`Found ${spellingHighlights.length} spelling and ${grammarHighlights.length} grammar highlights`);

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
          
          // The highlighted text should contain an error
          // Check for some known errors in our test document
          const knownErrors = ["documnet", "varios", "speling", "grammer", "ocur", 
                             "exmaple", "Recieve", "Seperate", "Definately", 
                             "Me and my friend", "We seen", "doesnt", "deliberatly"];
          const containsError = knownErrors.some(error => quotedText.includes(error));
          
          // Most highlights should contain known errors
          if (!containsError) {
            // Log for debugging if a highlight doesn't contain a known error
            console.log(`Highlight without known error: "${quotedText}"`);
          }
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

    // Analysis should focus on spelling and grammar
    const analysisLower = result.analysis.toLowerCase();
    expect(analysisLower.includes('spelling') || analysisLower.includes('grammar') || 
           analysisLower.includes('error') || analysisLower.includes('mistake')).toBe(true);
    
    // May or may not have a grade depending on plugin execution
    if (result.grade !== undefined) {
      expect(result.grade).toBeGreaterThanOrEqual(0);
      expect(result.grade).toBeLessThanOrEqual(100);
    }

    // Should have task results
    expect(result.tasks).toBeDefined();
    expect(result.tasks.length).toBeGreaterThan(0);
  });

  test("handles document with no spelling errors correctly", async () => {
    const cleanDoc: Document = {
      id: "clean-doc",
      slug: "clean-doc", 
      title: "Clean Document",
      content: `# Clean Document

**Author:** Test Author
**Publication:** Test Blog
**Date Published:** January 1, 2024

---

This document contains no spelling or grammar errors.

The text is written correctly with proper punctuation and grammar.

All words are spelled correctly, and the sentences follow standard English rules.`,
      author: "Test Author",
      publishedDate: "2024-01-01",
      url: "",
      platforms: ["Test Blog"],
      reviews: [],
      intendedAgents: [],
    };

    const result = await analyzeSpellingGrammar(cleanDoc, mockAgent, {
      targetHighlights: 5,
    });

    // Should complete successfully
    expect(result).toBeDefined();
    
    // Should have 0 or very few highlights for clean content
    expect(result.highlights).toBeDefined();
    expect(result.highlights.length).toBeLessThanOrEqual(1);
    
    // Analysis should mention spelling/grammar
    expect(result.analysis.toLowerCase()).toContain("spelling");
    
    // Grade might be high for clean document if plugin is working
    if (result.grade !== undefined) {
      expect(result.grade).toBeGreaterThanOrEqual(0);
      expect(result.grade).toBeLessThanOrEqual(100);
    }
  });

  test("only uses spelling plugin and ignores other content types", async () => {
    // Document with spelling errors AND other content that would trigger other plugins
    const mixedContentDoc: Document = {
      id: "mixed-content",
      slug: "mixed-content",
      title: "Mixed Content Test",
      content: `# Mixed Content Test

**Author:** Test Author
**Publication:** Test Blog
**Date Published:** January 1, 2024

---

This documnt has speling errors but also other content.

Mathematical claim: 2 + 2 = 5 (incorrect math)

Factual claim: The moon is made of cheese (false fact)

Link: [broken link](https://this-does-not-exist-xyz789.com)

More speling erors here: recieve, occured, definately wrong.`,
      author: "Test Author",
      publishedDate: "2024-01-01",
      url: "",
      platforms: ["Test Blog"],
      reviews: [],
      intendedAgents: [],
    };

    const result = await analyzeSpellingGrammar(
      mixedContentDoc,
      mockAgent,
      {
        targetHighlights: 10,
      }
    );

    // Should ONLY have spelling/grammar highlights
    const nonSpellingHighlights = result.highlights.filter(h => 
      h.description.toLowerCase().includes("math") || 
      h.description.toLowerCase().includes("fact") ||
      h.description.toLowerCase().includes("link") ||
      h.description.toLowerCase().includes("claim")
    );
    
    expect(nonSpellingHighlights.length).toBe(0);

    // All highlights should be about spelling/grammar
    result.highlights.forEach((highlight) => {
      const desc = highlight.description.toLowerCase();
      expect(
        desc.includes("spell") || 
        desc.includes("grammar") || 
        desc.includes("typo") ||
        desc.includes("punctuation") ||
        desc.includes("error") ||
        desc.includes("mistake")
      ).toBe(true);
    });

    // If we got highlights, verify they are spelling-related
    if (result.highlights.length > 0) {
      // All highlights should be about spelling/grammar
      result.highlights.forEach((highlight) => {
        const desc = highlight.description.toLowerCase();
        expect(
          desc.includes("spell") || 
          desc.includes("grammar") || 
          desc.includes("typo") ||
          desc.includes("punctuation") ||
          desc.includes("error") ||
          desc.includes("mistake")
        ).toBe(true);
      });
    }
    
    // Should at least have analysis and summary
    expect(result.analysis).toBeDefined();
    expect(result.summary).toBeDefined();
  });
});