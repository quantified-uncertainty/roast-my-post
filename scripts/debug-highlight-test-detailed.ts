#!/usr/bin/env npx tsx

/**
 * Detailed debug script showing exactly why highlights are dropped
 */

import { LineBasedLocator } from "../src/lib/text-location/line-based";
import type { LineBasedHighlight } from "../src/lib/documentAnalysis/highlightGeneration/types";

// Test document matching the unit test
const documentContent = "Line 1: This is a test document.\nLine 2: It has multiple lines.\nLine 3: For testing purposes.";

// Add a title as would be done by getDocumentFullContent
const fullContent = `# Test Document

${documentContent}`;

console.log("=== Document Analysis ===");
console.log("Full content with title:");
console.log(fullContent);
console.log("\nLines:");
fullContent.split('\n').forEach((line, idx) => {
  console.log(`Line ${idx + 1} (index ${idx}): "${line}"`);
});

// What extractHighlightsFromAnalysis creates after the fallback
const fallbackHighlights: LineBasedHighlight[] = [
  {
    description: "Test Highlight 1. This is the first highlight text",
    importance: 5,
    highlight: {
      startLineIndex: 0, // Line 1 converted to 0-based
      endLineIndex: 0,
      startCharacters: "Line 1: Th", // First 10 chars of "Line 1: This is a test document."
      endCharacters: " document." // Last 10 chars
    }
  },
  {
    description: "Test Highlight 2. This is the second highlight text",
    importance: 5,
    highlight: {
      startLineIndex: 1, // Lines 2-3, but using line 2 (1-based) -> 0-based = 1
      endLineIndex: 2,   // Line 3 (1-based) -> 0-based = 2
      startCharacters: "Line 2: It", // First 10 chars of "Line 2: It has multiple lines."
      endCharacters: " purposes." // Last 10 chars of "Line 3: For testing purposes."
    }
  }
];

console.log("\n=== Processing Highlights with LineBasedLocator ===");

const locator = new LineBasedLocator(fullContent);

fallbackHighlights.forEach((highlight, idx) => {
  console.log(`\nProcessing highlight ${idx + 1}:`);
  console.log(`  Description: ${highlight.description}`);
  console.log(`  Line indices: ${highlight.highlight.startLineIndex} to ${highlight.highlight.endLineIndex}`);
  console.log(`  Start chars: "${highlight.highlight.startCharacters}"`);
  console.log(`  End chars: "${highlight.highlight.endCharacters}"`);
  
  const result = locator.createHighlight(highlight.highlight);
  
  if (result) {
    console.log("  ✅ Successfully converted:");
    console.log(`     Start offset: ${result.startOffset}`);
    console.log(`     End offset: ${result.endOffset}`);
    console.log(`     Quoted text: "${result.quotedText}"`);
    
    // Verify the offsets
    const extracted = fullContent.substring(result.startOffset, result.endOffset);
    console.log(`     Verification: "${extracted}"`);
    console.log(`     Match: ${extracted === result.quotedText}`);
  } else {
    console.log("  ❌ Failed to convert - highlight will be dropped");
  }
});

// Now let's see what happens when the location is "Lines 1" but the content has a title prepended
console.log("\n=== Issue Analysis ===");
console.log("The problem is that:");
console.log("1. The LLM sees 'Line 1' as the first line of actual content");
console.log("2. But with the title prepended, 'Line 1' is actually at index 2 (0-based)");
console.log("3. The fallback uses the LLM's line numbers directly without adjusting for the title");
console.log("\nActual line mapping with title:");
console.log("  Line 1 (index 0): '# Test Document'");
console.log("  Line 2 (index 1): '' (empty line)");
console.log("  Line 3 (index 2): 'Line 1: This is a test document.'");
console.log("  Line 4 (index 3): 'Line 2: It has multiple lines.'");
console.log("  Line 5 (index 4): 'Line 3: For testing purposes.'");

// Test with corrected indices
console.log("\n=== Testing with Corrected Indices ===");

const correctedHighlights: LineBasedHighlight[] = [
  {
    description: "Test Highlight 1. This is the first highlight text",
    importance: 5,
    highlight: {
      startLineIndex: 2, // Actual line index for "Line 1: ..."
      endLineIndex: 2,
      startCharacters: "Line 1: Th",
      endCharacters: " document."
    }
  },
  {
    description: "Test Highlight 2. This is the second highlight text", 
    importance: 5,
    highlight: {
      startLineIndex: 3, // Actual line index for "Line 2: ..."
      endLineIndex: 4,   // Actual line index for "Line 3: ..."
      startCharacters: "Line 2: It",
      endCharacters: " purposes."
    }
  }
];

correctedHighlights.forEach((highlight, idx) => {
  console.log(`\nProcessing corrected highlight ${idx + 1}:`);
  const result = locator.createHighlight(highlight.highlight);
  
  if (result) {
    console.log("  ✅ Successfully converted");
    console.log(`     Quoted text: "${result.quotedText.substring(0, 50)}..."`);
  } else {
    console.log("  ❌ Still failed");
  }
});