#!/usr/bin/env npx tsx
import { processArticle } from "../src/lib/articleImport";

async function testArticleImport(url: string) {
  console.log(`\n🧪 Testing article import for: ${url}`);
  console.log("=".repeat(60));
  
  try {
    const article = await processArticle(url);
    
    console.log("✅ Success!");
    console.log(`📌 Title: ${article.title}`);
    console.log(`👤 Author: ${article.author}`);
    console.log(`📅 Date: ${article.date}`);
    console.log(`🏷️  Platforms: ${article.platforms.join(", ") || "None detected"}`);
    console.log(`📊 Content length: ${article.content.length} characters`);
    console.log(`📝 First 200 chars of content:`);
    console.log(article.content.substring(0, 200) + "...");
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  // Test URLs
  const testUrls = [
    "https://www.lesswrong.com/posts/AqbWna2S85pFTsHH4/the-alignment-problem-from-a-deep-learning-perspective",
    "https://forum.effectivealtruism.org/posts/bfdc3MpsYEfDdvgtP/why-i-think-ai-safety-field-building-is-one-of-the-best",
    "https://www.astralcodexten.com/p/book-review-the-revolt-of-the-public",
    "https://example.com/test-article"
  ];

  console.log("🚀 Article Import Test Script");
  console.log(`📋 Testing with ${process.env.DIFFBOT_KEY ? "Diffbot" : "Firecrawl/Fallback"}`);
  
  for (const url of testUrls) {
    await testArticleImport(url);
  }
}

main().catch(console.error);