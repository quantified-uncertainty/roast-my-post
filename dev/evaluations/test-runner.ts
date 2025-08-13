#!/usr/bin/env npx tsx

import { logger } from "../../internal-packages/ai/src/shared/logger";
import { checkSpellingGrammarTool } from "../../internal-packages/ai/src/tools/check-spelling-grammar";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment
const envPath = path.join(__dirname, "../../.env.local");
dotenv.config({ path: envPath });

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("❌ ANTHROPIC_API_KEY not found!");
  process.exit(1);
}

console.log("✅ Environment loaded successfully");

async function testSingleCase() {
  console.log("\n🧪 Testing single spelling error case...");
  
  const testInput = {
    text: "I teh best way to learn is by doing.",
    strictness: "minimal" as const
  };
  
  const context = {
    logger: logger,
    userId: "test-user",
    sessionId: "test-session"
  };
  
  try {
    console.log("📝 Input text:", testInput.text);
    console.log("⏳ Running check-spelling-grammar tool...");
    
    const result = await checkSpellingGrammarTool.run(testInput, context);
    
    console.log("\n✅ Tool executed successfully!");
    console.log("📊 Results:");
    console.log("  - Errors found:", result.errors.length);
    
    if (result.errors.length > 0) {
      console.log("  - First error details:");
      const firstError = result.errors[0];
      console.log(`    • Text: "${firstError.text}"`);
      console.log(`    • Correction: "${firstError.correction}"`);
      console.log(`    • Type: ${firstError.type}`);
      console.log(`    • Importance: ${firstError.importance}`);
    }
    
    // Check if we found the expected "teh" error
    const foundTeh = result.errors.some(e => 
      e.text.toLowerCase() === "teh" || 
      e.text.toLowerCase().includes("teh")
    );
    
    if (foundTeh) {
      console.log("\n🎯 SUCCESS: Found the expected 'teh' error!");
    } else {
      console.log("\n⚠️  WARNING: Did not find the expected 'teh' error");
      console.log("Errors found:", result.errors.map(e => e.text));
    }
    
    return result;
  } catch (error) {
    console.error("\n❌ ERROR:", error);
    throw error;
  }
}

// Run the test
testSingleCase()
  .then(() => {
    console.log("\n✨ Test completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Test failed:", error);
    process.exit(1);
  });