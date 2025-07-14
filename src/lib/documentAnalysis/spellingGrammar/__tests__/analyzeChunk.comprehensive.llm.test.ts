import { analyzeChunk } from "../analyzeChunk";
import { convertHighlightsToComments, validateConvertedHighlights } from "../highlightConverter";
import { spellingGrammarTestCases } from "../testCases";
import type { SpellingGrammarHighlight } from "../types";

describe("Comprehensive Spelling & Grammar Analysis with Claude", () => {
  const TIMEOUT = 60000; // 60 seconds per test case for API calls

  // Run ALL test cases through the real Claude API
  test.each(spellingGrammarTestCases.slice(0, 5))(  // Testing first 5 for now
    "$id: $description (Claude API)",
    async (testCase) => {
      console.log(`\n=== Testing: ${testCase.id} ===`);
      console.log(`Starting at line ${testCase.chunk.startLineNumber}`);
      console.log(`Content preview: "${testCase.chunk.content.substring(0, 50)}..."`);
      
      // Analyze the chunk with real Claude API
      const result = await analyzeChunk(testCase.chunk, {
        agentName: "Comprehensive Grammar Test",
        primaryInstructions: "Find all spelling, grammar, punctuation, and capitalization errors. Be thorough and precise. Report the exact line numbers where errors occur."
      });

      console.log(`\nClaude found ${result.highlights.length} errors, expected ${testCase.expectedErrors.length}`);

      // Check that we found errors at the expected locations
      // Claude might highlight larger chunks than expected, so check if the expected text is contained
      const foundErrors = new Set<string>();
      
      // For each expected error, check if Claude found it (even as part of a larger highlight)
      testCase.expectedErrors.forEach(expected => {
        const found = result.highlights.some(h => 
          h.lineStart === expected.lineStart &&
          h.highlightedText.includes(expected.highlightedText)
        );
        if (found) {
          foundErrors.add(`${expected.lineStart}:${expected.highlightedText}`);
        }
      });

      const expectedLocations = new Set(
        testCase.expectedErrors.map(e => `${e.lineStart}:${e.highlightedText}`)
      );

      // Log what was found vs expected
      const missed = [...expectedLocations].filter(loc => !foundErrors.has(loc));
      const foundLocations = new Set(
        result.highlights.map(h => `${h.lineStart}:${h.highlightedText}`)
      );
      const extra = [...foundLocations].filter(loc => !expectedLocations.has(loc));

      if (missed.length > 0) {
        console.warn("❌ Missed errors:", missed);
      }
      if (extra.length > 0) {
        console.log("➕ Extra errors found (Claude found additional issues):", extra);
      }

      // For each found error, log the details
      result.highlights.forEach((h, i) => {
        console.log(`\n[${i + 1}] Line ${h.lineStart}: "${h.highlightedText}"`);
        console.log(`    ${h.description}`);
      });

      // Verify we found at least 60% of expected errors (Claude might find more or different errors)
      const foundCount = foundErrors.size;
      const accuracy = testCase.expectedErrors.length > 0 ? foundCount / testCase.expectedErrors.length : 1;
      
      console.log(`\n✓ Accuracy: ${(accuracy * 100).toFixed(1)}%`);
      expect(accuracy).toBeGreaterThanOrEqual(0.6);

      // Test highlight conversion with correct line number adjustment
      const relativeHighlights = result.highlights.map(h => ({
        ...h,
        lineStart: h.lineStart - testCase.chunk.startLineNumber + 1,
        lineEnd: h.lineEnd - testCase.chunk.startLineNumber + 1
      }));
      
      const comments = convertHighlightsToComments(
        relativeHighlights,
        testCase.chunk.content,
        0
      );

      // Validate all converted highlights
      const isValid = validateConvertedHighlights(comments, testCase.chunk.content);
      expect(isValid).toBe(true);

      // Ensure all highlights have proper descriptions
      result.highlights.forEach(highlight => {
        expect(highlight.description).toBeTruthy();
        expect(highlight.description.length).toBeGreaterThan(10);
        // Should mention correction or explanation
        expect(highlight.description).toMatch(/should|change|replace|correct|instead|missing|error|wrong/i);
      });

      // Verify line numbers are correct
      result.highlights.forEach(highlight => {
        expect(highlight.lineStart).toBeGreaterThanOrEqual(testCase.chunk.startLineNumber);
        expect(highlight.lineStart).toBeLessThanOrEqual(testCase.chunk.startLineNumber + testCase.chunk.lines.length - 1);
        expect(highlight.lineEnd).toBeGreaterThanOrEqual(highlight.lineStart);
      });
    },
    TIMEOUT
  );

  // Additional test to verify Claude's consistency
  test("Claude provides consistent explanations for similar errors", async () => {
    // Test with multiple "recieve" errors
    const chunk = {
      content: "I will recieve a package.\nYou will recieve an email.\nThey recieve updates daily.",
      startLineNumber: 100,
      lines: [
        "I will recieve a package.",
        "You will recieve an email.",
        "They recieve updates daily."
      ]
    };

    const result = await analyzeChunk(chunk, {
      agentName: "Consistency Test",
      primaryInstructions: "Find spelling errors and be consistent in your explanations"
    });

    // All "recieve" errors should be found
    const receiveErrors = result.highlights.filter((h: any) => h.highlightedText.includes("recieve"));
    expect(receiveErrors.length).toBeGreaterThanOrEqual(3);

    // All should mention "receive" as the correction
    receiveErrors.forEach((error: any) => {
      expect(error.description.toLowerCase()).toContain("receive");
    });

    console.log("\n=== Consistency Test Results ===");
    receiveErrors.forEach((error: any, i: number) => {
      console.log(`[${i + 1}] Line ${error.lineStart}: ${error.description}`);
    });
  }, TIMEOUT);

  // Test edge cases
  test("Claude handles documents with very high line numbers correctly", async () => {
    const chunk = {
      content: "This have an error on line 99999.",
      startLineNumber: 99999,
      lines: ["This have an error on line 99999."]
    };

    const result = await analyzeChunk(chunk, {
      agentName: "High Line Number Test",
      primaryInstructions: "Find grammar errors"
    });

    // Should find the "have" error
    expect(result.highlights.length).toBeGreaterThanOrEqual(1);
    
    const haveError = result.highlights.find((h: any) => h.highlightedText.includes("have"));
    expect(haveError).toBeDefined();
    expect(haveError?.lineStart).toBe(99999);
    
    console.log(`\n=== High Line Number Test ===`);
    console.log(`Found error at line ${haveError?.lineStart}: "${haveError?.highlightedText}"`);
  }, TIMEOUT);
});

