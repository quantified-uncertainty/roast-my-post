/**
 * Chain Detail Screen
 *
 * Shows all runs in a chain and allows:
 * - Creating new runs
 * - Comparing runs
 */

import enquirer from "enquirer";
import Table from "cli-table3";
import { prisma } from "@roast/db";
import { rankVersions, type RankingCandidate } from "@roast/ai/server";
import { createRun } from "./baseline";
import { formatCommentForApi } from "../utils/formatters";

const { prompt } = enquirer as any;

interface Run {
  trackingId: string;
  agentId: string;
  agentName: string;
  createdAt: Date;
  jobStatus: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  evaluationVersionId: string | null;
  documentVersionId: string | null;
}

interface ChainInfo {
  chainId: string;
  documentId: string;
  documentTitle: string;
  documentContent: string;
  agentIds: string[];
  runs: Run[];
}

export async function showChainDetail(chainId: string) {
  while (true) {
    const chain = await getChainInfo(chainId);

    if (!chain) {
      console.log(`\nChain ${chainId} not found.`);
      return;
    }

    console.log(`\n📊 Evaluation Chain: ${chainId}`);
    console.log(`   Document: ${truncate(chain.documentTitle, 50)}`);
    console.log(`   Agents: ${chain.agentIds.length}`);
    console.log("");

    // Group runs by timestamp (runs created at same time are one "run set")
    const runSets = groupRunsByTimestamp(chain.runs);

    // Display runs table
    const table = new Table({
      head: ["#", "Time", "Agent", "Status"],
      colWidths: [4, 18, 30, 12],
    });

    let runIndex = 1;
    for (const runSet of runSets) {
      const time = formatDateTime(runSet.timestamp);
      for (const run of runSet.runs) {
        const isFirst = run === runSet.runs[0];
        table.push([
          runIndex.toString(),
          isFirst ? time : "",
          truncate(run.agentName, 28),
          formatStatus(run.jobStatus),
        ]);
        runIndex++;
      }
    }

    console.log(table.toString());

    // Action menu
    const { action } = await prompt({
      type: "select",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "run", message: "Run Again (create new evaluation)" },
        { name: "compare", message: "Compare Runs" },
        { name: "back", message: "← Back to main menu" },
      ],
    });

    if (action === "back") {
      return;
    }

    if (action === "run") {
      await createRun(chainId, chain.documentId, chain.agentIds);
      // Loop continues to show updated list
    }

    if (action === "compare") {
      await compareRuns(chain, runSets);
    }
  }
}

async function getChainInfo(chainId: string): Promise<ChainInfo | null> {
  // Get all batches in this chain
  const batches = await prisma.agentEvalBatch.findMany({
    where: {
      trackingId: { startsWith: chainId },
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
          evaluationVersion: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (batches.length === 0) {
    return null;
  }

  // Extract document info from first batch
  const firstJob = batches[0]?.jobs[0];
  const doc = firstJob?.evaluation?.document;
  const docVersion = doc?.versions[0];

  if (!doc || !docVersion) {
    return null;
  }

  // Collect unique agent IDs
  const agentIds = [...new Set(batches.map((b) => b.agentId))];

  // Build runs list
  const runs: Run[] = [];
  for (const batch of batches) {
    const job = batch.jobs[0];
    const agentName = batch.agent.versions[0]?.name || batch.agentId;

    runs.push({
      trackingId: batch.trackingId || "",
      agentId: batch.agentId,
      agentName,
      createdAt: batch.createdAt,
      jobStatus: (job?.status as Run["jobStatus"]) || "PENDING",
      evaluationVersionId: job?.evaluationVersionId || null,
      documentVersionId: job?.evaluationVersion?.documentVersionId || null,
    });
  }

  return {
    chainId,
    documentId: doc.id,
    documentTitle: docVersion.title,
    documentContent: docVersion.content,
    agentIds,
    runs,
  };
}

interface RunSet {
  timestamp: Date;
  runs: Run[];
}

function groupRunsByTimestamp(runs: Run[]): RunSet[] {
  const groups = new Map<string, Run[]>();

  for (const run of runs) {
    // Group by minute-level timestamp
    const key = run.createdAt.toISOString().slice(0, 16);
    const existing = groups.get(key);
    if (existing) {
      existing.push(run);
    } else {
      groups.set(key, [run]);
    }
  }

  const runSets: RunSet[] = [];
  for (const [, groupRuns] of groups) {
    runSets.push({
      timestamp: groupRuns[0].createdAt,
      runs: groupRuns,
    });
  }

  // Sort by timestamp
  runSets.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return runSets;
}

async function compareRuns(chain: ChainInfo, runSets: RunSet[]) {
  // Filter to completed runs only
  const completedRuns = chain.runs.filter(
    (r) => r.jobStatus === "COMPLETED" && r.evaluationVersionId
  );

  if (completedRuns.length < 2) {
    console.log("\nNeed at least 2 completed runs to compare.");
    return;
  }

  // Let user select runs to compare
  const { selectedTrackingIds } = await prompt({
    type: "multiselect",
    name: "selectedTrackingIds",
    message: "Select runs to compare (2-5):",
    choices: completedRuns.map((r) => ({
      name: r.trackingId,
      message: `${formatDateTime(r.createdAt)} - ${r.agentName}`,
    })),
    validate: (value: string[]) => {
      if (value.length < 2) return "Select at least 2 runs";
      if (value.length > 5) return "Maximum 5 runs";
      return true;
    },
  });

  const selectedRuns = completedRuns.filter((r) =>
    selectedTrackingIds.includes(r.trackingId)
  );

  console.log("\n🔍 Comparing runs...\n");

  // Load evaluation data for selected runs
  const candidates: RankingCandidate[] = [];

  for (const run of selectedRuns) {
    if (!run.evaluationVersionId) continue;

    const evalVersion = await prisma.evaluationVersion.findUnique({
      where: { id: run.evaluationVersionId },
      include: {
        comments: {
          include: { highlight: true },
        },
      },
    });

    if (!evalVersion) continue;

    candidates.push({
      versionId: run.trackingId,
      agentName: `${run.agentName} (${formatDateTime(run.createdAt)})`,
      comments: evalVersion.comments.map(formatCommentForApi),
    });
  }

  if (candidates.length < 2) {
    console.log("Could not load evaluation data for selected runs.");
    return;
  }

  // Run comparison
  try {
    const result = await rankVersions({
      sourceText: chain.documentContent,
      candidates,
    });

    // Display results
    console.log("\n📊 Comparison Results\n");

    const resultsTable = new Table({
      head: ["Rank", "Run", "Score"],
      colWidths: [6, 50, 8],
    });

    for (const ranking of result.rankings) {
      const candidate = candidates.find((c) => c.versionId === ranking.versionId);
      resultsTable.push([
        ranking.rank.toString(),
        candidate?.agentName || ranking.versionId,
        ranking.relativeScore.toString(),
      ]);
    }

    console.log(resultsTable.toString());

    if (result.reasoning) {
      console.log("\n📝 Reasoning:");
      console.log(result.reasoning);
    }
  } catch (error) {
    console.error("Comparison failed:", error);
  }
}

function formatDateTime(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hour}:${min}`;
}

function formatStatus(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "✓ Done";
    case "RUNNING":
      return "⏳ Running";
    case "FAILED":
      return "✗ Failed";
    case "PENDING":
      return "⏸ Pending";
    default:
      return status;
  }
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}
