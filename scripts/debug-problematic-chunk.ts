import { analyzeChunk } from "../src/lib/documentAnalysis/spellingGrammar/analyzeChunk";

// Test the specific chunk that's failing
async function debugProblematicChunk() {
  console.log("=== Debugging Problematic Chunk ===\n");

  // This is similar to the first chunk from the medium document that was failing
  const problematicChunk = {
    content: `# Essay on Technology and Society

## Introduction

In todays rapidly evolving world, technology has become an intergral part of our daily lifes. From smartphones to artificial intelligence, these inovations have tranformed the way we communicate, work, and entertane ourselves.

The developement of digital technologies over the past few decades has been remarakble. What started as simple calculators and early computers has evolved into sophisiticated systems that can recognise speech, understand natural language, and even drive cars autonomusly.

## Chapter 1: Communication Revolution

The way we comunicate has changed dramaticaly since the advent of the internet. Social media platforms like Facebook, Twitter, and Instagram have conectted people across the globe in ways previously unimagineable.`,
    startLineNumber: 1,
    lines: [
      "# Essay on Technology and Society",
      "",
      "## Introduction",
      "",
      "In todays rapidly evolving world, technology has become an intergral part of our daily lifes. From smartphones to artificial intelligence, these inovations have tranformed the way we communicate, work, and entertane ourselves.",
      "",
      "The developement of digital technologies over the past few decades has been remarakble. What started as simple calculators and early computers has evolved into sophisiticated systems that can recognise speech, understand natural language, and even drive cars autonomusly.",
      "",
      "## Chapter 1: Communication Revolution",
      "",
      "The way we comunicate has changed dramaticaly since the advent of the internet. Social media platforms like Facebook, Twitter, and Instagram have conectted people across the globe in ways previously unimagineable."
    ]
  };

  console.log("Chunk content preview:");
  console.log(problematicChunk.content.substring(0, 200) + "...");
  console.log(`Lines: ${problematicChunk.lines.length}`);
  console.log(`Characters: ${problematicChunk.content.length}`);
  console.log("\nTesting this chunk...\n");

  try {
    const result = await analyzeChunk(problematicChunk, {
      agentName: "Test Agent",
      primaryInstructions: "Find all spelling, grammar, punctuation, and capitalization errors."
    });

    console.log(`✓ Success! Found ${result.length} errors:`);
    result.forEach((error, i) => {
      console.log(`${i + 1}. Line ${error.lineStart}: "${error.highlightedText}" - ${error.description}`);
    });

  } catch (error) {
    console.error("❌ Error:", error);
  }

  console.log("\n=== Now testing a working chunk for comparison ===\n");

  // Test a chunk that we know works from our earlier tests
  const workingChunk = {
    content: "This have an error and recieve is misspelled.",
    startLineNumber: 1,
    lines: ["This have an error and recieve is misspelled."]
  };

  try {
    const result = await analyzeChunk(workingChunk, {
      agentName: "Test Agent", 
      primaryInstructions: "Find all spelling, grammar, punctuation, and capitalization errors."
    });

    console.log(`✓ Working chunk found ${result.length} errors:`);
    result.forEach((error, i) => {
      console.log(`${i + 1}. Line ${error.lineStart}: "${error.highlightedText}" - ${error.description}`);
    });

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

debugProblematicChunk().catch(console.error);