import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@roast/db';
import { auth } from '@/infrastructure/auth/auth';
import { logger } from '@/infrastructure/logging/logger';
import { analyzeClaimEvaluation } from '@roast/ai/server';

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
    let analysisText: string;
    const analysisGeneratedAt = new Date();

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
      logger.info(`Generated analysis successfully`);
    } catch (error) {
      logger.error('Failed to generate analysis:', error);
      // Fail the request if analysis generation fails - this is the purpose of this endpoint
      return NextResponse.json(
        { error: 'Failed to generate analysis', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }

    // Update the evaluation with new analysis in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.claimEvaluation.update({
        where: { id },
        data: {
          analysisText,
          analysisGeneratedAt,
        },
      });
    });

    logger.info(`Updated analysis for claim evaluation ${id}`);

    return NextResponse.json({
      analysisText,
      analysisGeneratedAt,
      relatedEvaluationsCount: relatedEvaluations.length,
      totalEvaluationsAnalyzed: allEvaluations.length,
    });
  } catch (error) {
    logger.error('POST regenerate analysis error', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
