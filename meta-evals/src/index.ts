/**
 * Interactive CLI for meta-evaluation
 *
 * Simplified flow:
 * 1. If no chains exist → Create Baseline
 * 2. If chains exist → List them, select one to manage
 *
 * Usage:
 *   pnpm --filter @roast/meta-evals run start          # Interactive mode
 *   pnpm --filter @roast/meta-evals run start --check  # Verify setup only
 */

import "dotenv/config";
import enquirer from "enquirer";
import {
  metaEvaluationRepository,
  type Chain,
} from "@roast/db";
import { createBaseline } from "./actions/baseline";
import { showChainDetail } from "./actions/chainDetail";

const { prompt } = enquirer as any;

async function main() {
  checkEnvironment();

  // Non-interactive check mode for CI/development
  if (process.argv.includes("--check")) {
    await runCheckMode();
    return;
  }

  console.log("\n🔬 Meta-Evaluation Tool\n");

  while (true) {
    const chains = await getChains();

    if (chains.length === 0) {
      // No chains - only option is to create baseline
      console.log("No evaluation chains yet.\n");
      const { action } = await prompt({
        type: "select",
        name: "action",
        message: "What would you like to do?",
        choices: [
          { name: "create", message: "Create New Baseline" },
          { name: "exit", message: "Exit" },
        ],
      });

      if (action === "exit") {
        console.log("\nGoodbye!\n");
        break;
      }

      try {
        await createBaseline();
      } catch (error) {
        console.error("\n❌ Error:", error);
      }
    } else {
      // Has chains - show list
      const choices = [
        ...chains.map((c) => ({
          name: c.id,
          message: formatChainChoice(c),
        })),
        { name: "create", message: "➕ Create New Baseline" },
        { name: "exit", message: "Exit" },
      ];

      const { selected } = await prompt({
        type: "select",
        name: "selected",
        message: "Select an evaluation chain:",
        choices,
      });

      if (selected === "exit") {
        console.log("\nGoodbye!\n");
        break;
      }

      if (selected === "create") {
        try {
          await createBaseline();
        } catch (error) {
          console.error("\n❌ Error:", error);
        }
      } else {
        const chain = chains.find((c) => c.id === selected);
        if (chain) {
          try {
            await showChainDetail(chain.id);
          } catch (error) {
            console.error("\n❌ Error:", error);
          }
        }
      }
    }

    console.log("\n");
  }

  await metaEvaluationRepository.disconnect();
}

async function getChains(): Promise<Chain[]> {
  return metaEvaluationRepository.getChains();
}

function formatChainChoice(chain: Chain): string {
  const title = chain.documentTitle.length > 40
    ? chain.documentTitle.slice(0, 37) + "..."
    : chain.documentTitle;
  const agents = chain.agentNames.length > 2
    ? `${chain.agentNames.slice(0, 2).join(", ")}...`
    : chain.agentNames.join(", ");
  return `${title} | ${chain.runCount} run${chain.runCount > 1 ? "s" : ""} | ${agents}`;
}

async function runCheckMode() {
  console.log("🔬 Meta-Evaluation Tool - Check Mode\n");

  console.log("✓ Imports loaded successfully");

  const connected = await metaEvaluationRepository.checkConnection();
  if (!connected) {
    console.error("✗ Database connection failed");
    process.exit(1);
  }
  console.log("✓ Database connection successful");

  try {
    const count = await metaEvaluationRepository.getMetaEvaluationCount();
    console.log(`✓ MetaEvaluation table exists (${count} records)`);
  } catch (error) {
    console.error("✗ MetaEvaluation table check failed:", error);
    process.exit(1);
  }

  console.log("\n✅ All checks passed!\n");
  await metaEvaluationRepository.disconnect();
}

function checkEnvironment() {
  if (!process.env.DATABASE_URL) {
    console.error("\n❌ DATABASE_URL environment variable is required.\n");
    console.error("Please either:");
    console.error("  1. Create a .env file in meta-evals/ with DATABASE_URL=...");
    console.error("  2. Or copy from apps/web/.env.local\n");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