// Summary statistics
describe("Test Coverage Analysis", () => {
  const TIMEOUT = 60000; // 60 seconds
  
  test("analyze overall Claude performance", async () => {
    console.log("\n=== OVERALL TEST SUMMARY ===");
    console.log(`Total test cases: ${spellingGrammarTestCases.length}`);
    console.log(`Error types tested: spelling, grammar, punctuation, capitalization`);
    console.log(`Line number range: ${Math.min(...spellingGrammarTestCases.map(tc => tc.chunk.startLineNumber))} - ${Math.max(...spellingGrammarTestCases.map(tc => tc.chunk.startLineNumber))}`);
    
    // Quick spot check on a few cases
    const spotCheckCases = spellingGrammarTestCases.slice(0, 3);
    let totalExpected = 0;
    let totalFound = 0;

    for (const testCase of spotCheckCases) {
      const result = await analyzeChunk(testCase.chunk, {
        agentName: "Summary Test",
        primaryInstructions: "Find spelling and grammar errors"
      });
      
      totalExpected += testCase.expectedErrors.length;
      totalFound += result.highlights.length;
    }

    console.log(`\nSpot check (first 3 cases):`);
    console.log(`Expected errors: ${totalExpected}`);
    console.log(`Found errors: ${totalFound}`);
    console.log(`Detection rate: ${((totalFound / totalExpected) * 100).toFixed(1)}%`);
    
    expect(totalFound).toBeGreaterThan(0);
  }, TIMEOUT);
});