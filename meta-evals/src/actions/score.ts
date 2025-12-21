import enquirer from "enquirer";
import { scoreComments } from "@roast/ai/server";
import {
  metaEvaluationRepository,
  type EvaluationVersionWithDetails,
} from "@roast/db";
import { formatCommentForApi, printScoringResult } from "../utils/formatters";

const { prompt } = enquirer as any;

const DEFAULT_JUDGE_MODEL = "claude-sonnet-4-20250514";

export async function runScoreAction() {
  const versions = await metaEvaluationRepository.getRecentEvaluationVersions();

  if (versions.length === 0) {
    console.log("No evaluation versions found.");
    return;
  }

  const selectedVersion = await selectVersion(versions);
  const shouldSave = await askToSave();

  console.log("\n🔍 Scoring evaluation...\n");

  const result = await scoreComments({
    sourceText: selectedVersion.documentVersion.content,
    comments: selectedVersion.comments.map(formatCommentForApi),
    agentName: selectedVersion.evaluation.agentId,
  });

  printScoringResult(result);

  if (shouldSave) {
    // Convert dimensions Record to array with name field
    const dimensionsArray = Object.entries(result.dimensions).map(
      ([name, { score, explanation }]) => ({
        name,
        score,
        explanation,
      })
    );

    await metaEvaluationRepository.saveScoringResult({
      evaluationVersionId: selectedVersion.id,
      overallScore: result.overallScore,
      dimensions: dimensionsArray,
      reasoning: result.reasoning,
      judgeModel: DEFAULT_JUDGE_MODEL,
    });
    console.log("\n✅ Results saved to database");
  }
}

async function selectVersion(versions: EvaluationVersionWithDetails[]) {
  const { selectedVersionId } = await prompt({
    type: "select",
    name: "selectedVersionId",
    message: "Select an evaluation to score:",
    choices: versions.map((v) => ({
      name: v.id,
      message: formatVersionChoice(v),
    })),
  });

  return versions.find((v) => v.id === selectedVersionId)!;
}

function formatVersionChoice(v: EvaluationVersionWithDetails) {
  const title = v.documentVersion.title.slice(0, 40);
  const agent = v.evaluation.agentId;
  const count = v.comments.length;
  return `${title}... | ${agent} | ${count} comments`;
}

async function askToSave(): Promise<boolean> {
  const { save } = await prompt({
    type: "confirm",
    name: "save",
    message: "Save results to database?",
    initial: false,
  });
  return save;
}
