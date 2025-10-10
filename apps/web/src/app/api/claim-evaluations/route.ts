import { NextRequest, NextResponse } from 'next/server';
import { prisma, generateId } from '@roast/db';
import { auth } from '@/infrastructure/auth/auth';
import { z } from 'zod';

const saveSchema = z.object({
  claim: z.string().min(1),
  context: z.string().optional(),
  summaryMean: z.number().optional(),
  rawOutput: z.any(), // Full ClaimEvaluatorOutput
  explanationLength: z.number().optional(),
  temperature: z.number().optional(),
  prompt: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = saveSchema.parse(body);

    const evaluation = await prisma.claimEvaluation.create({
      data: {
        id: generateId(16), // Use shorter IDs like documents
        userId: session.user.id,
        claim: data.claim,
        context: data.context,
        summaryMean: data.summaryMean,
        rawOutput: data.rawOutput,
        explanationLength: data.explanationLength,
        temperature: data.temperature,
        prompt: data.prompt,
      },
    });

    return NextResponse.json({ id: evaluation.id });
  } catch (error) {
    console.error('Save claim evaluation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to save evaluation' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'date'; // 'date' | 'agreement'
    const order = searchParams.get('order') || 'desc'; // 'asc' | 'desc'

    // Build where clause
    const where: any = { userId: session.user.id };

    // Build orderBy
    const orderBy: any = [];
    if (sortBy === 'agreement' && !search) {
      orderBy.push({ summaryMean: order as 'asc' | 'desc' });
    }
    orderBy.push({ createdAt: order as 'asc' | 'desc' });
    orderBy.push({ id: 'desc' }); // Tie-breaker for consistent pagination

    let evaluations;

    // Use raw SQL for full-text search, otherwise use Prisma
    if (search && search.trim()) {
      const searchQuery = search.trim().split(/\s+/).join(' & ');

      // Build SQL query parts
      const orderClause = sortBy === 'agreement'
        ? 'ORDER BY "summaryMean" ' + order.toUpperCase() + ', "createdAt" ' + order.toUpperCase() + ', id DESC'
        : 'ORDER BY "createdAt" ' + order.toUpperCase() + ', id DESC';

      if (cursor) {
        evaluations = await prisma.$queryRawUnsafe(`
          SELECT id, claim, "summaryMean", "createdAt", context, "rawOutput"
          FROM "ClaimEvaluation"
          WHERE "userId" = $1
          AND claim_search_text @@ to_tsquery('english', $2)
          AND id < $3
          ${orderClause}
          LIMIT $4
        `, session.user.id, searchQuery, cursor, limit + 1) as any[];
      } else {
        evaluations = await prisma.$queryRawUnsafe(`
          SELECT id, claim, "summaryMean", "createdAt", context, "rawOutput"
          FROM "ClaimEvaluation"
          WHERE "userId" = $1
          AND claim_search_text @@ to_tsquery('english', $2)
          ${orderClause}
          LIMIT $3
        `, session.user.id, searchQuery, limit + 1) as any[];
      }
    } else {
      // Add cursor pagination for non-search queries
      if (cursor) {
        where.id = { lt: cursor };
      }

      evaluations = await prisma.claimEvaluation.findMany({
        where,
        orderBy,
        take: limit + 1,
        select: {
          id: true,
          claim: true,
          summaryMean: true,
          createdAt: true,
          context: true,
          rawOutput: true,
        },
      });
    }

    // Check if there are more results
    const hasMore = evaluations.length > limit;
    const results = hasMore ? evaluations.slice(0, -1) : evaluations;
    const nextCursor = hasMore ? results[results.length - 1]?.id : null;

    return NextResponse.json({
      data: results,
      nextCursor,
      hasMore,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    console.error('List claim evaluations error:', error);
    return NextResponse.json(
      { error: 'Failed to list evaluations' },
      { status: 500 }
    );
  }
}
