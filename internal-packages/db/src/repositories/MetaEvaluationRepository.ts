/**
 * Meta-Evaluation Repository
 *
 * Data access layer for meta-evaluations (scoring and ranking agent outputs).
 */

import { prisma as defaultPrisma } from "../client";

// ============================================================================
// Chain Types (for meta-eval CLI)
// ============================================================================

export type Chain = {
  id: string; // Chain prefix (e.g., "chain-abc123")
  documentTitle: string;
  documentId: string;
  agentNames: string[];
  runCount: number;
  firstRunAt: Date;
  lastRunAt: Date;
};

export type ChainRun = {
  trackingId: string;
  agentId: string;
  agentName: string;
  createdAt: Date;
  jobStatus: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  evaluationVersionId: string | null;
  documentVersionId: string | null;
};

export type ChainDetail = {
  chainId: string;
  documentId: string;
  documentTitle: string;
  documentContent: string;
  agentIds: string[];
  runs: ChainRun[];
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

  // ==========================================================================
  // Chain Methods (for meta-eval CLI)
  // ==========================================================================

  /**
   * Get all evaluation chains, grouped by chain prefix.
   * Returns chains sorted by most recent activity.
   */
  async getChains(): Promise<Chain[]> {
    const batches = await this.prisma.agentEvalBatch.findMany({
      where: {
        trackingId: { startsWith: "chain-" },
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
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by chain prefix (chain-{shortId})
    const chainMap = new Map<
      string,
      {
        batches: typeof batches;
        documentTitle: string;
        documentId: string;
        agentNames: Set<string>;
      }
    >();

    for (const batch of batches) {
      if (!batch.trackingId) continue;

      // Extract chain prefix: "chain-abc123" from "chain-abc123-20251217-1645-agentId"
      const parts = batch.trackingId.split("-");
      if (parts.length < 2) continue;
      const chainId = `${parts[0]}-${parts[1]}`;

      const existing = chainMap.get(chainId);
      const agentName = batch.agent.versions[0]?.name || batch.agentId;
      const doc = batch.jobs[0]?.evaluation?.document;
      const docTitle = doc?.versions[0]?.title || "Unknown document";
      const docId = doc?.id || "";

      if (existing) {
        existing.batches.push(batch);
        existing.agentNames.add(agentName);
      } else {
        chainMap.set(chainId, {
          batches: [batch],
          documentTitle: docTitle,
          documentId: docId,
          agentNames: new Set([agentName]),
        });
      }
    }

    // Convert to Chain array
    const chains: Chain[] = [];
    for (const [id, data] of chainMap) {
      const sortedBatches = data.batches.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      );

      chains.push({
        id,
        documentTitle: data.documentTitle,
        documentId: data.documentId,
        agentNames: Array.from(data.agentNames),
        runCount: sortedBatches.length,
        firstRunAt: sortedBatches[0].createdAt,
        lastRunAt: sortedBatches[sortedBatches.length - 1].createdAt,
      });
    }

    // Sort by most recent activity
    chains.sort((a, b) => b.lastRunAt.getTime() - a.lastRunAt.getTime());

    return chains;
  }

  /**
   * Get detailed info about a specific chain, including all runs.
   */
  async getChainDetail(chainId: string): Promise<ChainDetail | null> {
    const batches = await this.prisma.agentEvalBatch.findMany({
      where: {
        trackingId: { startsWith: chainId },
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
    });

    if (batches.length === 0) {
      return null;
    }

    // Extract document info from first batch
    const firstJob = batches[0]?.jobs[0];
    const doc = firstJob?.evaluation?.document;
    const docVersion = doc?.versions[0];

    if (!doc || !docVersion) {
      return null;
    }

    // Collect unique agent IDs
    const agentIds = [...new Set(batches.map((b) => b.agentId))];

    // Build runs list
    const runs: ChainRun[] = [];
    for (const batch of batches) {
      const job = batch.jobs[0];
      const agentName = batch.agent.versions[0]?.name || batch.agentId;

      runs.push({
        trackingId: batch.trackingId || "",
        agentId: batch.agentId,
        agentName,
        createdAt: batch.createdAt,
        jobStatus: (job?.status as ChainRun["jobStatus"]) || "PENDING",
        evaluationVersionId: job?.evaluationVersionId || null,
        documentVersionId: job?.evaluationVersion?.documentVersionId || null,
      });
    }

    return {
      chainId,
      documentId: doc.id,
      documentTitle: docVersion.title,
      documentContent: docVersion.content,
      agentIds,
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
