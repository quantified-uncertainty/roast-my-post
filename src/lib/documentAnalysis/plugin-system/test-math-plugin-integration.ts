/**
 * Integration test for MathPlugin to verify end-to-end functionality
 */

import { MathPlugin } from './plugins/MathPlugin';
import { TextChunk } from './TextChunk';
import type { GenerateCommentsContext } from './types';

async function testMathPlugin() {
  console.log("Testing MathPlugin end-to-end...\n");

  const plugin = new MathPlugin();
  
  // Test document with various math errors
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

  // Create chunks (simulating document chunking)
  const chunks: TextChunk[] = [
    new TextChunk("chunk1", documentText.slice(0, 300), { 
      section: "intro",
      position: { start: 0, end: 300 }
    }),
    new TextChunk("chunk2", documentText.slice(300, 600), { 
      section: "percentages",
      position: { start: 300, end: 600 }
    }),
    new TextChunk("chunk3", documentText.slice(600), { 
      section: "formulas",
      position: { start: 600, end: documentText.length }
    })
  ];

  console.log("Step 1: Processing chunks...");
  
  // Process each chunk
  for (const chunk of chunks) {
    console.log(`\nProcessing chunk ${chunk.id} (${chunk.text.length} chars)...`);
    try {
      const result = await plugin.processChunk(chunk);
      console.log(`- Found ${result.findings?.length || 0} findings`);
      console.log(`- LLM calls: ${result.llmCalls.length}`);
      console.log(`- Cost: $${result.metadata?.tokensUsed || 0}`);
    } catch (error) {
      console.error(`ERROR processing chunk ${chunk.id}:`, error);
    }
  }

  // Check potential findings using new system
  const debugInfoAfterProcessing = (plugin as any).debugJson();
  console.log(`\n\nStep 2: Findings after processing:`);
  console.log(`- Potential findings: ${debugInfoAfterProcessing.stats.potentialCount}`);
  console.log(`  - Math errors: ${(plugin as any).potential.filter((f: any) => f.type === 'math_error').length}`);
  console.log(`  - Correct equations: ${(plugin as any).potential.filter((f: any) => f.type === 'math_correct').length}`);

  // Print errors found
  const errorFindings = (plugin as any).potential.filter((f: any) => f.type === 'math_error');
  if (errorFindings.length > 0) {
    console.log("\nErrors detected:");
    errorFindings.forEach((finding: any, i: number) => {
      console.log(`${i + 1}. "${finding.data.equation}" - ${finding.data.error}`);
    });
  }

  // Run synthesis
  console.log("\n\nStep 3: Running synthesis...");
  const synthesis = await plugin.synthesize();
  console.log("Summary:", synthesis.summary);

  // Generate comments
  console.log("\n\nStep 4: Generating comments...");
  const context: GenerateCommentsContext = {
    documentText,
    maxComments: 10,
    minImportance: 2
  };

  const comments = plugin.generateComments(context);
  console.log(`\nGenerated ${comments.length} comments:`);

  comments.forEach((comment, i) => {
    console.log(`\n${i + 1}. ${comment.description}`);
    console.log(`   Location: chars ${comment.highlight?.startOffset}-${comment.highlight?.endOffset}`);
    console.log(`   Text: "${comment.highlight?.quotedText}"`);
    console.log(`   Valid: ${comment.isValid}`);
  });

  // Check success rate
  const investigated = (plugin as any).investigated.length;
  const located = (plugin as any).located.length;
  const successRate = investigated > 0 ? (located / investigated) * 100 : 0;

  console.log(`\n\nSuccess Rate: ${located}/${investigated} = ${successRate.toFixed(1)}%`);
  
  // Debug info
  const debugInfoFinal = (plugin as any).debugJson();
  console.log("\nDebug stats:", debugInfoFinal.stats);

  return successRate;
}

// Run the test
testMathPlugin()
  .then(successRate => {
    console.log(`\n✅ Test completed. Success rate: ${successRate.toFixed(1)}%`);
    process.exit(successRate >= 90 ? 0 : 1);
  })
  .catch(error => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });