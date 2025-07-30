import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth-helpers";
import { calculateJobStats, calculateSuccessRate } from "@/lib/batch-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  try {
    const userId = await authenticateRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const trackingId = resolvedParams.trackingId;

    // Find the experiment batch
    const batch = await prisma.agentEvalBatch.findFirst({
      where: {
        trackingId,
        isEphemeral: true,
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
                      select: {
                        title: true,
                        authors: true,
                      },
                    },
                  },
                },
                versions: {
                  orderBy: { version: "desc" },
                  take: 1,
                  select: {
                    grade: true,
                    summary: true,
                    createdAt: true,
                    comments: {
                      select: {
                        id: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        ephemeralDocuments: {
          select: {
            id: true,
            versions: {
              orderBy: { version: "desc" },
              take: 1,
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json(
        { error: "Experiment not found" },
        { status: 404 }
      );
    }

    // Check ownership
    if (batch.userId !== userId) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Calculate aggregate metrics
    const jobStats = calculateJobStats(batch.jobs);
    const completedJobs = batch.jobs.filter(j => j.status === "COMPLETED");
    const grades = completedJobs
      .map(j => j.evaluation.versions[0]?.grade)
      .filter((g): g is number => g !== null && g !== undefined);

    const aggregateMetrics = {
      averageGrade: grades.length > 0 
        ? grades.reduce((sum, g) => sum + g, 0) / grades.length 
        : null,
      totalCost: batch.jobs.reduce((sum, j) => {
        if (j.priceInDollars) {
          return sum + Math.round(parseFloat(j.priceInDollars.toString()) * 100);
        }
        return sum;
      }, 0),
      totalTime: batch.jobs.reduce((sum, j) => sum + (j.durationInSeconds || 0), 0),
      successRate: calculateSuccessRate(jobStats),
    };

    // Format results by document
    const results = batch.jobs.map(job => ({
      jobId: job.id,
      documentId: job.evaluation.document.id,
      documentTitle: job.evaluation.document.versions[0]?.title || "Untitled",
      status: job.status,
      evaluation: job.evaluation.versions[0] ? {
        createdAt: job.evaluation.versions[0].createdAt,
        grade: job.evaluation.versions[0].grade,
        summary: job.evaluation.versions[0].summary,
        highlightCount: job.evaluation.versions[0].comments.length,
      } : null,
      processingTime: job.durationInSeconds,
      cost: job.priceInDollars ? Math.round(parseFloat(job.priceInDollars.toString()) * 100) : null,
    }));

    // Format response
    const response = {
      id: batch.id,
      trackingId: batch.trackingId,
      name: batch.name,
      description: batch.description,
      createdAt: batch.createdAt,
      expiresAt: batch.expiresAt,
      isExpired: batch.expiresAt ? new Date() > batch.expiresAt : false,
      
      agent: {
        id: batch.agent.id,
        name: batch.agent.versions[0]?.name || "Unknown",
        isEphemeral: !!batch.agent.ephemeralBatchId,
        config: {
          primaryInstructions: batch.agent.versions[0]?.primaryInstructions,
          selfCritiqueInstructions: batch.agent.versions[0]?.selfCritiqueInstructions,
          providesGrades: batch.agent.versions[0]?.providesGrades,
        },
      },
      
      jobStats,
      
      aggregateMetrics,
      results,
      
      ephemeralDocuments: batch.ephemeralDocuments.map(doc => ({
        id: doc.id,
        title: doc.versions[0]?.title || "Untitled",
      })),
      
      actions: {
        canRerun: !batch.expiresAt || new Date() < batch.expiresAt,
        canExtend: !!batch.expiresAt && new Date() < batch.expiresAt,
        canPromote: batch.agent.ephemeralBatchId === batch.id,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error fetching experiment:', error);
    return NextResponse.json(
      { error: "Failed to fetch experiment" },
      { status: 500 }
    );
  }
}

// DELETE endpoint for manual cleanup
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  try {
    const userId = await authenticateRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const trackingId = resolvedParams.trackingId;

    // Find and verify ownership
    const batch = await prisma.agentEvalBatch.findFirst({
      where: {
        trackingId,
        userId,
        isEphemeral: true,
      },
      include: {
        jobs: {
          where: {
            status: "RUNNING",
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json(
        { error: "Experiment not found" },
        { status: 404 }
      );
    }

    // Check if any jobs are still running
    if (batch.jobs.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete experiment with running jobs" },
        { status: 400 }
      );
    }

    // Delete in a transaction to handle foreign key constraints properly
    await prisma.$transaction(async (tx) => {
      // First, delete all jobs in this batch
      await tx.job.deleteMany({
        where: { agentEvalBatchId: batch.id },
      });

      // For ephemeral batches, we need to clean up ephemeral data
      if (batch.isEphemeral) {
        // Check if the agent is ephemeral (belongs to this batch)
        const agent = await tx.agent.findUnique({
          where: { id: batch.agentId },
          select: { ephemeralBatchId: true }
        });
        
        // If the agent is ephemeral, delete ALL its evaluations
        if (agent?.ephemeralBatchId === batch.id) {
          const allAgentEvaluations = await tx.evaluation.findMany({
            where: { agentId: batch.agentId },
            select: { id: true }
          });
          
          const allEvaluationIds = allAgentEvaluations.map(e => e.id);
          
          // Delete evaluation comments for all agent evaluations
          if (allEvaluationIds.length > 0) {
            await tx.evaluationComment.deleteMany({
              where: { 
                evaluationVersion: { 
                  evaluationId: { in: allEvaluationIds } 
                }
              }
            });
          }
          
          // Delete evaluation versions for all agent evaluations
          if (allEvaluationIds.length > 0) {
            await tx.evaluationVersion.deleteMany({
              where: { evaluationId: { in: allEvaluationIds } }
            });
          }
          
          // Delete all evaluations by this ephemeral agent
          if (allEvaluationIds.length > 0) {
            await tx.evaluation.deleteMany({
              where: { id: { in: allEvaluationIds } }
            });
          }
        } else {
          // If the agent is not ephemeral, only delete evaluations on ephemeral documents
          const ephemeralDocuments = await tx.document.findMany({
            where: { ephemeralBatchId: batch.id },
            select: { id: true }
          });
          
          const ephemeralDocumentIds = ephemeralDocuments.map(doc => doc.id);
          
          if (ephemeralDocumentIds.length > 0) {
            const ephemeralEvaluations = await tx.evaluation.findMany({
              where: { 
                documentId: { in: ephemeralDocumentIds },
                agentId: batch.agentId
              },
              select: { id: true }
            });
            
            const ephemeralEvaluationIds = ephemeralEvaluations.map(e => e.id);
            
            // Delete evaluation comments for ephemeral evaluations
            if (ephemeralEvaluationIds.length > 0) {
              await tx.evaluationComment.deleteMany({
                where: { 
                  evaluationVersion: { 
                    evaluationId: { in: ephemeralEvaluationIds } 
                  }
                }
              });
            }
            
            // Delete evaluation versions for ephemeral evaluations
            if (ephemeralEvaluationIds.length > 0) {
              await tx.evaluationVersion.deleteMany({
                where: { evaluationId: { in: ephemeralEvaluationIds } }
              });
            }
            
            // Delete the ephemeral evaluations themselves
            if (ephemeralEvaluationIds.length > 0) {
              await tx.evaluation.deleteMany({
                where: { id: { in: ephemeralEvaluationIds } }
              });
            }
          }
        }
      }

      // Finally delete the batch (cascade will handle ephemeral agent and documents)
      await tx.agentEvalBatch.delete({
        where: { id: batch.id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting experiment:', error);
    return NextResponse.json(
      { error: "Failed to delete experiment" },
      { status: 500 }
    );
  }
}