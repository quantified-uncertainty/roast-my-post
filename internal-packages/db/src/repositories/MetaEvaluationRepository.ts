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
        firstRunAt: s.runs[0]?.createdAt ?? s.createdAt,
        lastRunAt: s.runs[s.runs.length - 1]?.createdAt ?? s.createdAt,
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
   * Delete a series and all its runs.
   */
  async deleteSeries(seriesId: string): Promise<void> {
    // Delete runs first (foreign key constraint)
    await this.prisma.seriesRun.deleteMany({
      where: { seriesId },
    });
    // Delete the series
    await this.prisma.series.delete({
      where: { id: seriesId },
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
    // Note: TypeScript believes docVersion is always defined due to Prisma types

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
      scorings
        .filter((s) => s.overallScore !== null)
        .map((s) => [s.evaluationVersionId, { overallScore: s.overallScore!, scoredAt: s.createdAt }])
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
   * @param titleFilter - Optional case-insensitive title search filter
   */
  async getRecentDocuments(titleFilter?: string): Promise<DocumentChoice[]> {
    const documents = await this.prisma.document.findMany({
      where: {
        ephemeralBatchId: null,
        // Filter by title in versions if filter provided
        ...(titleFilter && {
          versions: {
            some: {
              title: {
                contains: titleFilter,
                mode: "insensitive" as const,
              },
            },
          },
        }),
      },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
          select: { title: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
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

  // ==========================================================================
  // Validation Framework Methods
  // ==========================================================================

  /**
   * Get documents suitable for validation testing.
   * Returns documents that have been evaluated by the specified agent.
   */
  async getValidationCorpusDocuments(
    agentId: string,
    options: { limit?: number; minContentLength?: number; filter?: string } = {}
  ): Promise<
    Array<{
      documentId: string;
      title: string;
      contentLength: number;
      lastEvaluatedAt: Date | null;
      evaluationCount: number;
    }>
  > {
    const { limit = 50, minContentLength = 100, filter } = options;

    // Get documents that have evaluations from this agent
    const evaluations = await this.prisma.evaluation.findMany({
      where: {
        agentId,
        ...(filter && {
          document: {
            versions: { some: { title: { contains: filter, mode: "insensitive" } } },
          },
        }),
      },
      include: {
        document: {
          include: {
            versions: {
              orderBy: { version: "desc" },
              take: 1,
              select: { title: true, content: true },
            },
          },
        },
        versions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
        _count: { select: { versions: true } },
      },
      take: limit,
    });

    return evaluations
      .filter((e) => {
        const content = e.document.versions[0]?.content;
        return content && content.length >= minContentLength;
      })
      .map((e) => ({
        documentId: e.documentId,
        title: e.document.versions[0]?.title || "Unknown",
        contentLength: e.document.versions[0]?.content.length || 0,
        lastEvaluatedAt: e.versions[0]?.createdAt ?? null,
        evaluationCount: e._count.versions,
      }));
  }

  /**
   * Get evaluation snapshots for a set of documents from a specific agent.
   * Returns the most recent EvaluationVersion for each document.
   */
  async getEvaluationSnapshots(
    documentIds: string[],
    agentId: string
  ): Promise<
    Array<{
      evaluationVersionId: string;
      agentId: string;
      agentName: string;
      createdAt: Date;
      documentId: string;
      documentTitle: string;
      grade: number | null;
      pipelineTelemetry: unknown;
      comments: Array<{
        id: string;
        quotedText: string;
        header: string | null;
        description: string;
        importance: number | null;
        startOffset: number;
        endOffset: number;
      }>;
    }>
  > {
    // Get the most recent evaluation version for each document
    const evaluations = await this.prisma.evaluation.findMany({
      where: {
        agentId,
        documentId: { in: documentIds },
      },
      include: {
        agent: {
          include: {
            versions: {
              orderBy: { version: "desc" },
              take: 1,
              select: { name: true },
            },
          },
        },
        document: {
          include: {
            versions: {
              orderBy: { version: "desc" },
              take: 1,
              select: { title: true },
            },
          },
        },
        versions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            comments: {
              include: {
                highlight: true,
              },
            },
          },
        },
      },
    });

    return evaluations
      .filter((e) => e.versions.length > 0)
      .map((e) => {
        const version = e.versions[0];
        return {
          evaluationVersionId: version.id,
          agentId: e.agentId,
          agentName: e.agent.versions[0]?.name || e.agentId,
          createdAt: version.createdAt,
          documentId: e.documentId,
          documentTitle: e.document.versions[0]?.title || "Unknown",
          grade: version.grade,
          pipelineTelemetry: version.pipelineTelemetry,
          comments: version.comments.map((c) => ({
            id: c.id,
            quotedText: c.highlight.quotedText,
            header: c.header,
            description: c.description,
            importance: c.importance,
            startOffset: c.highlight.startOffset,
            endOffset: c.highlight.endOffset,
          })),
        };
      });
  }

  /**
   * Get a specific evaluation version by ID with full details for comparison.
   */
  async getEvaluationSnapshotById(evaluationVersionId: string): Promise<{
    evaluationVersionId: string;
    agentId: string;
    agentName: string;
    createdAt: Date;
    documentId: string;
    documentTitle: string;
    grade: number | null;
    pipelineTelemetry: unknown;
    comments: Array<{
      id: string;
      quotedText: string;
      header: string | null;
      description: string;
      importance: number | null;
      startOffset: number;
      endOffset: number;
    }>;
  } | null> {
    const version = await this.prisma.evaluationVersion.findUnique({
      where: { id: evaluationVersionId },
      include: {
        evaluation: {
          include: {
            agent: {
              include: {
                versions: {
                  orderBy: { version: "desc" },
                  take: 1,
                  select: { name: true },
                },
              },
            },
            document: {
              include: {
                versions: {
                  orderBy: { version: "desc" },
                  take: 1,
                  select: { title: true },
                },
              },
            },
          },
        },
        comments: {
          include: {
            highlight: true,
          },
        },
      },
    });

    if (!version) return null;

    return {
      evaluationVersionId: version.id,
      agentId: version.agentId,
      agentName: version.evaluation.agent.versions[0]?.name || version.agentId,
      createdAt: version.createdAt,
      documentId: version.evaluation.documentId,
      documentTitle: version.evaluation.document.versions[0]?.title || "Unknown",
      grade: version.grade,
      pipelineTelemetry: version.pipelineTelemetry,
      comments: version.comments.map((c) => ({
        id: c.id,
        quotedText: c.highlight.quotedText,
        header: c.header,
        description: c.description,
        importance: c.importance,
        startOffset: c.highlight.startOffset,
        endOffset: c.highlight.endOffset,
      })),
    };
  }

  // ==========================================================================
  // Validation Baseline Methods
  // ==========================================================================

  /**
   * Create a new validation baseline from existing evaluation versions.
   */
  async createValidationBaseline(input: {
    name: string;
    description?: string;
    agentId: string;
    evaluationVersionIds: string[];
    commitHash?: string;
    createdById?: string;
  }): Promise<{ id: string; name: string; snapshotCount: number }> {
    const baseline = await this.prisma.validationBaseline.create({
      data: {
        name: input.name,
        description: input.description,
        agentId: input.agentId,
        commitHash: input.commitHash,
        createdById: input.createdById,
        snapshots: {
          create: input.evaluationVersionIds.map((evId) => ({
            evaluationVersionId: evId,
          })),
        },
      },
      include: {
        _count: { select: { snapshots: true } },
      },
    });

    return {
      id: baseline.id,
      name: baseline.name,
      snapshotCount: baseline._count.snapshots,
    };
  }

  /**
   * Get all validation baselines for an agent.
   */
  async getValidationBaselines(agentId: string): Promise<
    Array<{
      id: string;
      name: string;
      description: string | null;
      commitHash: string | null;
      createdAt: Date;
      snapshotCount: number;
    }>
  > {
    const baselines = await this.prisma.validationBaseline.findMany({
      where: { agentId },
      include: {
        _count: { select: { snapshots: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return baselines.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      commitHash: b.commitHash,
      createdAt: b.createdAt,
      snapshotCount: b._count.snapshots,
    }));
  }

  /**
   * Get evaluation snapshots from a baseline.
   */
  async getBaselineSnapshots(baselineId: string): Promise<
    Array<{
      evaluationVersionId: string;
      agentId: string;
      agentName: string;
      createdAt: Date;
      documentId: string;
      documentTitle: string;
      grade: number | null;
      pipelineTelemetry: unknown;
      comments: Array<{
        id: string;
        quotedText: string;
        header: string | null;
        description: string;
        importance: number | null;
        startOffset: number;
        endOffset: number;
      }>;
    }>
  > {
    const baseline = await this.prisma.validationBaseline.findUnique({
      where: { id: baselineId },
      include: {
        snapshots: {
          include: {
            evaluationVersion: {
              include: {
                evaluation: {
                  include: {
                    agent: {
                      include: {
                        versions: {
                          orderBy: { version: "desc" },
                          take: 1,
                          select: { name: true },
                        },
                      },
                    },
                    document: {
                      include: {
                        versions: {
                          orderBy: { version: "desc" },
                          take: 1,
                          select: { title: true },
                        },
                      },
                    },
                  },
                },
                comments: {
                  include: {
                    highlight: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!baseline) return [];

    return baseline.snapshots.map((s) => {
      const ev = s.evaluationVersion;
      return {
        evaluationVersionId: ev.id,
        agentId: ev.agentId,
        agentName: ev.evaluation.agent.versions[0]?.name || ev.agentId,
        createdAt: ev.createdAt,
        documentId: ev.evaluation.documentId,
        documentTitle: ev.evaluation.document.versions[0]?.title || "Unknown",
        grade: ev.grade,
        pipelineTelemetry: ev.pipelineTelemetry,
        comments: ev.comments.map((c) => ({
          id: c.id,
          quotedText: c.highlight.quotedText,
          header: c.header,
          description: c.description,
          importance: c.importance,
          startOffset: c.highlight.startOffset,
          endOffset: c.highlight.endOffset,
        })),
      };
    });
  }

  /**
   * Delete a validation baseline.
   */
  async deleteValidationBaseline(baselineId: string): Promise<void> {
    await this.prisma.validationBaseline.delete({
      where: { id: baselineId },
    });
  }

  /**
   * Get document IDs from a baseline (for running new evaluations).
   */
  async getBaselineDocumentIds(baselineId: string): Promise<string[]> {
    const baseline = await this.prisma.validationBaseline.findUnique({
      where: { id: baselineId },
      include: {
        snapshots: {
          include: {
            evaluationVersion: {
              include: {
                evaluation: {
                  select: { documentId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!baseline) return [];

    return [...new Set(baseline.snapshots.map((s) => s.evaluationVersion.evaluation.documentId))];
  }

  // ==========================================================================
  // Validation Run Methods
  // ==========================================================================

  /**
   * Create a new validation run.
   */
  async createValidationRun(input: {
    baselineId: string;
    name?: string;
    commitHash?: string;
    profileId?: string;
  }): Promise<{ id: string; baselineId: string; status: string; profileId?: string }> {
    const run = await this.prisma.validationRun.create({
      data: {
        baselineId: input.baselineId,
        name: input.name,
        commitHash: input.commitHash,
        profileId: input.profileId,
        status: "running",
      },
    });

    return {
      id: run.id,
      baselineId: run.baselineId,
      status: run.status,
      profileId: run.profileId ?? undefined,
    };
  }

  /**
   * Update validation run status and summary.
   */
  async updateValidationRunStatus(
    runId: string,
    status: "running" | "completed" | "failed",
    summary?: string
  ): Promise<void> {
    await this.prisma.validationRun.update({
      where: { id: runId },
      data: {
        status,
        summary,
        completedAt: status !== "running" ? new Date() : undefined,
      },
    });
  }

  /**
   * Add a per-document result to a validation run.
   */
  async addValidationRunSnapshot(input: {
    runId: string;
    baselineSnapshotId: string;
    newEvaluationId: string;
    status: "unchanged" | "changed";
    keptCount: number;
    newCount: number;
    lostCount: number;
    comparisonData?: unknown;
  }): Promise<{ id: string }> {
    const snapshot = await this.prisma.validationRunSnapshot.create({
      data: {
        runId: input.runId,
        baselineSnapshotId: input.baselineSnapshotId,
        newEvaluationId: input.newEvaluationId,
        status: input.status,
        keptCount: input.keptCount,
        newCount: input.newCount,
        lostCount: input.lostCount,
        comparisonData: input.comparisonData as object | undefined,
      },
    });

    return { id: snapshot.id };
  }

  /**
   * Get all validation runs for a baseline.
   */
  async getValidationRuns(baselineId: string): Promise<
    Array<{
      id: string;
      name: string | null;
      commitHash: string | null;
      status: string;
      summary: string | null;
      createdAt: Date;
      completedAt: Date | null;
      snapshotCount: number;
      unchangedCount: number;
      changedCount: number;
    }>
  > {
    const runs = await this.prisma.validationRun.findMany({
      where: { baselineId },
      include: {
        snapshots: {
          select: { status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return runs.map((r) => ({
      id: r.id,
      name: r.name,
      commitHash: r.commitHash,
      status: r.status,
      summary: r.summary,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
      snapshotCount: r.snapshots.length,
      unchangedCount: r.snapshots.filter((s) => s.status === "unchanged").length,
      changedCount: r.snapshots.filter((s) => s.status === "changed").length,
    }));
  }

  /**
   * Get full details of a validation run including all snapshot comparisons.
   */
  async getValidationRunDetail(runId: string): Promise<{
    id: string;
    name: string | null;
    commitHash: string | null;
    status: string;
    summary: string | null;
    createdAt: Date;
    completedAt: Date | null;
    baseline: { id: string; name: string };
    snapshots: Array<{
      id: string;
      status: string;
      keptCount: number;
      newCount: number;
      lostCount: number;
      documentId: string;
      documentTitle: string;
      comparisonData: unknown;
    }>;
  } | null> {
    const run = await this.prisma.validationRun.findUnique({
      where: { id: runId },
      include: {
        baseline: {
          select: { id: true, name: true },
        },
        snapshots: {
          include: {
            baselineSnapshot: {
              include: {
                evaluationVersion: {
                  include: {
                    evaluation: {
                      include: {
                        document: {
                          include: {
                            versions: {
                              orderBy: { version: "desc" },
                              take: 1,
                              select: { title: true },
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
        },
      },
    });

    if (!run) return null;

    return {
      id: run.id,
      name: run.name,
      commitHash: run.commitHash,
      status: run.status,
      summary: run.summary,
      createdAt: run.createdAt,
      completedAt: run.completedAt,
      baseline: run.baseline,
      snapshots: run.snapshots.map((s) => ({
        id: s.id,
        status: s.status,
        keptCount: s.keptCount,
        newCount: s.newCount,
        lostCount: s.lostCount,
        documentId: s.baselineSnapshot.evaluationVersion.evaluation.documentId,
        documentTitle:
          s.baselineSnapshot.evaluationVersion.evaluation.document.versions[0]?.title || "Unknown",
        comparisonData: s.comparisonData,
      })),
    };
  }

  /**
   * Delete a validation run.
   */
  async deleteValidationRun(runId: string): Promise<void> {
    await this.prisma.validationRun.delete({
      where: { id: runId },
    });
  }

  /**
   * Get baseline snapshot ID by baseline and document.
   * Used when saving run results to link to the correct baseline snapshot.
   */
  async getBaselineSnapshotByDocument(
    baselineId: string,
    documentId: string
  ): Promise<{ id: string; evaluationVersionId: string } | null> {
    const snapshot = await this.prisma.validationBaselineSnapshot.findFirst({
      where: {
        baselineId,
        evaluationVersion: {
          evaluation: {
            documentId,
          },
        },
      },
      select: {
        id: true,
        evaluationVersionId: true,
      },
    });

    return snapshot;
  }
}

// Default instance for convenience
export const metaEvaluationRepository = new MetaEvaluationRepository();
