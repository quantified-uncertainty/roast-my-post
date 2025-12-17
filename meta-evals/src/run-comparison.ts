/**
 * CLI tool for comparing agent outputs using meta-evaluation
 *
 * Usage:
 *   pnpm --filter @roast/meta-evals run compare --baseline <trackingId> --candidate <trackingId>
 *   pnpm --filter @roast/meta-evals run compare --versions <versionId1> <versionId2> ...
 */

import "dotenv/config";
import { prisma } from "@roast/db";
import { rankVersions, type RankingCandidate } from "@roast/ai/server";

interface CliArgs {
  baseline?: string;
  candidate?: string;
  versions?: string[];
  documentId?: string;
  limit?: number;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--baseline" && args[i + 1]) {
      result.baseline = args[++i];
    } else if (arg === "--candidate" && args[i + 1]) {
      result.candidate = args[++i];
    } else if (arg === "--versions") {
      result.versions = [];
      while (args[i + 1] && !args[i + 1].startsWith("--")) {
        result.versions.push(args[++i]);
      }
    } else if (arg === "--document" && args[i + 1]) {
      result.documentId = args[++i];
    } else if (arg === "--limit" && args[i + 1]) {
      result.limit = parseInt(args[++i], 10);
    }
  }

  return result;
}

async function getEvaluationVersionsByTrackingId(
  trackingId: string,
  documentId?: string
) {
  const batch = await prisma.agentEvalBatch.findFirst({
    where: { trackingId },
    include: {
      jobs: {
        where: documentId ? { evaluation: { documentId } } : undefined,
        include: {
          evaluationVersion: {
            include: {
              comments: {
                include: { highlight: true },
              },
              documentVersion: true,
            },
          },
        },
      },
    },
  });

  if (!batch) {
    throw new Error(`No batch found with trackingId: ${trackingId}`);
  }

  return batch.jobs
    .filter((j) => j.evaluationVersion)
    .map((j) => j.evaluationVersion!);
}

async function getEvaluationVersionById(versionId: string) {
  const version = await prisma.evaluationVersion.findUnique({
    where: { id: versionId },
    include: {
      comments: {
        include: { highlight: true },
      },
      documentVersion: true,
    },
  });

  if (!version) {
    throw new Error(`No evaluation version found with id: ${versionId}`);
  }

  return version;
}

function formatComment(comment: {
  header: string | null;
  description: string;
  highlight: { quotedText: string };
}) {
  return {
    header: comment.header || undefined,
    description: comment.description,
    highlight: {
      quotedText: comment.highlight.quotedText,
      startOffset: 0,
      endOffset: 0,
      isValid: true,
    },
  };
}

async function main() {
  const args = parseArgs();

  if (!args.baseline && !args.versions) {
    console.log(`
Meta-Evaluation Comparison Tool

Usage:
  Compare by tracking IDs:
    pnpm --filter @roast/meta-evals run compare --baseline <trackingId> --candidate <trackingId>

  Compare specific versions:
    pnpm --filter @roast/meta-evals run compare --versions <versionId1> <versionId2> [...]

Options:
  --document <id>    Filter to specific document
  --limit <n>        Limit number of comparisons
`);
    process.exit(0);
  }

  console.log("🔍 Loading evaluation data...\n");

  let candidates: RankingCandidate[] = [];
  let sourceText = "";

  if (args.versions && args.versions.length >= 2) {
    // Compare specific versions
    const versions = await Promise.all(
      args.versions.map((id) => getEvaluationVersionById(id))
    );

    // Use the first version's document content as source
    sourceText = versions[0].documentVersion.content;

    candidates = versions.map((v) => ({
      versionId: v.id,
      comments: v.comments.map(formatComment),
      agentName: v.agentId,
    }));
  } else if (args.baseline && args.candidate) {
    // Compare by tracking IDs
    const [baselineVersions, candidateVersions] = await Promise.all([
      getEvaluationVersionsByTrackingId(args.baseline, args.documentId),
      getEvaluationVersionsByTrackingId(args.candidate, args.documentId),
    ]);

    if (baselineVersions.length === 0 || candidateVersions.length === 0) {
      console.error("❌ No evaluation versions found for one or both batches");
      process.exit(1);
    }

    // Match by document and compare
    const limit = args.limit || 10;
    let compared = 0;
    const results: { documentId: string; winner: string; reasoning: string }[] =
      [];

    for (const baselineVer of baselineVersions.slice(0, limit)) {
      const candidateVer = candidateVersions.find(
        (c) => c.documentVersionId === baselineVer.documentVersionId
      );

      if (!candidateVer) continue;

      sourceText = baselineVer.documentVersion.content;

      const rankingCandidates: RankingCandidate[] = [
        {
          versionId: baselineVer.id,
          comments: baselineVer.comments.map(formatComment),
          agentName: `baseline (${args.baseline})`,
        },
        {
          versionId: candidateVer.id,
          comments: candidateVer.comments.map(formatComment),
          agentName: `candidate (${args.candidate})`,
        },
      ];

      console.log(
        `\n📄 Comparing document: ${baselineVer.documentVersion.title.slice(0, 50)}...`
      );
      console.log(`   Baseline comments: ${baselineVer.comments.length}`);
      console.log(`   Candidate comments: ${candidateVer.comments.length}`);

      const result = await rankVersions({
        sourceText,
        candidates: rankingCandidates,
      });

      const winner =
        result.rankings[0].versionId === baselineVer.id
          ? "baseline"
          : "candidate";
      console.log(`   Winner: ${winner}`);
      console.log(`   Reasoning: ${result.reasoning.slice(0, 200)}...`);

      results.push({
        documentId: baselineVer.documentVersionId,
        winner,
        reasoning: result.reasoning,
      });

      compared++;
    }

    // Summary
    const baselineWins = results.filter((r) => r.winner === "baseline").length;
    const candidateWins = results.filter(
      (r) => r.winner === "candidate"
    ).length;

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

    await prisma.$disconnect();
    return;
  }

  // Single comparison with loaded candidates
  if (candidates.length >= 2) {
    console.log(`Comparing ${candidates.length} versions...\n`);

    const result = await rankVersions({
      sourceText,
      candidates,
    });

    console.log("📊 RANKING RESULTS");
    console.log("=".repeat(60));
    for (const ranking of result.rankings) {
      const candidate = candidates.find((c) => c.versionId === ranking.versionId);
      console.log(
        `  #${ranking.rank}: ${candidate?.agentName || ranking.versionId} (score: ${ranking.relativeScore})`
      );
    }
    console.log("\n📝 Reasoning:");
    console.log(result.reasoning);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
