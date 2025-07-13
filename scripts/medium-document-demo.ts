import { analyzeSpellingGrammarDocument } from "../src/lib/documentAnalysis/spellingGrammar/spellingGrammarWorkflow";
import { analyzeSpellingGrammarDocumentParallel } from "../src/lib/documentAnalysis/spellingGrammar/parallelSpellingGrammarWorkflow";
import type { Document } from "../src/types/documents";
import type { Agent } from "../src/types/agentSchema";

// Create a medium-sized document with varied content (fewer repetitions)
const createMediumDocument = (): Document => {
  const content = `# Essay on Technology and Society

## Introduction

In todays rapidly evolving world, technology has become an intergral part of our daily lifes. From smartphones to artificial intelligence, these inovations have tranformed the way we communicate, work, and entertane ourselves.

The developement of digital technologies over the past few decades has been remarakble. What started as simple calculators and early computers has evolved into sophisiticated systems that can recognise speech, understand natural language, and even drive cars autonomusly.

## Chapter 1: Communication Revolution

The way we comunicate has changed dramaticaly since the advent of the internet. Social media platforms like Facebook, Twitter, and Instagram have conectted people across the globe in ways previously unimagineable.

However, this conectivity comes with its own chalenges. Privacy concerns, misinformation, and cyberbulying have become prevelant issues that society must adress. The ballance between conectivity and security remains a significant chalenege.

Email revolutionised buisness communication, making it posible to send documents and messages instantaniously across continents. Video conferencing technology has made remote work a viable option for many profesionals.

## Chapter 2: Artificial Intelligence and Machine Learning

Artificial intelligence (AI) represents one of the most exiting frontiers in technology. Machine learning algoritms can now analayze vast datasets and make predications with impressiv acuracy.

In healthcare, AI is helping doctors diagnose diseasees more quickly and acurately. In finance, algoritms detect fraudalent transactions and asses credit risks. The automotiv industry is developing autonomus vehicles that could reduce acidents and improve trafic flow.

Despite these advancments, there are concernes about AI's impact on emploiment. Many jobs that involve repetativ tasks may be automated, leading to job displasement in certain sectors.

## Chapter 3: Environmental Impact

The enviromental impact of technology is a growing consern. Data centers consume enormus amounts of electricity, contributing to carbon emisions. The production of electronic devices requires rare earth minerals, often extracted through envirometally harmful procesess.

However, technology also offers solutions to enviromental chalenges. Renewable energy sources like solar and wind power are becoming more eficient thanks to tecnological inovations. Smart grids can optimize energy distribution and reduce waste.

Electric vehicles are gradually replacing traditional gasoline-powered cars, promisin to reduce air polution in urban areas. The developement of more eficient batteries is cruical for this transition.

## Chapter 4: Education and Learning

Technology has revolutionised education, making learning more accesible and interactive. Online courses and educational platforms have democratised access to knowlege, alowing people from all backgrounds to learn new skills.

Virtual and augmented reality technologies are creating imersive learning experiences that were previusly imposible. Students can now "visit" ancient civilisations or explore the inside of a human cel through these inovativ tools.

However, the digital divide remains a chalenege. Not all students have equal access to computers and high-speed internet, creating disparaties in educational oportunities.

## Chapter 5: Future Prospects

Looking ahead, several emerging technologies promis to further transform society. Quantum computing could solve complex problems that are currently imposible for classical computers. Biotechnology may enable us to cure genetic diseasees and extend human lifspan.

The Internet of Things (IoT) will likely connect more devices in our homes and cities, creating "smart" enviroments that respond to our needs. 5G networks will enable faster comunicaation and new aplicationss we can't yet imagin.

## Conclusion

Technology continues to evolve at an unprecedented pace, bringing both oportunities and chalenges. As we embrace these inovations, it's cruical that we carefully consider their social, ethical, and enviromental implications.

The future will likely see even more integration between humans and technology. Success will depend on our ability to harnes these tools for the benefit of all humanity while mitigating potential risks and ensuring that technological progres serves the comon good.`;

  return {
    id: "medium-doc",
    slug: "medium-document-test", 
    title: "Technology and Society Essay",
    author: "Test",
    content,
    publishedDate: new Date().toISOString(),
    url: "https://example.com/medium-test",
    platforms: ["test"],
    reviews: [],
    intendedAgents: []
  };
};

const agent: Agent = {
  id: "medium-test-agent",
  name: "Grammar Checker",
  version: "v1",
  primaryInstructions: "Find all spelling, grammar, punctuation, and capitalization errors.",
  description: "Medium test agent",
  providesGrades: true,
  extendedCapabilityId: "spelling-grammar"
};

async function runMediumDocumentDemo() {
  const doc = createMediumDocument();
  const wordCount = doc.content.split(/\s+/).length;
  
  console.log("=== Medium Document Performance Test ===\n");
  console.log(`Document: ~${wordCount} words (should require multiple chunks)\n`);

  try {
    // Sequential processing
    console.log("🐌 Sequential Processing:");
    const seqStart = Date.now();
    const seqResult = await analyzeSpellingGrammarDocument(doc, agent, 100);
    const seqTime = Date.now() - seqStart;
    
    console.log(`   ✓ Completed: ${(seqTime / 1000).toFixed(1)}s`);
    console.log(`   ✓ Chunks: ${seqResult.tasks.length}`);
    console.log(`   ✓ Errors: ${seqResult.highlights.length}`);

    // Parallel processing (moderate concurrency)
    console.log("\n🚀 Parallel Processing (concurrency=3):");
    const parStart = Date.now();
    const parResult = await analyzeSpellingGrammarDocumentParallel(doc, agent, 100, 3);
    const parTime = Date.now() - parStart;
    
    console.log(`   ✓ Completed: ${(parTime / 1000).toFixed(1)}s`);
    console.log(`   ✓ Chunks: ${parResult.tasks.length}`);
    console.log(`   ✓ Errors: ${parResult.highlights.length}`);

    // Performance comparison
    console.log("\n=== Performance Summary ===");
    console.log(`Sequential: ${(seqTime / 1000).toFixed(1)}s`);
    console.log(`Parallel:   ${(parTime / 1000).toFixed(1)}s`);
    
    if (parTime < seqTime) {
      const improvement = ((seqTime - parTime) / seqTime * 100).toFixed(1);
      console.log(`✨ Parallel was ${improvement}% faster`);
    } else {
      console.log("ℹ️ No significant performance difference");
    }
    
    // Show throughput
    const seqThroughput = (wordCount / (seqTime / 1000)).toFixed(0);
    const parThroughput = (wordCount / (parTime / 1000)).toFixed(0);
    
    console.log(`\n📊 Throughput:`);
    console.log(`Sequential: ${seqThroughput} words/second`);
    console.log(`Parallel:   ${parThroughput} words/second`);

    // Show sample errors
    console.log("\n=== Sample Errors Found ===");
    parResult.highlights.slice(0, 10).forEach((h, i) => {
      console.log(`${i + 1}. "${h.highlight.quotedText}" - ${h.description.split('.')[0]}`);
    });

  } catch (error) {
    console.error("Error during demo:", error);
  }
}

runMediumDocumentDemo().catch(console.error);