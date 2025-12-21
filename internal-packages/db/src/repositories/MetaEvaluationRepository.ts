/**
 * Meta-Evaluation Repository
 *
 * Data access layer for meta-evaluations (scoring and ranking agent outputs).
 */

import { prisma as defaultPrisma } from "../client";

// ============================================================================
// Series Types (for meta-eval CLI)
// ============================================================================

export type SeriesSummary = {
  id: string;
  name: string | null;
  documentTitle: string;
  documentId: string;
  agentNames: string[];
  runCount: number;
  firstRunAt: Date;
  lastRunAt: Date;
};

export type SeriesRun = {
  jobId: string;
  agentId: string;
  agentName: string;
  createdAt: Date;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  evaluationVersionId: string | null;
  scoring: { overallScore: number; scoredAt: Date } | null;
};

export type SeriesDetail = {
  id: string;
  name: string | null;
  description: string | null;
  documentId: string;
  documentTitle: string;
  documentContent: string;
  runs: SeriesRun[];
};

export type AgentChoice = {
  id: string;
  name: string;
  version: number;
};

export type DocumentChoice = {
  id: string;
  title: string;
  createdAt: Date;
};

export type EvaluationVersionWithComments = {
  id: string;
  comments: Array<{
    header: string | null;
    level: string | null;
    description: string;
    highlight: { quotedText: string };
  }>;
};

// ============================================================================
// Legacy Types (for scoring/ranking)
// ============================================================================

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

export type DimensionScore = {
  name: string;
  score: number;
  explanation?: string;
};

export type SaveScoringInput = {
  evaluationVersionId: string;
  overallScore: number;
  dimensions: DimensionScore[];
  reasoning: string;
  judgeModel: string;
};

