import { NextRequest, NextResponse } from 'next/server';
import { prisma, generateId } from '@roast/db';
import { auth } from '@/infrastructure/auth/auth';
import { logger } from '@/infrastructure/logging/logger';
import { strictRateLimit, getClientIdentifier } from '@/infrastructure/http/rate-limiter';
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
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const { success } = await strictRateLimit.check(clientId);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

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
    logger.error('Save claim evaluation error', error);

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
    const limitParam = parseInt(searchParams.get('limit') || '50');
    const limit = Math.min(Math.max(1, isNaN(limitParam) ? 50 : limitParam), 100);
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'date';
    const order = searchParams.get('order') || 'desc';

    // Validate sortBy and order to prevent SQL injection
    const validSortBy = ['date', 'agreement'];
    const validOrder = ['asc', 'desc'];

    if (!validSortBy.includes(sortBy)) {
      return NextResponse.json({ error: 'Invalid sortBy parameter' }, { status: 400 });
    }
    if (!validOrder.includes(order)) {
      return NextResponse.json({ error: 'Invalid order parameter' }, { status: 400 });
    }

    // Build where clause
    type WhereClause = {
      userId: string;
      id?: { lt: string };
    };
    const where: WhereClause = { userId: session.user.id };

    // Build orderBy
    type OrderByClause = Array<{
      summaryMean?: 'asc' | 'desc';
      createdAt?: 'asc' | 'desc';
      id?: 'desc';
    }>;
    const orderBy: OrderByClause = [];
    if (sortBy === 'agreement' && !search) {
      orderBy.push({ summaryMean: order as 'asc' | 'desc' });
    }
    orderBy.push({ createdAt: order as 'asc' | 'desc' });
    orderBy.push({ id: 'desc' }); // Tie-breaker for consistent pagination

    type EvaluationResult = {
      id: string;
      claim: string;
      summaryMean: number | null;
      createdAt: Date;
      context: string | null;
      rawOutput: unknown;
    };
    let evaluations: EvaluationResult[];

    // Use raw SQL for full-text search, otherwise use Prisma
    if (search && search.trim()) {
      // Use plainto_tsquery for safe handling of user input (handles punctuation automatically)
      const searchQuery = search.trim();

      // Build SQL query parts
      const orderClause = sortBy === 'agreement'
        ? 'ORDER BY "summaryMean" ' + order.toUpperCase() + ', "createdAt" ' + order.toUpperCase() + ', id DESC'
        : 'ORDER BY "createdAt" ' + order.toUpperCase() + ', id DESC';

      // Note: Cursor pagination is not reliable for full-text search results since
      // the result set can change between queries. For search, we simply limit to 100 results.
      evaluations = await prisma.$queryRawUnsafe(`
        SELECT id, claim, "summaryMean", "createdAt", context, "rawOutput"
        FROM "ClaimEvaluation"
        WHERE "userId" = $1
        AND claim_search_text @@ plainto_tsquery('english', $2)
        ${orderClause}
        LIMIT $3
      `, session.user.id, searchQuery, limit + 1) as EvaluationResult[];
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
    logger.error('List claim evaluations error', error);
    return NextResponse.json(
      { error: 'Failed to list evaluations' },
      { status: 500 }
    );
  }
}
