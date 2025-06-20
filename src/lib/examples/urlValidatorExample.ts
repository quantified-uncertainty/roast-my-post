#!/usr/bin/env tsx

/**
 * Example script demonstrating the URL validator
 * 
 * Usage:
 * npx tsx src/lib/examples/urlValidatorExample.ts
 */

import "dotenv/config";
import { validateUrl } from "../urlValidator";

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error("❌ Please set ANTHROPIC_API_KEY environment variable");
    process.exit(1);
  }

  console.log("🔍 URL Validator Example\n");

  // Test cases to demonstrate different scenarios
  const testCases = [
    {
      name: "✅ Valid and correctly cited URL",
      url: "https://react.dev/learn",
      context: "Official React documentation for learning React basics",
    },
    {
      name: "❌ Non-existent URL",
      url: "https://fake-domain-12345.com/article",
      context: "Article about machine learning",
    },
    {
      name: "🔄 Existing URL with wrong context",
      url: "https://www.python.org/",
      context: "JavaScript documentation for React development",
    },
    {
      name: "🤖 Potential hallucination",
      url: "https://openai.com/blog/gpt-5-release-announcement",
      context: "OpenAI's official announcement of GPT-5 release",
    },
    {
      name: "📚 Academic paper",
      url: "https://arxiv.org/abs/1706.03762",
      context: "The Transformer paper 'Attention Is All You Need'",
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n${testCase.name}`);
    console.log(`URL: ${testCase.url}`);
    console.log(`Context: ${testCase.context}`);
    console.log("Validating...");

    try {
      const result = await validateUrl({
        url: testCase.url,
        usageContext: testCase.context,
      }, apiKey);

      console.log(`📊 Result:`);
      console.log(`  • Exists: ${result.doesExist}`);
      console.log(`  • Correctly cited: ${result.correctlyCited}`);
      console.log(`  • Message: ${result.message}`);
    } catch (error) {
      console.error(`❌ Error: ${error}`);
    }

    console.log("─".repeat(60));
  }

  console.log("\n✨ URL validation examples completed!");
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as runUrlValidatorExample };