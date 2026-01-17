import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/infrastructure/logging/logger";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { isAdmin } from "@/infrastructure/auth/auth";
import { prisma, metaEvaluationRepository } from "@roast/db";

interface CommentData {
  id: string;
  quotedText: string;
  header: string | null;
  description: string;
  importance: number | null;
  startOffset: number;
  endOffset: number;
}

interface EvaluationSnapshot {
  evaluationVersionId: string;
  documentId: string;
  comments: CommentData[];
  pipelineTelemetry?: {
    filteredItems?: unknown[];
    extractionPhase?: unknown;
    finalCounts?: {
      issuesExtracted?: number;
      issuesAfterDedup?: number;
      issuesAfterFiltering?: number;
      commentsGenerated?: number;
      commentsKept?: number;
    };
  };
}

/**
 * Finalize a validation run:
 * 1. Get the new evaluation versions from completed jobs
 * 2. Compare with baseline
 * 3. Save comparison results
 * 4. Update run status
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await authenticateRequest(request);
  if (!userId) return commonErrors.unauthorized();

  const adminCheck = await isAdmin();
  if (!adminCheck) return commonErrors.forbidden();

  const { id: runId } = await params;

  try {
    // Get the run
    const run = await prisma.validationRun.findUnique({
      where: { id: runId },
      include: {
        baseline: {
          select: { id: true, agentId: true },
        },
      },
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    if (run.status === "completed") {
      return NextResponse.json({ error: "Run already finalized" }, { status: 400 });
    }

    // Get baseline snapshots
    const baselineSnapshots = await metaEvaluationRepository.getBaselineSnapshots(run.baselineId);

    if (baselineSnapshots.length === 0) {
      await metaEvaluationRepository.updateValidationRunStatus(runId, "failed", "Baseline has no snapshots");
      return NextResponse.json({ error: "Baseline has no snapshots" }, { status: 400 });
    }

    // Get the document IDs
    const documentIds = [...new Set(baselineSnapshots.map((s) => s.documentId))];

    // Get the latest evaluation versions for these documents
    const newSnapshots = await metaEvaluationRepository.getEvaluationSnapshots(
      documentIds,
      run.baseline.agentId
    );

    // Compare and save results
    let unchangedCount = 0;
    let changedCount = 0;

    for (const baselineSnapshot of baselineSnapshots) {
      const newSnapshot = newSnapshots.find(
        (s) => s && s.documentId === baselineSnapshot.documentId
      );

      if (newSnapshot) {
        // Compare comments
        const comparison = compareSnapshots(
          toEvaluationSnapshot(baselineSnapshot),
          toEvaluationSnapshot(newSnapshot)
        );

        // Get baseline snapshot record ID
        const baselineSnapshotRecord = await metaEvaluationRepository.getBaselineSnapshotByDocument(
          run.baselineId,
          baselineSnapshot.documentId
        );

        if (baselineSnapshotRecord) {
          const status =
            comparison.newComments.length === 0 && comparison.lostComments.length === 0
              ? "unchanged"
              : "changed";

          if (status === "unchanged") unchangedCount++;
          else changedCount++;

          // Get pipeline telemetry from new snapshot
          const telemetry = newSnapshot.pipelineTelemetry as EvaluationSnapshot["pipelineTelemetry"];
          const finalCounts = telemetry?.finalCounts;

          // Get full telemetry record for stages
          const fullTelemetry = newSnapshot.pipelineTelemetry as {
            stages?: Array<{
              stageName: string;
              durationMs: number;
              inputCount: number;
              outputCount: number;
              model?: string;
              costUsd?: number;
            }>;
            totalDurationMs?: number;
          } & EvaluationSnapshot["pipelineTelemetry"];

          await metaEvaluationRepository.addValidationRunSnapshot({
            runId,
            baselineSnapshotId: baselineSnapshotRecord.id,
            newEvaluationId: newSnapshot.evaluationVersionId,
            status: status as "unchanged" | "changed",
            keptCount: comparison.matchedComments.length,
            newCount: comparison.newComments.length,
            lostCount: comparison.lostComments.length,
            comparisonData: {
              matchedComments: comparison.matchedComments,
              newComments: comparison.newComments,
              lostComments: comparison.lostComments,
              filteredItems: telemetry?.filteredItems,
              extractionPhase: telemetry?.extractionPhase,
              stages: fullTelemetry?.stages,
              totalDurationMs: fullTelemetry?.totalDurationMs,
              pipelineCounts: finalCounts
                ? {
                    issuesAfterDedup: finalCounts.issuesAfterDedup ?? 0,
                    issuesAfterFiltering: finalCounts.issuesAfterFiltering ?? 0,
                    commentsGenerated: finalCounts.commentsGenerated ?? 0,
                    commentsKept: finalCounts.commentsKept ?? 0,
                  }
                : undefined,
            },
          });
        }
      }
    }

    // Update run status
    const summary = `${unchangedCount} unchanged, ${changedCount} changed`;
    await metaEvaluationRepository.updateValidationRunStatus(runId, "completed", summary);

    logger.info("Validation run finalized", {
      runId,
      unchangedCount,
      changedCount,
    });

    return NextResponse.json({
      success: true,
      summary,
      unchangedCount,
      changedCount,
    });
  } catch (error) {
    logger.error("Error finalizing validation run:", error);

    // Mark run as failed
    try {
      await metaEvaluationRepository.updateValidationRunStatus(
        runId,
        "failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } catch {
      // Ignore secondary error
    }

    return commonErrors.serverError("Failed to finalize validation run");
  }
}

// Helper to convert snapshot format
function toEvaluationSnapshot(snapshot: {
  evaluationVersionId: string;
  documentId: string;
  comments: CommentData[];
  pipelineTelemetry?: unknown;
}): EvaluationSnapshot {
  return {
    evaluationVersionId: snapshot.evaluationVersionId,
    documentId: snapshot.documentId,
    comments: snapshot.comments,
    pipelineTelemetry: snapshot.pipelineTelemetry as EvaluationSnapshot["pipelineTelemetry"],
  };
}

// Simple comment comparison
function compareSnapshots(baseline: EvaluationSnapshot, current: EvaluationSnapshot) {
  const matchedComments: Array<{
    baselineComment: CommentData;
    currentComment: CommentData;
    matchConfidence: number;
    status: string;
  }> = [];
  const newComments: CommentData[] = [];
  const lostComments: CommentData[] = [];

  const usedCurrentIndices = new Set<number>();

  // Find matches based on quoted text similarity
  for (const baselineComment of baseline.comments) {
    let bestMatch: { index: number; score: number } | null = null;

    for (let i = 0; i < current.comments.length; i++) {
      if (usedCurrentIndices.has(i)) continue;

      const currentComment = current.comments[i];
      const score = calculateSimilarity(baselineComment.quotedText, currentComment.quotedText);

      if (score > 0.6 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { index: i, score };
      }
    }

    if (bestMatch) {
      usedCurrentIndices.add(bestMatch.index);
      matchedComments.push({
        baselineComment,
        currentComment: current.comments[bestMatch.index],
        matchConfidence: bestMatch.score,
        status: "matched",
      });
    } else {
      lostComments.push(baselineComment);
    }
  }

  // Find new comments (not matched to any baseline)
  for (let i = 0; i < current.comments.length; i++) {
    if (!usedCurrentIndices.has(i)) {
      newComments.push(current.comments[i]);
    }
  }

  return { matchedComments, newComments, lostComments };
}

// Simple text similarity (Jaccard on words)
function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));

  const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;
}
