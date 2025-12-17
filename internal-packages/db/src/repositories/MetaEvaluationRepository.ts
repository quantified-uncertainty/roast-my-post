/**
 * Meta-Evaluation Repository
 *
 * Data access layer for meta-evaluations (scoring and ranking agent outputs).
 */

import { prisma as defaultPrisma } from "../client";

export type EvaluationVersionWithDetails = {
  id: string;
  evaluationId: string;
  documentVersionId: string;
  documentVersion: {
    title: string;
    content: string;
  };
  comments: Array<{
    header: string | null;
    level: string | null;
    description: string;
    highlight: { quotedText: string };
  }>;
  evaluation: {
    id: string;
    agentId: string;
  };
};

export type BatchWithCount = {
  id: string;
  trackingId: string | null;
  createdAt: Date;
  agent: { id: string };
  _count: { jobs: number };
};

export type SaveScoringInput = {
  evaluationId: string;
  overallScore: number;
  dimensions: Record<string, { score: number; explanation: string }>;
  reasoning: string;
  judgeModel: string;
};

export type SaveRankingInput = {
  evaluationId: string;
  rankingSessionId: string;
  rank: number;
  relativeScore: number;
  reasoning: string;
  judgeModel: string;
};

export class MetaEvaluationRepository {
  private prisma: typeof defaultPrisma;

  constructor(prismaClient?: typeof defaultPrisma) {
    this.prisma = prismaClient || defaultPrisma;
  }

  async getRecentEvaluationVersions(
    limit = 20
  ): Promise<EvaluationVersionWithDetails[]> {
    return this.prisma.evaluationVersion.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        documentVersion: { select: { title: true, content: true } },
        comments: { include: { highlight: true } },
        evaluation: { select: { id: true, agentId: true } },
      },
    });
  }

  async getEvaluationVersionById(
    versionId: string
  ): Promise<EvaluationVersionWithDetails | null> {
    return this.prisma.evaluationVersion.findUnique({
      where: { id: versionId },
      include: {
        documentVersion: { select: { title: true, content: true } },
        comments: { include: { highlight: true } },
        evaluation: { select: { id: true, agentId: true } },
      },
    });
  }

  async getVersionsByBatchTrackingId(
    trackingId: string
  ): Promise<EvaluationVersionWithDetails[]> {
    const batch = await this.prisma.agentEvalBatch.findFirst({
      where: { trackingId },
      include: {
        jobs: {
          include: {
            evaluationVersion: {
              include: {
                documentVersion: { select: { title: true, content: true } },
                comments: { include: { highlight: true } },
                evaluation: { select: { id: true, agentId: true } },
              },
            },
          },
        },
      },
    });

    if (!batch) return [];

    return batch.jobs
      .filter((j) => j.evaluationVersion)
      .map((j) => j.evaluationVersion as EvaluationVersionWithDetails);
  }

  async getRecentBatches(limit = 10): Promise<BatchWithCount[]> {
    return this.prisma.agentEvalBatch.findMany({
      where: { trackingId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        agent: { select: { id: true } },
        _count: { select: { jobs: true } },
      },
    });
  }

  async saveScoringResult(input: SaveScoringInput) {
    return this.prisma.metaEvaluation.create({
      data: {
        evaluationId: input.evaluationId,
        type: "scoring",
        overallScore: input.overallScore,
        dimensions: input.dimensions,
        reasoning: input.reasoning,
        judgeModel: input.judgeModel,
      },
    });
  }

  async saveRankingResult(input: SaveRankingInput) {
    return this.prisma.metaEvaluation.create({
      data: {
        evaluationId: input.evaluationId,
        type: "ranking",
        rankingSessionId: input.rankingSessionId,
        rank: input.rank,
        relativeScore: input.relativeScore,
        reasoning: input.reasoning,
        judgeModel: input.judgeModel,
      },
    });
  }
}

// Default instance for convenience
export const metaEvaluationRepository = new MetaEvaluationRepository();
