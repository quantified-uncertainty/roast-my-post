import { analyzeSpellingGrammarDocument } from "../spellingGrammarWorkflow";
import type { Document } from "../../../../types/documents";
import type { Agent } from "../../../../types/agentSchema";

describe("Spelling & Grammar Workflow Integration Tests", () => {
  const TIMEOUT = 60000; // 60 seconds

  const testDocument: Document = {
    id: "test-doc",
    title: "Document with Various Errors",
    author: "Test Author",
    content: `The Future of Artificial Inteligence

Artificial intelligence have come a long way since it's inception in the 1950s. Today, AI systems can perform tasks that was once thought to be the exclusive domain of human intelligence.

One of the most signifcant breakthroughs in recent years has been the developement of large language models. These models, trained on vast amounts of text data, can generate human-like text, answer questions, and even write code. However, their are still many chalenges to overcome.

For example, AI systems often struggle with understanding context and nuance. They may produce outputs that are grammatically correct but semantically nonsensical. This is because they lack the real-world experiance and common sense that humans take for granted.

Despite these limitations, the potential applications of AI are enormus. From healthcare to education, from transportation to entertainment, AI is poised to revolutionize every aspect of our lifes. Companies like google, microsoft, and amazon are investing billions of dollars in AI research and development.

As we look to the future, its clear that AI will play an increasingly important role in our society. The question is not whether AI will transform our world, but how we can ensure that this transformation benefits everyone. We must carefully consider the ethical implications of AI and work to create systems that are fair, transparent, and aligned with human values.

In conclusion, while AI presents both opportunities and chalenges, one thing is certain: the future belongs to those who can harness it's power responsibly.`,
    importUrl: "https://example.com/ai-article",
    platform: "test",
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const grammarAgent: Agent = {
    id: "grammar-test",
    name: "Grammar Checker",
    agentVersionId: "v1",
    primaryInstructions: "Find all spelling, grammar, punctuation, and capitalization errors. Be thorough and precise.",
    purpose: "ASSESSOR",
    description: "Checks documents for spelling and grammar errors",
    providesGrades: true,
    extendedCapabilityId: "spelling-grammar-"
  };

  test("analyzes real document with multiple error types", async () => {
    const result = await analyzeSpellingGrammarDocument(
      testDocument,
      grammarAgent,
      50 // Allow up to 50 highlights to see all errors
    );

    console.log(`\n=== Spelling & Grammar Analysis Results ===`);
    console.log(`Total errors found: ${result.highlights.length}`);
    console.log(`Grade: ${result.grade}%`);
    console.log(`\nFirst 10 errors:`);
    
    result.highlights.slice(0, 10).forEach((highlight, i) => {
      console.log(`\n[${i + 1}] "${highlight.highlight.quotedText}"`);
      console.log(`    ${highlight.description}`);
    });

    // Verify result structure
    expect(result).toHaveProperty("thinking", "");
    expect(result).toHaveProperty("analysis");
    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("grade");
    expect(result).toHaveProperty("highlights");
    expect(result).toHaveProperty("tasks");

    // Should find multiple errors
    expect(result.highlights.length).toBeGreaterThan(10);

    // Check that known errors are found
    const highlightTexts = result.highlights.map(h => h.highlight.quotedText.toLowerCase());
    
    // Spelling errors
    expect(highlightTexts.some(text => text.includes("inteligence"))).toBe(true);
    expect(highlightTexts.some(text => text.includes("signifcant"))).toBe(true);
    expect(highlightTexts.some(text => text.includes("developement"))).toBe(true);
    expect(highlightTexts.some(text => text.includes("experiance"))).toBe(true);
    expect(highlightTexts.some(text => text.includes("chalenges"))).toBe(true);
    expect(highlightTexts.some(text => text.includes("enormus"))).toBe(true);
    
    // Grammar errors
    expect(highlightTexts.some(text => text.includes("have") && result.highlights.find(h => 
      h.highlight.quotedText.toLowerCase().includes("have"))?.description.includes("intelligence")
    )).toBe(true);
    
    // Check analysis content
    expect(result.analysis).toContain("Spelling & Grammar Analysis");
    expect(result.analysis).toContain("Error Summary");
    expect(result.analysis).toContain("Document Quality Score");
    
    // Check tasks
    expect(result.tasks.length).toBeGreaterThan(0);
    result.tasks.forEach(task => {
      expect(task.status).toBe("success");
      expect(task.metadata).toHaveProperty("errorsFound");
    });
  }, TIMEOUT);

  test("handles empty document gracefully", async () => {
    const emptyDoc: Document = {
      ...testDocument,
      content: ""
    };

    const result = await analyzeSpellingGrammarDocument(
      emptyDoc,
      grammarAgent,
      10
    );

    expect(result.highlights).toHaveLength(0);
    expect(result.summary).toBe("No spelling or grammar errors detected.");
    expect(result.tasks).toHaveLength(0);
  }, TIMEOUT);

  test("processes multi-line document with consistent line numbering", async () => {
    const multiLineDoc: Document = {
      ...testDocument,
      content: `Line 1: This line have an error.
Line 2: Everything is correct here.
Line 3: Their are mistakes in this line.
Line 4: Another correct line.
Line 5: This line contain multiple erors.`
    };

    const result = await analyzeSpellingGrammarDocument(
      multiLineDoc,
      grammarAgent,
      20
    );

    // Should find errors on lines 1, 3, and 5
    expect(result.highlights.length).toBeGreaterThanOrEqual(3);

    // Verify highlights are in document order (by startOffset)
    for (let i = 1; i < result.highlights.length; i++) {
      expect(result.highlights[i].highlight.startOffset).toBeGreaterThanOrEqual(
        result.highlights[i - 1].highlight.startOffset
      );
    }

    console.log(`\n=== Multi-line Document Results ===`);
    console.log(`Errors found: ${result.highlights.length}`);
    result.highlights.forEach((h, i) => {
      console.log(`[${i + 1}] Offset ${h.highlight.startOffset}: "${h.highlight.quotedText}" - ${h.description}`);
    });
  }, TIMEOUT);
});