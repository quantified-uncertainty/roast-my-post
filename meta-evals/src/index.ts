/**
 * Interactive CLI for meta-evaluation
 *
 * Usage: pnpm --filter @roast/meta-evals run start
 */

import "dotenv/config";

// Check required env vars before importing prisma (which will crash without DATABASE_URL)
if (!process.env.DATABASE_URL) {
  console.error("\n❌ DATABASE_URL environment variable is required.\n");
  console.error("Please either:");
  console.error("  1. Create a .env file in meta-evals/ with DATABASE_URL=...");
  console.error("  2. Or copy from apps/web/.env.local\n");
  process.exit(1);
}

import { prisma } from "@roast/db";
import enquirer from "enquirer";
import {
  scoreComments,
  rankVersions,
  QUALITY_DIMENSIONS,
  COLLECTION_DIMENSIONS,
  type RankingCandidate,
  type ScoringResult,
} from "@roast/ai/server";

const { prompt } = enquirer as any;

type EvalMode = "score" | "compare" | "exit";

async function selectMode(): Promise<EvalMode> {
  const { mode } = await prompt({
    type: "select",
    name: "mode",
    message: "What would you like to do?",
    choices: [
      { name: "score", message: "Score - Rate outputs on quality dimensions" },
      { name: "compare", message: "Compare - Rank multiple versions" },
      { name: "exit", message: "Exit" },
    ],
  });
  return mode;
}

async function getRecentBatches(limit = 10) {
  return prisma.agentEvalBatch.findMany({
    where: { trackingId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      agent: true,
      _count: { select: { jobs: true } },
    },
  });
}

async function getRecentEvaluationVersions(limit = 20) {
  return prisma.evaluationVersion.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      documentVersion: { select: { title: true } },
      comments: { include: { highlight: true } },
      evaluation: { select: { agentId: true } },
    },
  });
}

function formatComment(comment: {
  header: string | null;
  level: string | null;
  description: string;
  highlight: { quotedText: string };
}) {
  return {
    header: comment.header || undefined,
    level: (comment.level as "error" | "warning" | "info") || undefined,
    description: comment.description,
    highlight: {
      quotedText: comment.highlight.quotedText,
      startOffset: 0,
      endOffset: 0,
      isValid: true,
    },
  };
}

function printScoringResult(result: ScoringResult) {
  console.log("\n📊 SCORING RESULTS");
  console.log("=".repeat(60));
  console.log(`Overall Score: ${result.overallScore}/10\n`);

  const allDimensions = [...QUALITY_DIMENSIONS, ...COLLECTION_DIMENSIONS];
  for (const dim of allDimensions) {
    const score = result.dimensions[dim];
    const bar = "█".repeat(Math.round(score.score)) + "░".repeat(10 - Math.round(score.score));
    console.log(`  ${dim.padEnd(14)} [${bar}] ${score.score}/10`);
  }

  console.log("\n📝 Assessment:");
  console.log(result.reasoning);
}

async function runScoreMode() {
  const versions = await getRecentEvaluationVersions();

  if (versions.length === 0) {
    console.log("No evaluation versions found.");
    return;
  }

  const { selectedVersionId } = await prompt({
    type: "select",
    name: "selectedVersionId",
    message: "Select an evaluation to score:",
    choices: versions.map((v) => ({
      name: v.id,
      message: `${v.documentVersion.title.slice(0, 40)}... | ${v.evaluation.agentId} | ${v.comments.length} comments`,
    })),
  });

  const version = versions.find((v) => v.id === selectedVersionId)!;

  const { save } = await prompt({
    type: "confirm",
    name: "save",
    message: "Save results to database?",
    initial: false,
  });

  console.log("\n🔍 Scoring evaluation...\n");

  const documentVersion = await prisma.documentVersion.findUnique({
    where: { id: version.documentVersionId },
  });

  const result = await scoreComments({
    sourceText: documentVersion!.content,
    comments: version.comments.map(formatComment),
    agentName: version.evaluation.agentId,
  });

  printScoringResult(result);

  if (save) {
    await prisma.metaEvaluation.create({
      data: {
        evaluationId: version.evaluationId,
        type: "scoring",
        overallScore: result.overallScore,
        dimensions: result.dimensions,
        reasoning: result.reasoning,
        judgeModel: "claude-sonnet-4-20250514",
      },
    });
    console.log("\n✅ Results saved to database");
  }
}

async function runCompareMode() {
  const { compareBy } = await prompt({
    type: "select",
    name: "compareBy",
    message: "How do you want to compare?",
    choices: [
      { name: "batches", message: "By batch (trackingId) - A/B test between runs" },
      { name: "versions", message: "By specific versions - Pick individual evaluations" },
    ],
  });

  if (compareBy === "batches") {
    await runBatchComparison();
  } else {
    await runVersionComparison();
  }
}

