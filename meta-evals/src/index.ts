/**
 * Interactive CLI for meta-evaluation
 *
 * Usage:
 *   pnpm --filter @roast/meta-evals run start          # Interactive mode
 *   pnpm --filter @roast/meta-evals run start --check  # Verify setup only
 */

import "dotenv/config";
import enquirer from "enquirer";
import { prisma } from "@roast/db";
import { runScoreAction } from "./actions/score";
import { runCompareAction } from "./actions/compare";
import { runBaselineAction } from "./actions/baseline";

const { prompt } = enquirer as any;

type EvalMode = "baseline" | "score" | "compare" | "exit";

async function main() {
  checkEnvironment();

  // Non-interactive check mode for CI/development
  if (process.argv.includes("--check")) {
    await runCheckMode();
    return;
  }

  console.log("\n🔬 Meta-Evaluation Tool\n");

  while (true) {
    const mode = await selectMode();

    if (mode === "exit") {
      console.log("\nGoodbye!\n");
      break;
    }

    try {
      if (mode === "baseline") {
        await runBaselineAction();
      } else if (mode === "score") {
        await runScoreAction();
      } else if (mode === "compare") {
        await runCompareAction();
      }
    } catch (error) {
      console.error("\n❌ Error:", error);
    }

    console.log("\n");
  }

  await prisma.$disconnect();
}

async function runCheckMode() {
  console.log("🔬 Meta-Evaluation Tool - Check Mode\n");

  // Check imports work
  console.log("✓ Imports loaded successfully");

  // Check DB connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✓ Database connection successful");
  } catch (error) {
    console.error("✗ Database connection failed:", error);
    process.exit(1);
  }

  // Check tables exist
  try {
    const count = await prisma.metaEvaluation.count();
    console.log(`✓ MetaEvaluation table exists (${count} records)`);
  } catch (error) {
    console.error("✗ MetaEvaluation table check failed:", error);
    process.exit(1);
  }

  console.log("\n✅ All checks passed!\n");
  await prisma.$disconnect();
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

async function selectMode(): Promise<EvalMode> {
  const { mode } = await prompt({
    type: "select",
    name: "mode",
    message: "What would you like to do?",
    choices: [
      { name: "baseline", message: "Baseline - Create evaluation runs for comparison" },
      { name: "score", message: "Score - Rate outputs on quality dimensions" },
      { name: "compare", message: "Compare - Rank multiple versions" },
      { name: "exit", message: "Exit" },
    ],
  });
  return mode;
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
