/**
 * Quick test script for the AgenticPlugin.
 *
 * Usage:
 *   pnpm --filter @roast/ai exec tsx scripts/test-agentic-plugin.ts
 *   pnpm --filter @roast/ai exec tsx scripts/test-agentic-plugin.ts /path/to/article.txt
 */

import { readFileSync } from "fs";
import { AgenticPlugin } from "../src/analysis-plugins/plugins/agentic";

const filePath = process.argv[2] || "/tmp/test-article.txt";

let documentText: string;
try {
  documentText = readFileSync(filePath, "utf-8").trim();
} catch {
  console.error(`Could not read file: ${filePath}`);
  process.exit(1);
}

async function main() {
  console.log("=== AgenticPlugin Test Drive ===\n");
  console.log(`Source: ${filePath}`);
  console.log(`Document length: ${documentText.length} chars`);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log(`ANTHROPIC_API_KEY: ${apiKey ? apiKey.slice(0, 8) + "..." + apiKey.slice(-4) : "(unset)"}\n`);

  const plugin = new AgenticPlugin();

  console.log("Running agentic analysis...\n");
  const startTime = Date.now();

  const result = await plugin.analyze([], documentText);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nCompleted in ${elapsed}s`);
  console.log(`Cost: $${result.cost.toFixed(4)}`);
  console.log(`Grade: ${result.grade ?? "N/A"}/100`);
  console.log(`Comments: ${result.comments.length}`);
  console.log(`\nSummary: ${result.summary}\n`);

  console.log("--- Findings ---\n");
  for (const comment of result.comments) {
    console.log(`[${comment.level?.toUpperCase()}] ${comment.header}`);
    console.log(`  Quoted: "${comment.highlight.quotedText.slice(0, 100)}${comment.highlight.quotedText.length > 100 ? "..." : ""}"`);
    console.log(`  ${comment.description}\n`);
  }

  console.log("--- Debug Info ---");
  console.log(JSON.stringify(plugin.getDebugInfo?.(), null, 2));
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
