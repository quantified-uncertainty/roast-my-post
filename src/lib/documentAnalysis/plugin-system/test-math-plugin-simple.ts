/**
 * Simple test for MathPlugin without API calls
 */

import { MathPlugin } from './plugins/MathPlugin';
import type { PotentialFinding, GenerateCommentsContext } from './types';
import { investigateFindings } from './utils/findingHelpers';

// Test the new finding system directly
async function testMathPluginSimple() {
  console.log("Testing MathPlugin with new finding system...\n");

  const plugin = new MathPlugin();
  
  // Simulate potential findings that would be created by processChunk
  const simulatedFindings: PotentialFinding[] = [
    {
      id: 'math-error-1',
      type: 'math_error',
      data: {
        equation: '2 + 2 = 5',
        error: '2 + 2 equals 4, not 5',
        context: 'First, we know that 2 + 2 = 5, which is',
        surroundingText: 'First, we know that 2 + 2 = 5, which is a fundamental principle.'
      },
      highlightHint: {
        searchText: '2 + 2 = 5',
        chunkId: 'chunk1'
      }
    },
    {
      id: 'math-error-2',
      type: 'math_error',
      data: {
        equation: 'A = πr² = 3.14 × 3² = 28.26',
        error: '3.14 × 9 = 28.26, but should be 28.26 (actually correct)',
        context: 'area of a circle with radius 3',
        surroundingText: 'if we calculate the area of a circle with radius 3, we get A = πr² = 3.14 × 3² = 28.26 square units.'
      },
      highlightHint: {
        searchText: 'A = πr² = 3.14 × 3² = 28.26',
        chunkId: 'chunk1'
      }
    },
    {
      id: 'math-error-3',
      type: 'math_error',
      data: {
        equation: '(1200 - 1000) / 1000 × 100% = 15%',
        error: 'This equals 20%, not 15%',
        context: 'population grows from 1000 to 1200',
        surroundingText: 'if a population grows from 1000 to 1200, that\'s a growth of (1200 - 1000) / 1000 × 100% = 15%. This is basic math.'
      },
      highlightHint: {
        searchText: '(1200 - 1000) / 1000 × 100% = 15%',
        chunkId: 'chunk2'
      }
    },
    {
      id: 'math-error-4',
      type: 'math_error',
      data: {
        equation: '60/2 = 25',
        error: '60 divided by 2 equals 30, not 25',
        context: 'Speed calculation',
        surroundingText: 'Speed calculation: 60 miles in 2 hours = 60/2 = 25 mph'
      },
      highlightHint: {
        searchText: '60/2 = 25',
        chunkId: 'chunk3'
      }
    }
  ];

  // Add these to the plugin as if processChunk had run
  (plugin as any).findings.potential.push(...simulatedFindings);

  // Test document
  const documentText = `
Introduction to Basic Math

Let's start with some simple calculations. First, we know that 2 + 2 = 5, which is 
a fundamental principle. Moving on, if we calculate the area of a circle with radius 3, 
we get A = πr² = 3.14 × 3² = 28.26 square units.

In percentage calculations, if a population grows from 1000 to 1200, that's a growth of 
(1200 - 1000) / 1000 × 100% = 15%. This is basic math.

For compound interest, if you invest $10,000 at 7% annual return for 10 years, you'll have:
$10,000 × (1.07)^10 = $19,672. Actually wait, let me recalculate: $10,000 × 1.07^10 = $20,000.

Some more equations:
- The quadratic formula: x = (-b ± √(b² - 4ac)) / 2a
- Speed calculation: 60 miles in 2 hours = 60/2 = 25 mph
- Energy equation: E = mc² where c = 3 × 10^8 m/s
`;

  console.log("Step 1: Testing generateComments with new finding system...");
  
  const context: GenerateCommentsContext = {
    documentText,
    maxComments: 10
  };

  const comments = plugin.generateComments(context);
  
  console.log(`\nGenerated ${comments.length} comments:`);
  
  comments.forEach((comment, i) => {
    console.log(`\n${i + 1}. ${comment.description}`);
    if (comment.highlight) {
      const excerpt = documentText.substring(
        Math.max(0, comment.highlight.startOffset - 20),
        Math.min(documentText.length, comment.highlight.endOffset + 20)
      );
      console.log(`   Found at: "...${excerpt}..."`);
      console.log(`   Exact match: "${comment.highlight.quotedText}"`);
    } else {
      console.log(`   ERROR: Could not locate in document!`);
    }
  });

  // Calculate success rate
  const debugInfo = (plugin as any).debugJson();
  const successRate = debugInfo.stats.investigatedCount > 0 
    ? (debugInfo.stats.locatedCount / debugInfo.stats.investigatedCount) * 100 
    : 0;

  console.log(`\n\nResults:`);
  console.log(`- Potential findings: ${debugInfo.stats.potentialCount}`);
  console.log(`- Investigated: ${debugInfo.stats.investigatedCount}`);
  console.log(`- Successfully located: ${debugInfo.stats.locatedCount}`);
  console.log(`- Success rate: ${successRate.toFixed(1)}%`);

  // Test specific difficult cases
  console.log("\n\nTesting specific difficult cases:");
  
  const testCases = [
    { search: "2 + 2 = 5", desc: "Simple equation with spaces" },
    { search: "2+2=5", desc: "Same equation without spaces" },
    { search: "(1200 - 1000) / 1000 × 100% = 15%", desc: "Complex expression with parentheses" },
    { search: "60/2 = 25", desc: "Division expression" }
  ];

  const { findMathLocation } = await import('./utils/mathLocationFinder');
  
  testCases.forEach(test => {
    const result = findMathLocation(test.search, documentText);
    console.log(`\n${test.desc}:`);
    console.log(`  Search: "${test.search}"`);
    if (result) {
      console.log(`  ✓ Found at position ${result.startOffset}`);
      console.log(`  Matched: "${result.quotedText}"`);
    } else {
      console.log(`  ✗ Not found`);
    }
  });

  return successRate;
}

// Run the test
testMathPluginSimple()
  .then(successRate => {
    console.log(`\n${successRate >= 90 ? '✅' : '❌'} Test completed. Success rate: ${successRate.toFixed(1)}%`);
    process.exit(successRate >= 90 ? 0 : 1);
  })
  .catch(error => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });