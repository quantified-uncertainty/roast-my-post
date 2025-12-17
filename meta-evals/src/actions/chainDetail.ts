/**
 * Chain Detail Screen
 *
 * Shows all runs in a chain and allows:
 * - Creating new runs
 * - Comparing runs
 */

import enquirer from "enquirer";
import Table from "cli-table3";
import {
  metaEvaluationRepository,
  type ChainDetail,
  type ChainRun,
} from "@roast/db";
import { rankVersions, type RankingCandidate } from "@roast/ai/server";
import { createRun } from "./baseline";
import { formatCommentForApi } from "../utils/formatters";

const { prompt } = enquirer as any;

export async function showChainDetail(chainId: string) {
  while (true) {
    const chain = await metaEvaluationRepository.getChainDetail(chainId);

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

interface RunSet {
  timestamp: Date;
  runs: ChainRun[];
}

function groupRunsByTimestamp(runs: ChainRun[]): RunSet[] {
  const groups = new Map<string, ChainRun[]>();

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

async function compareRuns(chain: ChainDetail, runSets: RunSet[]) {
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

    const evalVersion = await metaEvaluationRepository.getEvaluationVersionWithComments(
      run.evaluationVersionId
    );

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
