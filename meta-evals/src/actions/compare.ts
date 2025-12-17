import enquirer from "enquirer";
import { rankVersions, type RankingCandidate } from "@roast/ai/server";
import {
  metaEvaluationRepository,
  type EvaluationVersionWithDetails,
  type BatchWithCount,
} from "@roast/db";
import {
  formatCommentForApi,
  printRankingResult,
  printComparisonSummary,
} from "../utils/formatters";

const { prompt } = enquirer as any;

export async function runCompareAction() {
  const compareBy = await selectCompareMode();

  if (compareBy === "batches") {
    await runBatchComparison();
  } else {
    await runVersionComparison();
  }
}

async function selectCompareMode(): Promise<"batches" | "versions"> {
  const { compareBy } = await prompt({
    type: "select",
    name: "compareBy",
    message: "How do you want to compare?",
    choices: [
      { name: "batches", message: "By batch - A/B test between runs" },
      { name: "versions", message: "By specific versions - Pick individual evaluations" },
    ],
  });
  return compareBy;
}

async function runBatchComparison() {
  const batches = await metaEvaluationRepository.getRecentBatches();

  if (batches.length < 2) {
    console.log("Need at least 2 batches to compare.");
    return;
  }

  const baseline = await selectBatch(batches, "Select BASELINE batch:");
  const candidate = await selectBatch(
    batches.filter((b) => b.trackingId !== baseline),
    "Select CANDIDATE batch:"
  );
  const limit = await askLimit();

  console.log("\n🔍 Loading evaluation data...\n");

  const [baselineVersions, candidateVersions] = await Promise.all([
    metaEvaluationRepository.getVersionsByBatchTrackingId(baseline),
    metaEvaluationRepository.getVersionsByBatchTrackingId(candidate),
  ]);

  const results = await compareVersionPairs(
    baselineVersions,
    candidateVersions,
    baseline,
    candidate,
    limit
  );

  printComparisonSummary(results, `Baseline (${baseline})`, `Candidate (${candidate})`);
}

async function selectBatch(batches: BatchWithCount[], message: string): Promise<string> {
  const { selected } = await prompt({
    type: "select",
    name: "selected",
    message,
    choices: batches.map((b) => ({
      name: b.trackingId!,
      message: formatBatchChoice(b),
    })),
  });
  return selected;
}

function formatBatchChoice(b: BatchWithCount) {
  const date = b.createdAt.toLocaleDateString();
  return `${b.trackingId} | ${b.agent.id} | ${b._count.jobs} jobs | ${date}`;
}

async function askLimit(): Promise<number> {
  const { limit } = await prompt({
    type: "numeral",
    name: "limit",
    message: "How many documents to compare?",
    initial: 5,
  });
  return limit;
}

async function compareVersionPairs(
  baselineVersions: EvaluationVersionWithDetails[],
  candidateVersions: EvaluationVersionWithDetails[],
  baselineLabel: string,
  candidateLabel: string,
  limit: number
) {
  const results: Array<{ documentId: string; winner: string }> = [];

  for (const baselineVer of baselineVersions.slice(0, limit)) {
    const candidateVer = findMatchingVersion(candidateVersions, baselineVer);
    if (!candidateVer) continue;

    const winner = await compareTwo(
      baselineVer,
      candidateVer,
      baselineLabel,
      candidateLabel
    );

    results.push({ documentId: baselineVer.documentVersionId, winner });
  }

  return results;
}

function findMatchingVersion(
  versions: EvaluationVersionWithDetails[],
  target: EvaluationVersionWithDetails
) {
  return versions.find((v) => v.documentVersionId === target.documentVersionId);
}

async function compareTwo(
  baseline: EvaluationVersionWithDetails,
  candidate: EvaluationVersionWithDetails,
  baselineLabel: string,
  candidateLabel: string
): Promise<"baseline" | "candidate"> {
  console.log(`📄 Comparing: ${baseline.documentVersion.title.slice(0, 50)}...`);

  const candidates: RankingCandidate[] = [
    {
      versionId: baseline.id,
      comments: baseline.comments.map(formatCommentForApi),
      agentName: `baseline (${baselineLabel})`,
    },
    {
      versionId: candidate.id,
      comments: candidate.comments.map(formatCommentForApi),
      agentName: `candidate (${candidateLabel})`,
    },
  ];

  const result = await rankVersions({
    sourceText: baseline.documentVersion.content,
    candidates,
  });

  const winner = result.rankings[0].versionId === baseline.id ? "baseline" : "candidate";
  console.log(`   Winner: ${winner}`);

  return winner;
}

async function runVersionComparison() {
  const versions = await metaEvaluationRepository.getRecentEvaluationVersions(30);

  if (versions.length < 2) {
    console.log("Need at least 2 evaluation versions to compare.");
    return;
  }

  const selectedVersions = await selectMultipleVersions(versions);

  console.log(`\n🔍 Comparing ${selectedVersions.length} versions...\n`);

  const candidates: RankingCandidate[] = selectedVersions.map((v) => ({
    versionId: v.id,
    comments: v.comments.map(formatCommentForApi),
    agentName: v.evaluation.agentId,
  }));

  const result = await rankVersions({
    sourceText: selectedVersions[0].documentVersion.content,
    candidates,
  });

  printRankingResult(result, candidates);
}

async function selectMultipleVersions(versions: EvaluationVersionWithDetails[]) {
  const { selectedIds } = await prompt({
    type: "multiselect",
    name: "selectedIds",
    message: "Select versions to compare (2-10):",
    choices: versions.map((v) => ({
      name: v.id,
      message: formatVersionChoice(v),
    })),
    validate: (value: string[]) => {
      if (value.length < 2) return "Select at least 2 versions";
      if (value.length > 10) return "Maximum 10 versions";
      return true;
    },
  });

  return versions.filter((v) => selectedIds.includes(v.id));
}

function formatVersionChoice(v: EvaluationVersionWithDetails) {
  const title = v.documentVersion.title.slice(0, 35);
  const agent = v.evaluation.agentId;
  const count = v.comments.length;
  return `${title}... | ${agent} | ${count} comments`;
}
