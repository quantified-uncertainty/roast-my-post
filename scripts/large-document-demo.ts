import { analyzeSpellingGrammarDocument } from "../src/lib/documentAnalysis/spellingGrammar/spellingGrammarWorkflow";
import { analyzeSpellingGrammarDocumentParallel } from "../src/lib/documentAnalysis/spellingGrammar/parallelSpellingGrammarWorkflow";
import type { Document } from "../src/types/documents";
import type { Agent } from "../src/types/agentSchema";

// Generate a large document with multiple chunks
const createLargeDocument = (): Document => {
  const sections = [];
  
  for (let i = 1; i <= 15; i++) {
    sections.push(`
Section ${i}: Introduction to Artificial Inteligence

Artificial intelligence have revolutionized many industrys in recent years. From healthcare to finance, AI systems are becomming increasingly important for buisness operations.

The developement of machine learning algoritms has enabled computers to solve complex problems that where previously thought impossible. These systems can analayze vast amounts of data and make predictions with remarakble acuracy.

However, their are still many chalenges to overcome. One of the bigest issues is the lack of transparancy in AI decision-making procesess. Many algorithms operate as "black boxes," making it dificult to understand how they arrive at their conclussions.

Despite these limitiations, the potential benifits of AI are enormus. In the medical field, AI can help doctors diagnose diseasees more quickly and acurately. In transportation, autonomus vehicles promise to reduce acidents and improve trafic flow.

As we move forward, its crucial that we develop AI systems responsably. This means ensuring that they are fair, transparant, and alined with human values. Only then can we fullay realize the potential of artificial inteligence to improve our lifes.`);
  }
  
  return {
    id: "large-doc",
    slug: "large-document-test",
    title: "Large Document Test", 
    author: "Test",
    content: sections.join('\n\n'),
    publishedDate: new Date().toISOString(),
    url: "https://example.com/test",
    platforms: ["test"],
    reviews: [],
    intendedAgents: []
  };
};

const agent: Agent = {
  id: "large-test-agent",
  name: "Grammar Checker",
  version: "v1",
  primaryInstructions: "Find all spelling, grammar, punctuation, and capitalization errors.",
  description: "Large test agent",
  providesGrades: true,
  extendedCapabilityId: "spelling-grammar"
};

async function runLargeDocumentDemo() {
  const doc = createLargeDocument();
  const wordCount = doc.content.split(/\s+/).length;
  
  console.log("=== Large Document Performance Test ===\n");
  console.log(`Document: ~${wordCount} words (multiple chunks required)\n`);

  // Sequential processing
  console.log("🐌 Sequential Processing:");
  const seqStart = Date.now();
  const seqResult = await analyzeSpellingGrammarDocument(doc, agent, 100);
  const seqTime = Date.now() - seqStart;
  
  console.log(`   ✓ Completed: ${(seqTime / 1000).toFixed(1)}s`);
  console.log(`   ✓ Chunks: ${seqResult.tasks.length}`);
  console.log(`   ✓ Errors: ${seqResult.highlights.length}`);

  // Parallel processing (low concurrency)
  console.log("\n🚀 Parallel Processing (concurrency=3):");
  const par3Start = Date.now();
  const par3Result = await analyzeSpellingGrammarDocumentParallel(doc, agent, 100, 3);
  const par3Time = Date.now() - par3Start;
  
  console.log(`   ✓ Completed: ${(par3Time / 1000).toFixed(1)}s`);
  console.log(`   ✓ Chunks: ${par3Result.tasks.length}`);
  console.log(`   ✓ Errors: ${par3Result.highlights.length}`);

  // Parallel processing (high concurrency)
  console.log("\n⚡ Parallel Processing (concurrency=7):");
  const par7Start = Date.now();
  const par7Result = await analyzeSpellingGrammarDocumentParallel(doc, agent, 100, 7);
  const par7Time = Date.now() - par7Start;
  
  console.log(`   ✓ Completed: ${(par7Time / 1000).toFixed(1)}s`);
  console.log(`   ✓ Chunks: ${par7Result.tasks.length}`);
  console.log(`   ✓ Errors: ${par7Result.highlights.length}`);

  // Performance comparison
  console.log("\n=== Performance Summary ===");
  console.log(`Sequential:        ${(seqTime / 1000).toFixed(1)}s`);
  console.log(`Parallel (3):      ${(par3Time / 1000).toFixed(1)}s (${((seqTime - par3Time) / seqTime * 100).toFixed(1)}% faster)`);
  console.log(`Parallel (7):      ${(par7Time / 1000).toFixed(1)}s (${((seqTime - par7Time) / seqTime * 100).toFixed(1)}% faster)`);
  
  const bestTime = Math.min(par3Time, par7Time);
  const bestConcurrency = par3Time < par7Time ? 3 : 7;
  const bestImprovement = ((seqTime - bestTime) / seqTime * 100).toFixed(1);
  
  console.log(`\n🏆 Best performance: Concurrency ${bestConcurrency} (${bestImprovement}% improvement)`);
  
  // Show throughput
  const seqThroughput = (wordCount / (seqTime / 1000)).toFixed(0);
  const bestThroughput = (wordCount / (bestTime / 1000)).toFixed(0);
  
  console.log(`\n📊 Throughput:`);
  console.log(`Sequential: ${seqThroughput} words/second`);
  console.log(`Parallel:   ${bestThroughput} words/second`);
}

runLargeDocumentDemo().catch(console.error);