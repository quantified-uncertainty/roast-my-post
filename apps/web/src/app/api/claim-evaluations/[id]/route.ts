import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@roast/db';
import { auth } from '@/infrastructure/auth/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    const evaluation = await prisma.claimEvaluation.findUnique({
      where: { id },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!evaluation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Check authorization - user must own the evaluation
    if (evaluation.userId !== session?.user?.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(evaluation);
  } catch (error) {
    console.error('Get claim evaluation error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch evaluation' },
      { status: 500 }
    );
  }
}
