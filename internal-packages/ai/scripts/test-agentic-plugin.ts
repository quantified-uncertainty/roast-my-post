/**
 * Quick test script for the AgenticPlugin.
 *
 * Usage:
 *   pnpm --filter @roast/ai exec tsx scripts/test-agentic-plugin.ts
 *   pnpm --filter @roast/ai exec tsx scripts/test-agentic-plugin.ts /path/to/article.txt
 *   pnpm --filter @roast/ai exec tsx scripts/test-agentic-plugin.ts /path/to/article.txt --v2
 */

import { readFileSync } from "fs";
import { AgenticPlugin } from "../src/analysis-plugins/plugins/agentic";
import type { AgenticStreamEvent } from "../src/analysis-plugins/plugins/agentic";

const args = process.argv.slice(2);
const v2Mode = args.includes("--v2");
const filePath = args.find((a) => !a.startsWith("--")) || "/tmp/test-article.txt";

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
  console.log(`Mode: ${v2Mode ? "v2 (multi-agent)" : "v1 (single-agent)"}`);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log(`ANTHROPIC_API_KEY: ${apiKey ? apiKey.slice(0, 8) + "..." + apiKey.slice(-4) : "(unset)"}\n`);

  const onMessage = (event: AgenticStreamEvent) => {
    const ts = new Date().toISOString().slice(11, 23);
    switch (event.type) {
      case "init":
        console.log(`[${ts}] INIT model=${event.model} tools=${event.tools.join(",")}`);
        break;
      case "assistant_text":
        console.log(`[${ts}] TEXT ${event.text.slice(0, 120)}${event.text.length > 120 ? "..." : ""}`);
        break;
      case "tool_use":
        console.log(`[${ts}] TOOL ${event.toolName}`);
        break;
      case "tool_result":
        console.log(`[${ts}] RESULT ${event.output.slice(0, 120)}${event.output.length > 120 ? "..." : ""}`);
        break;
      case "subagent_start":
        console.log(`[${ts}] SUBAGENT START: ${event.agentName}`);
        break;
      case "subagent_text":
        console.log(`[${ts}] [${event.agentName}] ${event.text.slice(0, 100)}${event.text.length > 100 ? "..." : ""}`);
        break;
      case "subagent_tool_use":
        console.log(`[${ts}] [${event.agentName}] TOOL: ${event.toolName}`);
        break;
      case "subagent_tool_result":
        console.log(`[${ts}] [${event.agentName}] RESULT: ${event.output.slice(0, 100)}${event.output.length > 100 ? "..." : ""}`);
        break;
      case "subagent_complete":
        console.log(`[${ts}] SUBAGENT DONE: ${event.agentName}`);
        break;
      case "cost_update":
        console.log(`[${ts}] COST $${event.cost.toFixed(4)} turns=${event.turns}`);
        break;
      case "result":
        console.log(`[${ts}] RESULT findings=${event.findings} grade=${event.grade} cost=$${event.cost.toFixed(4)}`);
        break;
      case "error":
        console.log(`[${ts}] ERROR ${event.message}`);
        break;
    }
  };

  const plugin = new AgenticPlugin({
    onMessage,
    // In v2 mode we rely on the profile having enableSubAgents: true
    // For testing without a stored profile, we'd need to create one or use the default
  });

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
