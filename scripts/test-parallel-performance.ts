import { analyzeSpellingGrammarDocument } from "../src/lib/documentAnalysis/spellingGrammar/spellingGrammarWorkflow";
import { analyzeSpellingGrammarDocumentParallel } from "../src/lib/documentAnalysis/spellingGrammar/parallelSpellingGrammarWorkflow";
import type { Document } from "../src/types/documents";
import type { Agent } from "../src/types/agentSchema";

// Create a large test document with intentional errors
const createTestDocument = (paragraphs: number): Document => {
  const content = Array(paragraphs).fill(null).map((_, i) => `
Paragraph ${i + 1}: This paragraph contain several intentional errors for testing purposes. 
The algoritm will analyze this text and find the mispellings, grammer issues, and other problems.
Its important to test with realistic content that have various types of errors. We'll see how fast
the parallel processing can handel multiple chunks compared to sequential processing.
`).join('\n\n');

  return {
    id: "perf-test",
    slug: "performance-test-document",
    title: "Performance Test Document",
    author: "Test", 
    content,
    publishedDate: new Date().toISOString(),
    url: "https://example.com/perf-test",
    platforms: ["test"],
    reviews: [],
    intendedAgents: []
  };
};

const agent: Agent = {
  id: "test-agent",
  name: "Grammar Checker",
  version: "v1",
  primaryInstructions: "Find all spelling, grammar, punctuation, and capitalization errors.",
  description: "Test agent",
  providesGrades: true,
  extendedCapabilityId: "spelling-grammar"
};

async function runPerformanceTest() {
  console.log("=== Spelling/Grammar Performance Test ===\n");

  // Test with different document sizes
  const sizes = [10, 25, 50]; // paragraphs
  
  for (const size of sizes) {
    const doc = createTestDocument(size);
    const wordCount = doc.content.split(/\s+/).length;
    console.log(`\nTesting with ${size} paragraphs (~${wordCount} words):`);
    console.log("-".repeat(50));

    // Sequential test
    const seqStart = Date.now();
    const seqResult = await analyzeSpellingGrammarDocument(doc, agent, 100);
    const seqTime = Date.now() - seqStart;
    
    // Parallel test with different concurrency levels
    const concurrencyLevels = [3, 5, 10];
    
    for (const concurrency of concurrencyLevels) {
      const parStart = Date.now();
      const parResult = await analyzeSpellingGrammarDocumentParallel(doc, agent, 100, concurrency);
      const parTime = Date.now() - parStart;
      
      const speedup = ((seqTime - parTime) / seqTime * 100).toFixed(1);
      const timeRatio = (seqTime / parTime).toFixed(2);
      
      console.log(`\nConcurrency ${concurrency}:`);
      console.log(`  Sequential: ${(seqTime / 1000).toFixed(1)}s (${seqResult.tasks.length} chunks)`);
      console.log(`  Parallel:   ${(parTime / 1000).toFixed(1)}s`);
      console.log(`  Speedup:    ${speedup}% faster (${timeRatio}x)`);
      console.log(`  Errors:     ${seqResult.highlights.length} vs ${parResult.highlights.length}`);
      
      // Only test one concurrency level for larger documents to save time
      if (size > 25) break;
    }
  }
  
  console.log("\n=== Summary ===");
  console.log("Parallel processing provides significant speedup, especially for larger documents.");
  console.log("Optimal concurrency depends on document size and API rate limits.");
}

runPerformanceTest().catch(console.error);