export type SaveRankingInput = {
  evaluationVersionId: string;
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
        evaluationVersionId: input.evaluationVersionId,
        type: "scoring",
        overallScore: input.overallScore,
        reasoning: input.reasoning,
        judgeModel: input.judgeModel,
        dimensionScores: {
          create: input.dimensions.map((d) => ({
            name: d.name,
            score: d.score,
            explanation: d.explanation,
          })),
        },
      },
      include: {
        dimensionScores: true,
      },
    });
  }

  async getScoringResult(evaluationVersionId: string) {
    return this.prisma.metaEvaluation.findFirst({
      where: {
        evaluationVersionId,
        type: "scoring",
      },
      include: {
        dimensionScores: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async saveRankingResult(input: SaveRankingInput) {
    return this.prisma.metaEvaluation.create({
      data: {
        evaluationVersionId: input.evaluationVersionId,
        type: "ranking",
        rankingSessionId: input.rankingSessionId,
        rank: input.rank,
        relativeScore: input.relativeScore,
        reasoning: input.reasoning,
        judgeModel: input.judgeModel,
      },
    });
  }

  /**
   * Get all ranking sessions for evaluation versions in a series.
   */
  async getRankingSessionsForSeries(seriesId: string) {
    // First get all evaluation version IDs for this series
    const series = await this.prisma.series.findUnique({
      where: { id: seriesId },
      include: {
        runs: {
          include: {
            job: { select: { evaluationVersionId: true } },
          },
        },
      },
    });

    if (!series) return [];

    const evalVersionIds = series.runs
      .map((r) => r.job.evaluationVersionId)
      .filter((id): id is string => id !== null);

    if (evalVersionIds.length === 0) return [];

    // Get all ranking records for these versions, grouped by session
    const rankings = await this.prisma.metaEvaluation.findMany({
      where: {
        evaluationVersionId: { in: evalVersionIds },
        type: "ranking",
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by session ID
    const sessionMap = new Map<string, typeof rankings>();
    for (const r of rankings) {
      if (!r.rankingSessionId) continue;
      const existing = sessionMap.get(r.rankingSessionId) || [];
      existing.push(r);
      sessionMap.set(r.rankingSessionId, existing);
    }

    // Convert to array of sessions
    return Array.from(sessionMap.entries()).map(([sessionId, records]) => ({
      sessionId,
      createdAt: records[0].createdAt,
      reasoning: records[0].reasoning || "",
      rankings: records
        .sort((a, b) => (a.rank || 0) - (b.rank || 0))
        .map((r) => ({
          evaluationVersionId: r.evaluationVersionId,
          rank: r.rank || 0,
          relativeScore: r.relativeScore || 0,
        })),
    }));
  }

  // ==========================================================================
  // Series Methods (for meta-eval CLI)
  // ==========================================================================

  /**
   * Get all evaluation series.
   * Returns series sorted by most recent activity.
   */
  async getSeries(): Promise<SeriesSummary[]> {
    const seriesRecords = await this.prisma.series.findMany({
      include: {
        document: {
          include: {
            versions: {
              orderBy: { version: "desc" },
              take: 1,
            },
          },
        },
        runs: {
          include: {
            job: {
              include: {
                evaluation: {
                  include: {
                    agent: {
                      include: {
                        versions: {
                          orderBy: { version: "desc" },
                          take: 1,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return seriesRecords.map((s) => {
      const agentNames = [
        ...new Set(
          s.runs.map(
            (r) => r.job.evaluation.agent.versions[0]?.name || r.job.evaluation.agentId
          )
        ),
      ];

      return {
        id: s.id,
        name: s.name,
        documentTitle: s.document.versions[0]?.title || "Unknown document",
        documentId: s.documentId,
        agentNames,
        runCount: s.runs.length,
        firstRunAt: s.runs[0]?.createdAt || s.createdAt,
        lastRunAt: s.runs[s.runs.length - 1]?.createdAt || s.createdAt,
      };
    });
  }

  /**
   * Create a new series for a document.
   */
  async createSeries(input: {
    documentId: string;
    name?: string;
    description?: string;
  }) {
    return this.prisma.series.create({
      data: {
        documentId: input.documentId,
        name: input.name,
        description: input.description,
      },
    });
  }

  /**
   * Add a job to a series.
   */
  async addJobToSeries(seriesId: string, jobId: string) {
    return this.prisma.seriesRun.create({
      data: {
        seriesId,
        jobId,
      },
    });
  }

  /**
   * Get detailed info about a specific series, including all runs.
   */
  async getSeriesDetail(seriesId: string): Promise<SeriesDetail | null> {
    const series = await this.prisma.series.findUnique({
      where: { id: seriesId },
      include: {
        document: {
          include: {
            versions: {
              orderBy: { version: "desc" },
              take: 1,
            },
          },
        },
        runs: {
          include: {
            job: {
              include: {
                evaluation: {
                  include: {
                    agent: {
                      include: {
                        versions: {
                          orderBy: { version: "desc" },
                          take: 1,
                        },
                      },
                    },
                  },
                },
                evaluationVersion: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!series) {
      return null;
    }

    const docVersion = series.document.versions[0];
    if (!docVersion) {
      return null;
    }

    // Get scoring info for all evaluation versions in this series
    const evalVersionIds = series.runs
      .map((r) => r.job.evaluationVersionId)
      .filter((id): id is string => id !== null);

    const scorings = evalVersionIds.length > 0
      ? await this.prisma.metaEvaluation.findMany({
          where: {
            evaluationVersionId: { in: evalVersionIds },
            type: "scoring",
          },
          select: {
            evaluationVersionId: true,
            overallScore: true,
            createdAt: true,
          },
        })
      : [];

    const scoringMap = new Map(
      scorings.map((s) => [s.evaluationVersionId, { overallScore: s.overallScore!, scoredAt: s.createdAt }])
    );

    // Build runs list from SeriesRun -> Job
    const runs: SeriesRun[] = series.runs.map((run) => ({
      jobId: run.jobId,
      agentId: run.job.evaluation.agentId,
      agentName: run.job.evaluation.agent.versions[0]?.name || run.job.evaluation.agentId,
      createdAt: run.createdAt,
      status: run.job.status as SeriesRun["status"],
      evaluationVersionId: run.job.evaluationVersionId,
      scoring: run.job.evaluationVersionId ? scoringMap.get(run.job.evaluationVersionId) || null : null,
    }));

    return {
      id: series.id,
      name: series.name,
      description: series.description,
      documentId: series.documentId,
      documentTitle: docVersion.title,
      documentContent: docVersion.content,
      runs,
    };
  }

  /**
   * Get available agents for a user (own agents + system-managed).
   */
  async getAvailableAgents(userId: string): Promise<AgentChoice[]> {
    const agents = await this.prisma.agent.findMany({
      where: {
        OR: [{ submittedById: userId }, { isSystemManaged: true }],
        isDeprecated: false,
        ephemeralBatchId: null,
      },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return agents
      .filter((a) => a.versions.length > 0)
      .map((a) => ({
        id: a.id,
        name: a.versions[0].name,
        version: a.versions[0].version,
      }));
  }

  /**
   * Get recent documents (non-ephemeral).
   */
  async getRecentDocuments(): Promise<DocumentChoice[]> {
    const documents = await this.prisma.document.findMany({
      where: {
        ephemeralBatchId: null,
      },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
          select: { title: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return documents
      .filter((d) => d.versions.length > 0)
      .map((d) => ({
        id: d.id,
        title: d.versions[0].title,
        createdAt: d.createdAt,
      }));
  }

  /**
   * Get evaluation version with comments for comparison.
   */
  async getEvaluationVersionWithComments(
    id: string
  ): Promise<EvaluationVersionWithComments | null> {
    const result = await this.prisma.evaluationVersion.findUnique({
      where: { id },
      include: {
        comments: {
          include: { highlight: true },
        },
      },
    });

    if (!result) return null;

    // highlight is a required relation, so it's always present
    return {
      id: result.id,
      comments: result.comments.map((c) => ({
        header: c.header,
        level: c.level,
        description: c.description,
        highlight: { quotedText: c.highlight.quotedText },
      })),
    };
  }

  /**
   * Get user by ID.
   */
  async getUserById(userId: string): Promise<{ email: string | null } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
  }

  /**
   * Delete failed runs from a series.
   * Returns the number of runs deleted.
   */
  async clearFailedRuns(seriesId: string): Promise<number> {
    // Find SeriesRun entries where the job has FAILED status
    const failedRuns = await this.prisma.seriesRun.findMany({
      where: {
        seriesId,
        job: {
          status: "FAILED",
        },
      },
      select: { id: true },
    });

    if (failedRuns.length === 0) {
      return 0;
    }

    // Delete the SeriesRun entries (not the jobs themselves)
    await this.prisma.seriesRun.deleteMany({
      where: {
        id: { in: failedRuns.map((r) => r.id) },
      },
    });

    return failedRuns.length;
  }

  /**
   * Get unique agents used in a series (for "Run Again" functionality).
   */
  async getSeriesAgents(seriesId: string): Promise<AgentChoice[]> {
    const series = await this.prisma.series.findUnique({
      where: { id: seriesId },
      include: {
        runs: {
          include: {
            job: {
              include: {
                evaluation: {
                  include: {
                    agent: {
                      include: {
                        versions: {
                          orderBy: { version: "desc" },
                          take: 1,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!series) return [];

    // Get unique agents by ID
    const agentMap = new Map<string, AgentChoice>();
    for (const run of series.runs) {
      const agent = run.job.evaluation.agent;
      if (!agentMap.has(agent.id) && agent.versions.length > 0) {
        agentMap.set(agent.id, {
          id: agent.id,
          name: agent.versions[0].name,
          version: agent.versions[0].version,
        });
      }
    }

    return Array.from(agentMap.values());
  }

  /**
   * Check database connectivity.
   */
  async checkConnection(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get meta-evaluation count.
   */
  async getMetaEvaluationCount(): Promise<number> {
    return this.prisma.metaEvaluation.count();
  }

  /**
   * Disconnect from database.
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// Default instance for convenience
export const metaEvaluationRepository = new MetaEvaluationRepository();
