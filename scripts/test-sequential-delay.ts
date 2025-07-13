import { analyzeChunk } from "../src/lib/documentAnalysis/spellingGrammar/analyzeChunk";

// Test multiple chunks with delays to avoid concurrent API calls
async function testSequentialWithDelays() {
  console.log("=== Testing Sequential Processing with Delays ===\n");

  const testChunks = [
    {
      content: `# Essay on Technology and Society

## Introduction

In todays rapidly evolving world, technology has become an intergral part of our daily lifes. From smartphones to artificial intelligence, these inovations have tranformed the way we communicate, work, and entertane ourselves.`,
      startLineNumber: 1,
      lines: [
        "# Essay on Technology and Society",
        "",
        "## Introduction", 
        "",
        "In todays rapidly evolving world, technology has become an intergral part of our daily lifes. From smartphones to artificial intelligence, these inovations have tranformed the way we communicate, work, and entertane ourselves."
      ]
    },
    {
      content: `The developement of digital technologies over the past few decades has been remarakble. What started as simple calculators and early computers has evolved into sophisiticated systems that can recognise speech, understand natural language, and even drive cars autonomusly.

## Chapter 1: Communication Revolution

The way we comunicate has changed dramaticaly since the advent of the internet.`,
      startLineNumber: 6,
      lines: [
        "The developement of digital technologies over the past few decades has been remarakble. What started as simple calculators and early computers has evolved into sophisiticated systems that can recognise speech, understand natural language, and even drive cars autonomusly.",
        "",
        "## Chapter 1: Communication Revolution",
        "",
        "The way we comunicate has changed dramaticaly since the advent of the internet."
      ]
    },
    {
      content: `Social media platforms like Facebook, Twitter, and Instagram have conectted people across the globe in ways previously unimagineable.

However, this conectivity comes with its own chalenges. Privacy concerns, misinformation, and cyberbulying have become prevelant issues that society must adress.`,
      startLineNumber: 11,
      lines: [
        "Social media platforms like Facebook, Twitter, and Instagram have conectted people across the globe in ways previously unimagineable.",
        "",
        "However, this conectivity comes with its own chalenges. Privacy concerns, misinformation, and cyberbulying have become prevelant issues that society must adress."
      ]
    }
  ];

  const agentContext = {
    agentName: "Test Agent",
    primaryInstructions: "Find all spelling, grammar, punctuation, and capitalization errors."
  };

  // Test 1: Process chunks with minimal delay
  console.log("Test 1: Minimal delay (1 second between chunks)");
  let totalErrors = 0;
  for (let i = 0; i < testChunks.length; i++) {
    const chunk = testChunks[i];
    console.log(`Processing chunk ${i + 1}/${testChunks.length}...`);
    
    try {
      const result = await analyzeChunk(chunk, agentContext);
      console.log(`✓ Chunk ${i + 1}: Found ${result.length} errors`);
      totalErrors += result.length;
    } catch (error) {
      console.log(`❌ Chunk ${i + 1}: Failed - ${error}`);
    }
    
    // Wait 1 second between chunks
    if (i < testChunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  console.log(`Total errors found: ${totalErrors}\n`);

  // Test 2: Process chunks with longer delay
  console.log("Test 2: Longer delay (3 seconds between chunks)");
  totalErrors = 0;
  for (let i = 0; i < testChunks.length; i++) {
    const chunk = testChunks[i];
    console.log(`Processing chunk ${i + 1}/${testChunks.length}...`);
    
    try {
      const result = await analyzeChunk(chunk, agentContext);
      console.log(`✓ Chunk ${i + 1}: Found ${result.length} errors`);
      totalErrors += result.length;
    } catch (error) {
      console.log(`❌ Chunk ${i + 1}: Failed - ${error}`);
    }
    
    // Wait 3 seconds between chunks
    if (i < testChunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  console.log(`Total errors found: ${totalErrors}\n`);

  // Test 3: Process chunks simultaneously (for comparison)
  console.log("Test 3: Simultaneous processing (for comparison)");
  try {
    const promises = testChunks.map((chunk, i) => {
      console.log(`Starting chunk ${i + 1} simultaneously...`);
      return analyzeChunk(chunk, agentContext);
    });
    
    const results = await Promise.all(promises);
    totalErrors = results.reduce((sum, result) => sum + result.length, 0);
    
    results.forEach((result, i) => {
      console.log(`✓ Chunk ${i + 1}: Found ${result.length} errors`);
    });
    console.log(`Total errors found: ${totalErrors}`);
    
  } catch (error) {
    console.log(`❌ Simultaneous processing failed: ${error}`);
  }
}

testSequentialWithDelays().catch(console.error);