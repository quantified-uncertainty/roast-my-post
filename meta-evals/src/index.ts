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
import { prisma } from "@roast/db";
import { createBaseline } from "./actions/baseline";
import { showChainDetail } from "./actions/chainDetail";

const { prompt } = enquirer as any;

// Chain = group of runs on same document with same agents
interface Chain {
  id: string; // The chain prefix (e.g., "chain-abc123")
  documentTitle: string;
  documentId: string;
  agentNames: string[];
  runCount: number;
  firstRunAt: Date;
  lastRunAt: Date;
}

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

  await prisma.$disconnect();
}

/**
 * Get all chains grouped by their prefix
 * Chain trackingIds follow pattern: chain-{shortId}-{timestamp}
 */
async function getChains(): Promise<Chain[]> {
  // Get all batches with trackingIds that start with "chain-"
  const batches = await prisma.agentEvalBatch.findMany({
    where: {
      trackingId: { startsWith: "chain-" },
    },
    include: {
      agent: {
        include: {
          versions: {
            orderBy: { version: "desc" },
            take: 1,
          },
        },
      },
      jobs: {
        include: {
          evaluation: {
            include: {
              document: {
                include: {
                  versions: {
                    orderBy: { version: "desc" },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by chain prefix (chain-{shortId})
  const chainMap = new Map<string, {
    batches: typeof batches;
    documentTitle: string;
    documentId: string;
    agentNames: Set<string>;
  }>();

  for (const batch of batches) {
    if (!batch.trackingId) continue;

    // Extract chain prefix: "chain-abc123" from "chain-abc123-20251217-1645"
    const parts = batch.trackingId.split("-");
    if (parts.length < 2) continue;
    const chainId = `${parts[0]}-${parts[1]}`; // "chain-abc123"

    const existing = chainMap.get(chainId);
    const agentName = batch.agent.versions[0]?.name || batch.agentId;
    const doc = batch.jobs[0]?.evaluation?.document;
    const docTitle = doc?.versions[0]?.title || "Unknown document";
    const docId = doc?.id || "";

    if (existing) {
      existing.batches.push(batch);
      existing.agentNames.add(agentName);
    } else {
      chainMap.set(chainId, {
        batches: [batch],
        documentTitle: docTitle,
        documentId: docId,
        agentNames: new Set([agentName]),
      });
    }
  }

  // Convert to Chain array
  const chains: Chain[] = [];
  for (const [id, data] of chainMap) {
    const sortedBatches = data.batches.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    chains.push({
      id,
      documentTitle: data.documentTitle,
      documentId: data.documentId,
      agentNames: Array.from(data.agentNames),
      runCount: sortedBatches.length,
      firstRunAt: sortedBatches[0].createdAt,
      lastRunAt: sortedBatches[sortedBatches.length - 1].createdAt,
    });
  }

  // Sort by most recent activity
  chains.sort((a, b) => b.lastRunAt.getTime() - a.lastRunAt.getTime());

  return chains;
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

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✓ Database connection successful");
  } catch (error) {
    console.error("✗ Database connection failed:", error);
    process.exit(1);
  }

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

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
