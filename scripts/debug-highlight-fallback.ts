#!/usr/bin/env npx tsx

/**
 * Debug the exact fallback scenario to see why one highlight is dropped
 */

import { LineBasedLocator } from "../src/lib/text-location/line-based";

// Document with title prepended (as done by getDocumentFullContent)
const fullContent = `# Test Document

Line 1: This is a test document.
Line 2: It has multiple lines.
Line 3: For testing purposes.`;

const lines = fullContent.split('\n');

console.log("=== Testing Fallback Scenario ===");
console.log("When the location finder fails, createFallbackHighlight is called.");
console.log("It extracts the first 10 chars of start line and last 10 chars of end line.\n");

// Simulate what createFallbackHighlight does
function simulateFallback(startLine: number, endLine: number) {
  console.log(`\nFallback for "Lines ${startLine}"${endLine !== startLine ? `-${endLine}` : ''}:`);
  
  // Convert from 1-based to 0-based
  const startIdx = startLine - 1;
  const endIdx = endLine - 1;
  
  console.log(`  1-based lines: ${startLine} to ${endLine}`);
  console.log(`  0-based indices: ${startIdx} to ${endIdx}`);
  
  const startLineContent = lines[startIdx] || '';
  const endLineContent = lines[endIdx] || '';
  
  console.log(`  Start line content: "${startLineContent}"`);
  console.log(`  End line content: "${endLineContent}"`);
  
  // Extract characters as done in createFallbackHighlight
  const startCharacters = startLineContent.slice(0, 10).trim() || "...";
  const endCharacters = endLineContent.length > 10 
    ? endLineContent.slice(-10).trim() || "..."
    : endLineContent.trim() || "...";
    
  console.log(`  Start characters: "${startCharacters}"`);
  console.log(`  End characters: "${endCharacters}"`);
  
  return {
    startLineIndex: startIdx,
    endLineIndex: endIdx,
    startCharacters,
    endCharacters
  };
}

// Test the two scenarios from the unit test
const fallback1 = simulateFallback(1, 1); // "Lines 1"
const fallback2 = simulateFallback(2, 3); // "Lines 2-3"

console.log("\n=== Testing with LineBasedLocator ===");

const locator = new LineBasedLocator(fullContent);

// Test fallback 1
console.log("\nTesting fallback 1:");
const result1 = locator.createHighlight(fallback1);
if (result1) {
  console.log("  ✅ Success");
  console.log(`     Quoted text: "${result1.quotedText}"`);
} else {
  console.log("  ❌ Failed - This is why the highlight is dropped!");
}

// Test fallback 2
console.log("\nTesting fallback 2:");
const result2 = locator.createHighlight(fallback2);
if (result2) {
  console.log("  ✅ Success");
  console.log(`     Quoted text: "${result2.quotedText}"`);
} else {
  console.log("  ❌ Failed - This is why the highlight is dropped!");
}

// Now let's see what happens with empty line
console.log("\n=== The Root Cause ===");
console.log("When 'Lines 1' maps to line index 0, that's the title line.");
console.log("When 'Lines 2-3' maps to indices 1-2, line 1 is an empty line!");
console.log("\nEmpty line handling:");
const emptyLineContent = lines[1];
console.log(`  Line content: "${emptyLineContent}"`);
console.log(`  Trimmed: "${emptyLineContent.trim()}"`);
console.log(`  Results in: "${emptyLineContent.trim() || "..."}"`);

console.log("\nThe LineBasedLocator tries to find '...' in the empty line, which fails!");
console.log("This is why the second highlight is dropped.");