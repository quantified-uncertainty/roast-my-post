import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@roast/db';
import { auth } from '@/infrastructure/auth/auth';
import { logger } from '@/infrastructure/logging/logger';
import { claimEvaluatorTool, analyzeClaimEvaluation } from '@roast/ai/server';
import type { ClaimEvaluatorOutput } from '@roast/ai/server';
import { logger as aiLogger } from '@roast/ai';
import { z } from 'zod';

const addRunsSchema = z.object({
  runs: z.array(z.object({
    model: z.string(),
    runs: z.number().int().min(1).max(10),
  })).min(1),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Claim evaluations are public - no authentication required for viewing
    const evaluation = await prisma.claimEvaluation.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        variations: {
          select: {
            id: true,
            claim: true,
            submitterNotes: true,
            summaryMean: true,
            createdAt: true,
            rawOutput: true,
            context: true,
            tags: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!evaluation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(evaluation);
  } catch (error) {
    logger.error('Get claim evaluation error', error);
    return NextResponse.json(
      { error: 'Failed to fetch evaluation' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch evaluation to check ownership and count variations
    const evaluation = await prisma.claimEvaluation.findUnique({
      where: { id },
      select: {
        userId: true,
        _count: {
          select: {
            variations: true,
          },
        },
      },
    });

    if (!evaluation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (evaluation.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete all variations first, then the parent evaluation
    // This is necessary because the schema has onDelete: SetNull instead of Cascade
    const variationCount = evaluation._count.variations;

    if (variationCount > 0) {
      await prisma.claimEvaluation.deleteMany({
        where: { variationOf: id },
      });
      logger.info(`Deleted ${variationCount} variations of claim evaluation ${id}`);
    }

    // Delete the evaluation itself
    await prisma.claimEvaluation.delete({
      where: { id },
    });

    logger.info(`Deleted claim evaluation ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Delete claim evaluation error', error);
    return NextResponse.json(
      { error: 'Failed to delete evaluation' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const data = addRunsSchema.parse(body);

    // Validate that total evaluations don't exceed limit
    const totalRequested = data.runs.reduce((sum, r) => sum + r.runs, 0);
    if (totalRequested > 20) {
      return NextResponse.json(
        { error: `Too many evaluations requested: ${totalRequested} (max 20)` },
        { status: 400 }
      );
    }

    // Fetch existing evaluation to check ownership and get parameters
    const existingEval = await prisma.claimEvaluation.findUnique({
      where: { id },
      select: {
        userId: true,
        claim: true,
        context: true,
        explanationLength: true,
        temperature: true,
        rawOutput: true,
      },
    });

    if (!existingEval) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (existingEval.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existingOutput = existingEval.rawOutput as unknown as ClaimEvaluatorOutput;

    // Run additional evaluations for each model
    logger.info(`Adding runs to claim evaluation ${id}: ${JSON.stringify(data.runs)}`);

    const allNewEvaluations: any[] = [];

    for (const modelRun of data.runs) {
      const result = await claimEvaluatorTool.execute(
        {
          claim: existingEval.claim,
          context: existingEval.context || undefined,
          models: [modelRun.model],
          runs: modelRun.runs,
          temperature: existingEval.temperature || undefined,
          explanationLength: existingEval.explanationLength || undefined,
        },
        {
          userId: session.user.id,
          logger: aiLogger,
        }
      ) as ClaimEvaluatorOutput;

      if (result.evaluations) {
        allNewEvaluations.push(...result.evaluations);
      }
    }

    // Merge the new evaluations with existing ones
    const mergedEvaluations = [
      ...(existingOutput.evaluations || []),
      ...allNewEvaluations,
    ];

    // Recalculate summary statistics
    const allAgreements = mergedEvaluations
      .filter((e) => !e.hasError && e.successfulResponse?.agreement != null)
      .map((e) => e.successfulResponse!.agreement);

    const newSummaryMean = allAgreements.length > 0
      ? allAgreements.reduce((a, b) => a + b, 0) / allAgreements.length
      : null;

    // Create updated output for analysis
    const updatedOutput: ClaimEvaluatorOutput = {
      ...existingOutput,
      evaluations: mergedEvaluations,
      summary: {
        mean: newSummaryMean,
        count: mergedEvaluations.length,
      },
    };

    // Generate analysis
    let analysisText: string | null = null;
    let analysisGeneratedAt: Date | null = null;

    try {
      logger.info(`Regenerating analysis for claim evaluation ${id}`);
      const analysis = await analyzeClaimEvaluation({
        claim: existingEval.claim,
        context: existingEval.context || undefined,
        rawOutput: updatedOutput,
      });
      analysisText = analysis.analysisText;
      analysisGeneratedAt = new Date();
      logger.info(`Generated analysis successfully`);
    } catch (error) {
      logger.error('Failed to generate analysis:', error);
      // Continue without analysis if it fails
    }

    // Update the evaluation with merged data
    const updatedEval = await prisma.claimEvaluation.update({
      where: { id },
      data: {
        rawOutput: updatedOutput as any,
        summaryMean: newSummaryMean,
        analysisText,
        analysisGeneratedAt,
      },
    });

    logger.info(`Added ${allNewEvaluations.length} evaluations to claim evaluation ${id}`);

    return NextResponse.json({
      id: updatedEval.id,
      addedEvaluations: allNewEvaluations.length,
      totalEvaluations: mergedEvaluations.length,
      newSummaryMean,
      analysisText,
    });
  } catch (error) {
    logger.error('Add runs to claim evaluation error', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add runs to evaluation' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Check if this is a regenerate analysis request
    if (body.action === 'regenerate-analysis') {
      // Fetch the evaluation and verify ownership
      const evaluation = await prisma.claimEvaluation.findUnique({
        where: { id },
        select: {
          userId: true,
          claim: true,
          context: true,
          rawOutput: true,
          variationOf: true,
        },
      });

      if (!evaluation) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      if (evaluation.userId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Gather all related evaluations (parent, siblings, children)
      const relatedEvaluations = await prisma.claimEvaluation.findMany({
        where: {
          OR: [
            { id }, // Current evaluation
            { variationOf: id }, // Children of current
            { id: evaluation.variationOf || undefined }, // Parent
            { variationOf: evaluation.variationOf || undefined }, // Siblings
          ],
        },
        select: {
          id: true,
          claim: true,
          context: true,
          rawOutput: true,
          summaryMean: true,
          variationOf: true,
        },
      });

      // Combine all evaluations from related claims
      const allEvaluations: any[] = [];
      for (const relatedEval of relatedEvaluations) {
        const output = relatedEval.rawOutput as any;
        if (output?.evaluations) {
          allEvaluations.push(...output.evaluations);
        }
      }

      // Calculate combined summary
      const successfulEvals = allEvaluations.filter(e => !e.hasError && e.successfulResponse?.agreement != null);
      const combinedMean = successfulEvals.length > 0
        ? successfulEvals.reduce((sum, e) => sum + e.successfulResponse.agreement, 0) / successfulEvals.length
        : null;

      const combinedOutput = {
        evaluations: allEvaluations,
        summary: {
          mean: combinedMean,
          count: allEvaluations.length,
        },
      };

      // Generate new analysis with all related data
      let analysisText: string | null = null;
      let analysisGeneratedAt: Date | null = null;

      try {
        logger.info(`Regenerating analysis for claim evaluation ${id} with ${relatedEvaluations.length} related evaluations`);

        // Build variations array for better analysis
        const variationsData = relatedEvaluations.map(relEval => ({
          claim: relEval.claim,
          context: relEval.context || undefined,
          evaluations: (relEval.rawOutput as any)?.evaluations || [],
          summaryMean: relEval.summaryMean,
        }));

        const analysis = await analyzeClaimEvaluation({
          claim: evaluation.claim,
          context: evaluation.context || undefined,
          rawOutput: combinedOutput,
          variations: variationsData.length > 1 ? variationsData : undefined,
        });
        analysisText = analysis.analysisText;
        analysisGeneratedAt = new Date();
        logger.info(`Generated analysis successfully`);
      } catch (error) {
        logger.error('Failed to generate analysis:', error);
        return NextResponse.json(
          { error: 'Failed to generate analysis' },
          { status: 500 }
        );
      }

      // Update the evaluation with new analysis
      await prisma.claimEvaluation.update({
        where: { id },
        data: {
          analysisText,
          analysisGeneratedAt,
        },
      });

      logger.info(`Updated analysis for claim evaluation ${id}`);

      return NextResponse.json({
        analysisText,
        analysisGeneratedAt,
        relatedEvaluationsCount: relatedEvaluations.length,
        totalEvaluationsAnalyzed: allEvaluations.length,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    logger.error('POST claim evaluation error', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
