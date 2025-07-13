import { analyzeSpellingGrammarDocument } from "../src/lib/documentAnalysis/spellingGrammar/spellingGrammarWorkflow";
import { analyzeSpellingGrammarDocumentParallel } from "../src/lib/documentAnalysis/spellingGrammar/parallelSpellingGrammarWorkflow";
import type { Document } from "../src/types/documents";
import type { Agent } from "../src/types/agentSchema";

// Test document with multiple chunks worth of content
const testDoc: Document = {
  id: "demo-doc",
  title: "Performance Demo",
  author: "Test",
  content: `Chapter 1: Introduction

This chapter contain several spelling and grammer errors. We'll use it to demonstrate the performance diffrence between sequential and parallel processing.

The main advantge of parallel processing is that it can proces multiple chunks simultaniously. This significently reduces the total time needed for large documents.

Chapter 2: Technical Details

When processing documents for spelling and grammar errors, the system divids the content into managable chunks. Each chunk is then sent to the LLM for analysis.

In sequential mode, these chunks are procesed one after another. This means if you have 5 chunks that each take 3 seconds, the total time will be 15 seconds.

In parallel mode, multiple chunks can be analized at the same time. With a concurrency of 5, all 5 chunks could theoretically be processed in just 3 seconds - a 5x speedup!

Chapter 3: Real World Benefits

The benifits of parallel processing become more aparent with larger documents. Academic papers, technical documentation, and long-form articles can all benifit from this approach.

However, its important to note that there are practial limits. API rate limits, memory constraints, and network bandwith all play a role in determining the optimal concurrency level.

Chapter 4: Implementation Considerations

When implimenting parallel processing, several factors need to be considerd:

1. Chunk size: Too small and you'll have to many API calls; too large and you might exceed token limits
2. Concurrency level: Higher isn't always better - find the sweet spot for your use case
3. Error handling: With parallel processing, you need robust error handling for individual chunk failures
4. Result ordering: Ensure highlights are properly orderd in the final output

Chapter 5: Conclusion

In conclustion, parallel processing offers significent performance improvements for spelling and grammar checking. By processing multiple chunks simultaniously, we can reduce the total analysis time while maintaining the same level of acuracy.

The key is finding the right balence between speed and resource utilization. With proper tunning, parallel processing can make grammar checking much more efficent for large documents.`,
  importUrl: "test",
  platform: "test",
  createdAt: new Date(),
  updatedAt: new Date()
};

const agent: Agent = {
  id: "demo-agent",
  name: "Grammar Checker",
  agentVersionId: "v1",
  primaryInstructions: "Find all spelling, grammar, punctuation, and capitalization errors.",
  purpose: "ASSESSOR",
  description: "Demo agent",
  providesGrades: true,
  extendedCapabilityId: "spelling-grammar"
};

async function runDemo() {
  console.log("=== Spelling/Grammar: Sequential vs Parallel Demo ===\n");
  
  const wordCount = testDoc.content.split(/\s+/).length;
  console.log(`Document: ${wordCount} words\n`);

  // Sequential processing
  console.log("1. Sequential Processing:");
  console.log("   Processing chunks one at a time...");
  const seqStart = Date.now();
  const seqResult = await analyzeSpellingGrammarDocument(testDoc, agent, 50);
  const seqTime = Date.now() - seqStart;
  
  console.log(`   ✓ Completed in ${(seqTime / 1000).toFixed(1)}s`);
  console.log(`   ✓ Processed ${seqResult.tasks.length} chunks`);
  console.log(`   ✓ Found ${seqResult.highlights.length} errors`);

  // Parallel processing
  console.log("\n2. Parallel Processing (concurrency=5):");
  console.log("   Processing multiple chunks simultaneously...");
  const parStart = Date.now();
  const parResult = await analyzeSpellingGrammarDocumentParallel(testDoc, agent, 50, 5);
  const parTime = Date.now() - parStart;
  
  console.log(`   ✓ Completed in ${(parTime / 1000).toFixed(1)}s`);
  console.log(`   ✓ Processed ${parResult.tasks.length} chunks`);
  console.log(`   ✓ Found ${parResult.highlights.length} errors`);

  // Results comparison
  console.log("\n=== Performance Comparison ===");
  console.log(`Sequential: ${(seqTime / 1000).toFixed(1)}s`);
  console.log(`Parallel:   ${(parTime / 1000).toFixed(1)}s`);
  
  const improvement = ((seqTime - parTime) / seqTime * 100).toFixed(1);
  const speedup = (seqTime / parTime).toFixed(2);
  
  if (parTime < seqTime) {
    console.log(`\n✨ Parallel processing was ${improvement}% faster (${speedup}x speedup)`);
  } else {
    console.log(`\n⚠️  No improvement - document may be too small to benefit from parallelization`);
  }

  // Show some sample errors found
  console.log("\n=== Sample Errors Found ===");
  parResult.highlights.slice(0, 5).forEach((h, i) => {
    console.log(`${i + 1}. "${h.highlight.quotedText}" - ${h.description.split('.')[0]}`);
  });
}

runDemo().catch(console.error);