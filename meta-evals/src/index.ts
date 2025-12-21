/**
 * Interactive CLI for meta-evaluation
 *
 * Simplified flow:
 * 1. If no series exist → Create Baseline
 * 2. If series exist → List them, select one to manage
 *
 * Usage:
 *   pnpm --filter @roast/meta-evals run start          # Interactive mode
 *   pnpm --filter @roast/meta-evals run start --check  # Verify setup only
 */

import "dotenv/config";
import enquirer from "enquirer";
import {
  metaEvaluationRepository,
  type SeriesSummary,
} from "@roast/db";
import { createBaseline } from "./actions/baseline";
import { showSeriesDetail } from "./actions/seriesDetail";

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
    const seriesList = await getSeries();

    if (seriesList.length === 0) {
      // No series - only option is to create baseline
      console.log("No evaluation series yet.\n");
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
      // Has series - show list
      const choices = [
        ...seriesList.map((s) => ({
          name: s.id,
          message: formatSeriesChoice(s),
        })),
        { name: "create", message: "➕ Create New Baseline" },
        { name: "exit", message: "Exit" },
      ];

      const { selected } = await prompt({
        type: "select",
        name: "selected",
        message: "Select an evaluation series:",
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
        const series = seriesList.find((s) => s.id === selected);
        if (series) {
          try {
            await showSeriesDetail(series.id);
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

async function getSeries(): Promise<SeriesSummary[]> {
  return metaEvaluationRepository.getSeries();
}

function formatSeriesChoice(series: SeriesSummary): string {
  const title = series.documentTitle.length > 40
    ? series.documentTitle.slice(0, 37) + "..."
    : series.documentTitle;
  const agents = series.agentNames.length > 2
    ? `${series.agentNames.slice(0, 2).join(", ")}...`
    : series.agentNames.join(", ");
  return `${title} | ${series.runCount} run${series.runCount > 1 ? "s" : ""} | ${agents}`;
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
