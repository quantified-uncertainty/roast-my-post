import {
  QUALITY_DIMENSIONS,
  COLLECTION_DIMENSIONS,
  type ScoringResult,
  type RankingResult,
  type RankingCandidate,
} from "@roast/ai/server";

type DbComment = {
  header: string | null;
  level: string | null;
  description: string;
  highlight: { quotedText: string };
};

export function formatCommentForApi(comment: DbComment) {
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

export function printScoringResult(result: ScoringResult) {
  console.log("\n📊 SCORING RESULTS");
  console.log("=".repeat(60));
  console.log(`Overall Score: ${result.overallScore}/10\n`);

  const allDimensions = [...QUALITY_DIMENSIONS, ...COLLECTION_DIMENSIONS];
  for (const dim of allDimensions) {
    const score = result.dimensions[dim];
    const bar =
      "█".repeat(Math.round(score.score)) +
      "░".repeat(10 - Math.round(score.score));
    console.log(`  ${dim.padEnd(14)} [${bar}] ${score.score}/10`);
  }

  console.log("\n📝 Assessment:");
  console.log(result.reasoning);
}

export function printRankingResult(
  result: RankingResult,
  candidates: RankingCandidate[]
) {
  console.log("\n📊 RANKING RESULTS");
  console.log("=".repeat(60));

  for (const ranking of result.rankings) {
    const candidate = candidates.find((c) => c.versionId === ranking.versionId);
    const name = candidate?.agentName || ranking.versionId.slice(0, 8);
    console.log(`  #${ranking.rank}: ${name} (score: ${ranking.relativeScore})`);
  }

  console.log("\n📝 Reasoning:");
  console.log(result.reasoning);
}

export function printComparisonSummary(
  results: Array<{ winner: string }>,
  baselineLabel: string,
  candidateLabel: string
) {
  const total = results.length;
  const baselineWins = results.filter((r) => r.winner === "baseline").length;
  const candidateWins = results.filter((r) => r.winner === "candidate").length;

  console.log("\n" + "=".repeat(60));
  console.log("📊 SUMMARY");
  console.log("=".repeat(60));
  console.log(`Documents compared: ${total}`);
  console.log(
    `${baselineLabel} wins: ${baselineWins} (${Math.round((baselineWins / total) * 100)}%)`
  );
  console.log(
    `${candidateLabel} wins: ${candidateWins} (${Math.round((candidateWins / total) * 100)}%)`
  );

  if (candidateWins > baselineWins) {
    console.log("\n✅ Recommendation: Deploy candidate");
  } else if (baselineWins > candidateWins) {
    console.log("\n⚠️  Recommendation: Keep baseline");
  } else {
    console.log("\n🤷 Recommendation: Tie - need more data");
  }
}
