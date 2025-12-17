/**
 * CLI tool for scoring agent outputs using meta-evaluation
 *
 * Usage:
 *   pnpm --filter @roast/meta-evals run score --version <evaluationVersionId>
 *   pnpm --filter @roast/meta-evals run score --batch <trackingId> --limit 5
 */

import "dotenv/config";
import { prisma } from "@roast/db";
import {
  scoreComments,
  QUALITY_DIMENSIONS,
  COLLECTION_DIMENSIONS,
  type ScoringResult,
} from "@roast/ai/server";

interface CliArgs {
  versionId?: string;
  trackingId?: string;
  limit?: number;
  save?: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--version" && args[i + 1]) {
      result.versionId = args[++i];
    } else if (arg === "--batch" && args[i + 1]) {
      result.trackingId = args[++i];
    } else if (arg === "--limit" && args[i + 1]) {
      result.limit = parseInt(args[++i], 10);
    } else if (arg === "--save") {
      result.save = true;
    }
  }

  return result;
}

async function getEvaluationVersion(versionId: string) {
  const version = await prisma.evaluationVersion.findUnique({
    where: { id: versionId },
    include: {
      comments: {
        include: { highlight: true },
      },
      documentVersion: true,
      evaluation: true,
    },
  });

  if (!version) {
    throw new Error(`No evaluation version found with id: ${versionId}`);
  }

  return version;
}

async function getEvaluationVersionsByTrackingId(trackingId: string) {
  const batch = await prisma.agentEvalBatch.findFirst({
    where: { trackingId },
    include: {
      jobs: {
        include: {
          evaluationVersion: {
            include: {
              comments: {
                include: { highlight: true },
              },
              documentVersion: true,
              evaluation: true,
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
  console.log(`Overall Score: ${result.overallScore}/10`);
  console.log("\nDimension Scores:");

  const allDimensions = [...QUALITY_DIMENSIONS, ...COLLECTION_DIMENSIONS];
  for (const dim of allDimensions) {
    const score = result.dimensions[dim];
    const bar = "█".repeat(score.score) + "░".repeat(10 - score.score);
    console.log(`  ${dim.padEnd(14)} [${bar}] ${score.score}/10`);
    console.log(`    ${score.explanation}`);
  }

  console.log("\n📝 Overall Assessment:");
  console.log(result.reasoning);
}

async function saveMetaEvaluation(
  evaluationId: string,
  result: ScoringResult,
  judgeModel: string
) {
  await prisma.metaEvaluation.create({
    data: {
      evaluationId,
      type: "scoring",
      overallScore: result.overallScore,
      dimensions: result.dimensions,
      reasoning: result.reasoning,
      judgeModel,
    },
  });
}

async function main() {
  const args = parseArgs();

  if (!args.versionId && !args.trackingId) {
    console.log(`
Meta-Evaluation Scoring Tool

Usage:
  Score single version:
    pnpm --filter @roast/meta-evals run score --version <evaluationVersionId>

  Score batch:
    pnpm --filter @roast/meta-evals run score --batch <trackingId> --limit 5

Options:
  --save    Save results to database
`);
    process.exit(0);
  }

  console.log("🔍 Loading evaluation data...\n");

  if (args.versionId) {
    // Score single version
    const version = await getEvaluationVersion(args.versionId);

    console.log(`Document: ${version.documentVersion.title}`);
    console.log(`Agent: ${version.agentId}`);
    console.log(`Comments: ${version.comments.length}`);

    const result = await scoreComments({
      sourceText: version.documentVersion.content,
      comments: version.comments.map(formatComment),
      agentName: version.agentId,
    });

    printScoringResult(result);

    if (args.save) {
      await saveMetaEvaluation(
        version.evaluationId,
        result,
        "claude-sonnet-4-20250514"
      );
      console.log("\n✅ Results saved to database");
    }
  } else if (args.trackingId) {
    // Score batch
    const versions = await getEvaluationVersionsByTrackingId(args.trackingId);
    const limit = args.limit || versions.length;

    console.log(`Found ${versions.length} versions, scoring ${limit}...\n`);

    const allResults: { title: string; score: number }[] = [];

    for (const version of versions.slice(0, limit)) {
      console.log(
        `\n📄 Scoring: ${version.documentVersion.title.slice(0, 50)}...`
      );

      const result = await scoreComments({
        sourceText: version.documentVersion.content,
        comments: version.comments.map(formatComment),
        agentName: version.agentId,
      });

      console.log(`   Overall: ${result.overallScore}/10`);
      allResults.push({
        title: version.documentVersion.title,
        score: result.overallScore,
      });

      if (args.save) {
        await saveMetaEvaluation(
          version.evaluationId,
          result,
          "claude-sonnet-4-20250514"
        );
      }
    }

    // Summary
    const avgScore =
      allResults.reduce((sum, r) => sum + r.score, 0) / allResults.length;

    console.log("\n" + "=".repeat(60));
    console.log("📊 BATCH SUMMARY");
    console.log("=".repeat(60));
    console.log(`Evaluations scored: ${allResults.length}`);
    console.log(`Average score: ${avgScore.toFixed(1)}/10`);
    console.log(
      `Range: ${Math.min(...allResults.map((r) => r.score))} - ${Math.max(...allResults.map((r) => r.score))}`
    );

    if (args.save) {
      console.log("\n✅ All results saved to database");
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
