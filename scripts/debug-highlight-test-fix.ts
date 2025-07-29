#!/usr/bin/env npx tsx

/**
 * Debug script showing the fix needed for the highlight extraction
 */

console.log("=== The Problem ===");
console.log("1. The LLM provides line numbers based on the document content it sees");
console.log("2. But getDocumentFullContent() prepends a title, adding 2 lines");
console.log("3. The fallback doesn't account for this offset");
console.log("4. When it tries to extract from an empty line, it uses '...' which can't be found");

console.log("\n=== The Solution ===");
console.log("The extractHighlightsFromAnalysis function needs to adjust line numbers");
console.log("when the document has a title prepended.\n");

// Simulate the fix
function adjustLineNumbersForTitle(location: string, hasTitle: boolean): { startLine: number, endLine: number } {
  const lineMatch = location.match(/[Ll]ines?\s*(\d+)(?:\s*-\s*(\d+))?/);
  let startLine = 1;
  let endLine = 1;
  
  if (lineMatch) {
    startLine = parseInt(lineMatch[1]);
    endLine = lineMatch[2] ? parseInt(lineMatch[2]) : startLine;
  }
  
  // If document has title, add 2 to account for "# Title\n\n"
  if (hasTitle) {
    startLine += 2;
    endLine += 2;
  }
  
  return { startLine, endLine };
}

// Test the fix
const testCases = [
  { location: "Lines 1", hasTitle: true },
  { location: "Lines 2-3", hasTitle: true },
  { location: "Lines 1", hasTitle: false },
];

console.log("Testing line number adjustment:");
testCases.forEach(test => {
  const result = adjustLineNumbersForTitle(test.location, test.hasTitle);
  console.log(`  "${test.location}" with${test.hasTitle ? '' : 'out'} title: lines ${result.startLine}-${result.endLine}`);
});

console.log("\n=== Alternative Solutions ===");
console.log("1. Fix in extractHighlightsFromAnalysis: Detect and adjust for title offset");
console.log("2. Fix in createFallbackHighlight: Handle empty lines better (use actual line start instead of '...')");
console.log("3. Fix in LineBasedLocator: Make it handle '...' as a special case for empty lines");
console.log("4. Fix in findHighlightLocation: Make it more robust to handle title offsets");

console.log("\n=== Recommended Fix ===");
console.log("The cleanest solution is to fix it in extractHighlightsFromAnalysis:");
console.log("- Check if document.title exists");
console.log("- If so, add 2 to all line numbers from the LLM");
console.log("- This accounts for the '# Title\\n\\n' that getDocumentFullContent adds");