async function runBatchComparison() {
  const batches = await getRecentBatches();

  if (batches.length < 2) {
    console.log("Need at least 2 batches to compare.");
    return;
  }

  const batchChoices = batches.map((b) => ({
    name: b.trackingId!,
    message: `${b.trackingId} | ${b.agent.id} | ${b._count.jobs} jobs | ${b.createdAt.toLocaleDateString()}`,
  }));

  const { baseline } = await prompt({
    type: "select",
    name: "baseline",
    message: "Select BASELINE batch:",
    choices: batchChoices,
  });

  const { candidate } = await prompt({
    type: "select",
    name: "candidate",
    message: "Select CANDIDATE batch:",
    choices: batchChoices.filter((c) => c.name !== baseline),
  });

  const { limit } = await prompt({
    type: "numeral",
    name: "limit",
    message: "How many documents to compare?",
    initial: 5,
  });

  console.log("\n🔍 Loading evaluation data...\n");

  // Load versions for both batches
  const [baselineBatch, candidateBatch] = await Promise.all([
    prisma.agentEvalBatch.findFirst({
      where: { trackingId: baseline },
      include: {
        jobs: {
          include: {
            evaluationVersion: {
              include: {
                comments: { include: { highlight: true } },
                documentVersion: true,
              },
            },
          },
        },
      },
    }),
    prisma.agentEvalBatch.findFirst({
      where: { trackingId: candidate },
      include: {
        jobs: {
          include: {
            evaluationVersion: {
              include: {
                comments: { include: { highlight: true } },
                documentVersion: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const baselineVersions = baselineBatch!.jobs
    .filter((j) => j.evaluationVersion)
    .map((j) => j.evaluationVersion!);
  const candidateVersions = candidateBatch!.jobs
    .filter((j) => j.evaluationVersion)
    .map((j) => j.evaluationVersion!);

  const results: { documentId: string; winner: string; reasoning: string }[] = [];
  let compared = 0;

  for (const baselineVer of baselineVersions.slice(0, limit)) {
    const candidateVer = candidateVersions.find(
      (c) => c.documentVersionId === baselineVer.documentVersionId
    );

    if (!candidateVer) continue;

    console.log(`📄 Comparing: ${baselineVer.documentVersion.title.slice(0, 50)}...`);

    const rankingCandidates: RankingCandidate[] = [
      {
        versionId: baselineVer.id,
        comments: baselineVer.comments.map(formatComment),
        agentName: `baseline (${baseline})`,
      },
      {
        versionId: candidateVer.id,
        comments: candidateVer.comments.map(formatComment),
        agentName: `candidate (${candidate})`,
      },
    ];

    const result = await rankVersions({
      sourceText: baselineVer.documentVersion.content,
      candidates: rankingCandidates,
    });

    const winner = result.rankings[0].versionId === baselineVer.id ? "baseline" : "candidate";
    console.log(`   Winner: ${winner}`);

    results.push({
      documentId: baselineVer.documentVersionId,
      winner,
      reasoning: result.reasoning,
    });

    compared++;
  }

  // Summary
  const baselineWins = results.filter((r) => r.winner === "baseline").length;
  const candidateWins = results.filter((r) => r.winner === "candidate").length;

  console.log("\n" + "=".repeat(60));
  console.log("📊 SUMMARY");
  console.log("=".repeat(60));
  console.log(`Documents compared: ${compared}`);
  console.log(`Baseline wins: ${baselineWins} (${Math.round((baselineWins / compared) * 100)}%)`);
  console.log(`Candidate wins: ${candidateWins} (${Math.round((candidateWins / compared) * 100)}%)`);

  if (candidateWins > baselineWins) {
    console.log("\n✅ Recommendation: Deploy candidate");
  } else if (baselineWins > candidateWins) {
    console.log("\n⚠️  Recommendation: Keep baseline");
  } else {
    console.log("\n🤷 Recommendation: Tie - need more data");
  }
}

async function runVersionComparison() {
  const versions = await getRecentEvaluationVersions(30);

  if (versions.length < 2) {
    console.log("Need at least 2 evaluation versions to compare.");
    return;
  }

  const { selectedVersionIds } = await prompt({
    type: "multiselect",
    name: "selectedVersionIds",
    message: "Select versions to compare (2-10):",
    choices: versions.map((v) => ({
      name: v.id,
      message: `${v.documentVersion.title.slice(0, 35)}... | ${v.evaluation.agentId} | ${v.comments.length} comments`,
    })),
    validate: (value: string[]) => {
      if (value.length < 2) return "Select at least 2 versions";
      if (value.length > 10) return "Maximum 10 versions";
      return true;
    },
  });

  const selectedVersions = versions.filter((v) => selectedVersionIds.includes(v.id));

  // Get full document content for the first one (assumes same document)
  const documentVersion = await prisma.documentVersion.findUnique({
    where: { id: selectedVersions[0].documentVersionId },
  });

  console.log(`\n🔍 Comparing ${selectedVersions.length} versions...\n`);

  const candidates: RankingCandidate[] = selectedVersions.map((v) => ({
    versionId: v.id,
    comments: v.comments.map(formatComment),
    agentName: v.evaluation.agentId,
  }));

  const result = await rankVersions({
    sourceText: documentVersion!.content,
    candidates,
  });

  console.log("📊 RANKING RESULTS");
  console.log("=".repeat(60));
  for (const ranking of result.rankings) {
    const candidate = candidates.find((c) => c.versionId === ranking.versionId);
    console.log(
      `  #${ranking.rank}: ${candidate?.agentName || ranking.versionId.slice(0, 8)} (score: ${ranking.relativeScore})`
    );
  }
  console.log("\n📝 Reasoning:");
  console.log(result.reasoning);
}

async function main() {
  console.log("\n🔬 Meta-Evaluation Tool\n");

  while (true) {
    const mode = await selectMode();

    if (mode === "exit") {
      console.log("\nGoodbye!\n");
      break;
    }

    try {
      if (mode === "score") {
        await runScoreMode();
      } else if (mode === "compare") {
        await runCompareMode();
      }
    } catch (error) {
      console.error("\n❌ Error:", error);
    }

    console.log("\n");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
