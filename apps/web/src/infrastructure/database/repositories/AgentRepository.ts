import { generateId } from "@roast/db";
import { prisma } from "@roast/db";
import type { Agent, AgentInput, AgentVersion } from "@roast/ai";
import { AgentSchema, AgentVersionSchema } from "@roast/ai";
import type { AgentReview } from "@/shared/types/evaluationSchema";
import { AgentReviewSchema } from "@/shared/types/evaluationSchema";
import { Result, ValidationError, NotFoundError, AppError } from "@roast/domain";

export class AgentRepository {
  /**
   * Creates a new agent with its first version
   */
  async createAgent(data: AgentInput, userId: string): Promise<Result<Agent, AppError>> {
    try {
      const id = generateId(16);
      const agent = await prisma.agent.create({
      data: {
        id,
        submittedById: userId,
        versions: {
          create: {
            version: 1,
            name: data.name,
            description: data.description,
            primaryInstructions: data.primaryInstructions,
            selfCritiqueInstructions: data.selfCritiqueInstructions,
            providesGrades: data.providesGrades || false,
            extendedCapabilityId: data.extendedCapabilityId,
            readme: data.readme,
          },
        },
      },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const parsedAgent = AgentSchema.parse({
      id: agent.id,
      name: agent.versions[0].name,
      version: agent.versions[0].version.toString(),
      description: agent.versions[0].description,
      primaryInstructions: agent.versions[0].primaryInstructions || undefined,
      selfCritiqueInstructions: agent.versions[0].selfCritiqueInstructions || undefined,
      providesGrades: agent.versions[0].providesGrades ?? false,
      extendedCapabilityId: agent.versions[0].extendedCapabilityId || undefined,
      readme: agent.versions[0].readme || undefined,
      isSystemManaged: agent.isSystemManaged ?? false,
      isRecommended: agent.isRecommended ?? false,
      isDeprecated: agent.isDeprecated ?? false,
      owner: {
        id: agent.submittedById,
        name: agent.submittedBy.name || "Unknown",
        email: agent.submittedBy.email || "unknown@example.com",
      },
    });

    return Result.ok(parsedAgent);
    } catch (error) {
      if (error instanceof Error) {
        return Result.fail(new AppError(error.message, "AGENT_CREATE_ERROR"));
      }
      return Result.fail(new AppError("Failed to create agent", "AGENT_CREATE_ERROR"));
    }
  }

  /**
   * Updates an agent by creating a new version
   */
  async updateAgent(agentId: string, data: AgentInput, userId: string): Promise<Result<Agent, AppError>> {
    try {
      const existingAgent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: { versions: { orderBy: { version: "desc" }, take: 1 } },
      });

      if (!existingAgent) {
        return Result.fail(new NotFoundError("Agent not found"));
      }
      if (existingAgent.submittedById !== userId) {
        return Result.fail(new ValidationError("You do not have permission to update this agent"));
      }

      const latestVersion = existingAgent.versions[0].version;

    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        updatedAt: new Date(),
        isDeprecated: data.isDeprecated,
        versions: {
          create: {
            version: latestVersion + 1,
            name: data.name,
            description: data.description,
            primaryInstructions: data.primaryInstructions,
            selfCritiqueInstructions: data.selfCritiqueInstructions,
            providesGrades: data.providesGrades || false,
            extendedCapabilityId: data.extendedCapabilityId,
            readme: data.readme,
          },
        },
      },
      include: {
        versions: { orderBy: { version: "desc" }, take: 1 },
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const parsedAgent = AgentSchema.parse({
      id: agent.id,
      name: agent.versions[0].name,
      version: agent.versions[0].version.toString(),
      description: agent.versions[0].description,
      primaryInstructions: agent.versions[0].primaryInstructions || undefined,
      selfCritiqueInstructions: agent.versions[0].selfCritiqueInstructions || undefined,
      providesGrades: agent.versions[0].providesGrades ?? false,
      extendedCapabilityId: agent.versions[0].extendedCapabilityId || undefined,
      readme: agent.versions[0].readme || undefined,
      isSystemManaged: agent.isSystemManaged ?? false,
      isRecommended: agent.isRecommended ?? false,
      isDeprecated: agent.isDeprecated ?? false,
      owner: {
        id: agent.submittedById,
        name: agent.submittedBy.name || "Unknown",
        email: agent.submittedBy.email || "unknown@example.com",
      },
    });

    return Result.ok(parsedAgent);
    } catch (error) {
      if (error instanceof Error) {
        return Result.fail(new AppError(error.message, "AGENT_UPDATE_ERROR"));
      }
      return Result.fail(new AppError("Failed to update agent", "AGENT_UPDATE_ERROR"));
    }
  }

  /**
   * Retrieves an agent with owner information
   */
  async getAgentWithOwner(agentId: string): Promise<Result<Agent | null, AppError>> {
    try {
      const dbAgent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ephemeralBatch: {
          select: {
            trackingId: true,
            isEphemeral: true,
          },
        },
      },
    });

    if (!dbAgent) return Result.ok(null);

    const parsedAgent = AgentSchema.parse({
      id: dbAgent.id,
      name: dbAgent.versions[0].name,
      version: dbAgent.versions[0].version.toString(),
      description: dbAgent.versions[0].description,
      primaryInstructions: dbAgent.versions[0].primaryInstructions || undefined,
      selfCritiqueInstructions: dbAgent.versions[0].selfCritiqueInstructions || undefined,
      providesGrades: dbAgent.versions[0].providesGrades ?? false,
      extendedCapabilityId: dbAgent.versions[0].extendedCapabilityId || undefined,
      readme: dbAgent.versions[0].readme || undefined,
      isSystemManaged: dbAgent.isSystemManaged ?? false,
      isRecommended: dbAgent.isRecommended ?? false,
      isDeprecated: dbAgent.isDeprecated ?? false,
      owner: {
        id: dbAgent.submittedById,
        name: dbAgent.submittedBy.name || "Unknown",
      },
      ephemeralBatch: dbAgent.ephemeralBatch,
    });

    return Result.ok(parsedAgent);
    } catch (error) {
      if (error instanceof Error) {
        return Result.fail(new AppError(error.message, "AGENT_FETCH_ERROR"));
      }
      return Result.fail(new AppError("Failed to fetch agent", "AGENT_FETCH_ERROR"));
    }
  }

  /**
   * Gets all versions of an agent
   */
  async getAgentVersions(agentId: string): Promise<Result<AgentVersion[], AppError>> {
    try {
      const versions = await prisma.agentVersion.findMany({
        where: { agentId },
        orderBy: { version: "desc" },
      });

      const parsedVersions = versions.map((version) =>
        AgentVersionSchema.parse({
          id: version.id,
          version: version.version,
          name: version.name,
          description: version.description,
          primaryInstructions: version.primaryInstructions || undefined,
          selfCritiqueInstructions: version.selfCritiqueInstructions || undefined,
          providesGrades: version.providesGrades ?? false,
          extendedCapabilityId: version.extendedCapabilityId || undefined,
          readme: version.readme || undefined,
          createdAt: version.createdAt,
          updatedAt: version.updatedAt,
        })
      );

      return Result.ok(parsedVersions);
    } catch (error) {
      if (error instanceof Error) {
        return Result.fail(new AppError(error.message, "AGENT_VERSIONS_ERROR"));
      }
      return Result.fail(new AppError("Failed to fetch agent versions", "AGENT_VERSIONS_ERROR"));
    }
  }

  /**
   * Gets the latest review for an agent
   */
  async getAgentReview(agentId: string): Promise<Result<AgentReview | null, AppError>> {
    try {
      const evaluationVersion = await prisma.evaluationVersion.findFirst({
      where: {
        agentId: agentId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        evaluation: {
          include: {
            document: {
              include: {
                submittedBy: true,
              },
            },
          },
        },
      },
    });

    if (!evaluationVersion) {
      return Result.ok(null);
    }

    const review = AgentReviewSchema.parse({
      evaluatedAgentId: agentId,
      grade: evaluationVersion.grade ?? undefined,
      summary: evaluationVersion.summary,
      author:
        evaluationVersion.evaluation.document.submittedBy.name || "Unknown",
      createdAt: evaluationVersion.createdAt,
    });

    return Result.ok(review);
    } catch (error) {
      if (error instanceof Error) {
        return Result.fail(new AppError(error.message, "AGENT_REVIEW_ERROR"));
      }
      return Result.fail(new AppError("Failed to fetch agent review", "AGENT_REVIEW_ERROR"));
    }
  }

  /**
   * Gets documents that have been evaluated by an agent
   */
  async getAgentDocuments(agentId: string, limit: number = 40): Promise<Result<any[], AppError>> {
    try {
      const evaluations = await prisma.evaluation.findMany({
      where: {
        agentId: agentId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      include: {
        document: {
          include: {
            versions: {
              orderBy: { version: "desc" },
              take: 1,
            },
            submittedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        versions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            job: {
              select: {
                status: true,
                createdAt: true,
                completedAt: true,
                priceInDollars: true,
              },
            },
          },
        },
      },
    });

    const documents = evaluations.map((evaluation: any) => {
      const latestDocumentVersion = evaluation.document?.versions?.[0];
      const latestEvaluationVersion = evaluation.versions?.[0];

      return {
        id: evaluation.document?.id || evaluation.documentId,
        title: latestDocumentVersion?.title || "Untitled",
        author: evaluation.document?.submittedBy?.name || "Unknown",
        publishedDate: evaluation.document?.publishedDate,
        evaluationId: evaluation.id,
        evaluationCreatedAt: evaluation.createdAt,
        summary: latestEvaluationVersion?.summary,
        analysis: latestEvaluationVersion?.analysis,
        grade: latestEvaluationVersion?.grade,
        jobStatus: latestEvaluationVersion?.job?.status,
        jobCreatedAt: latestEvaluationVersion?.job?.createdAt,
        jobCompletedAt: latestEvaluationVersion?.job?.completedAt,
        priceInDollars: latestEvaluationVersion?.job?.priceInDollars?.toString() || null,
      };
    });

    return Result.ok(documents);
    } catch (error) {
      if (error instanceof Error) {
        return Result.fail(new AppError(error.message, "AGENT_DOCUMENTS_ERROR"));
      }
      return Result.fail(new AppError("Failed to fetch agent documents", "AGENT_DOCUMENTS_ERROR"));
    }
  }

  /**
   * Gets all non-ephemeral agents with basic information
   */
  async getAllAgents(): Promise<Result<Array<{ id: string; name: string; version: string; description: string }>, AppError>> {
    try {
      const dbAgents = await prisma.agent.findMany({
      where: {
        ephemeralBatchId: null, // Exclude ephemeral agents
      },
      include: {
        versions: {
          orderBy: {
            version: "desc",
          },
          take: 1,
        },
      },
    });

    const agents = dbAgents.map((dbAgent) => ({
      id: dbAgent.id,
      name: dbAgent.versions[0].name,
      version: dbAgent.versions[0].version.toString(),
      description: dbAgent.versions[0].description,
    }));

    return Result.ok(agents);
    } catch (error) {
      if (error instanceof Error) {
        return Result.fail(new AppError(error.message, "AGENT_LIST_ERROR"));
      }
      return Result.fail(new AppError("Failed to fetch agents", "AGENT_LIST_ERROR"));
    }
  }

  /**
   * Gets evaluations performed by an agent
   */
  async getAgentEvaluations(agentId: string, options?: { limit?: number; batchId?: string }): Promise<Result<any[], AppError>> {
    try {
      const limit = options?.limit || 50;
      const batchId = options?.batchId;
    
    let whereConditions: any = {
      agentId: agentId,
    };

    // If batchId is provided, filter evaluations by batch
    if (batchId) {
      // First get all job IDs for this batch
      const jobsInBatch = await prisma.job.findMany({
        where: { agentEvalBatchId: batchId },
        select: { evaluationVersionId: true },
      });
      
      const evaluationVersionIds = jobsInBatch
        .map(job => job.evaluationVersionId)
        .filter((id): id is string => id !== null);
      
      whereConditions.id = { in: evaluationVersionIds };
    }

    const evaluations = await prisma.evaluationVersion.findMany({
      where: whereConditions,
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      include: {
        evaluation: {
          include: {
            document: {
              include: {
                versions: {
                  orderBy: { version: "desc" },
                  take: 1,
                },
                submittedBy: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        job: {
          select: {
            status: true,
            createdAt: true,
            completedAt: true,
            priceInDollars: true,
            llmThinking: true,
            tasks: {
              select: {
                id: true,
                name: true,
                modelName: true,
                priceInDollars: true,
                timeInSeconds: true,
                log: true,
                createdAt: true,
                llmInteractions: true,
              },
            },
          },
        },
        agentVersion: {
          select: {
            version: true,
            name: true,
          },
        },
        comments: {
          select: {
            id: true,
            description: true,
            importance: true,
            grade: true,
          },
        },
      },
    });

    const results = evaluations.map((evalVersion) => {
      const latestDocumentVersion = evalVersion.evaluation.document.versions[0];
      
      return {
        id: evalVersion.id,
        evaluationId: evalVersion.evaluationId,
        documentId: evalVersion.evaluation.documentId,
        documentTitle: latestDocumentVersion?.title || "Untitled",
        documentAuthor: evalVersion.evaluation.document.submittedBy.name || "Unknown",
        agentVersion: evalVersion.agentVersion?.version || evalVersion.agentVersionId,
        agentVersionName: evalVersion.agentVersion?.name,
        evaluationVersion: evalVersion.version,
        summary: evalVersion.summary,
        analysis: evalVersion.analysis,
        grade: evalVersion.grade,
        selfCritique: evalVersion.selfCritique,
        createdAt: evalVersion.createdAt,
        jobStatus: evalVersion.job?.status,
        jobCreatedAt: evalVersion.job?.createdAt,
        jobCompletedAt: evalVersion.job?.completedAt,
        priceInDollars: evalVersion.job?.priceInDollars?.toString() || null,
        comments: evalVersion.comments,
        job: evalVersion.job,
      };
    });

    return Result.ok(results);
    } catch (error) {
      if (error instanceof Error) {
        return Result.fail(new AppError(error.message, "AGENT_EVALUATIONS_ERROR"));
      }
      return Result.fail(new AppError("Failed to fetch agent evaluations", "AGENT_EVALUATIONS_ERROR"));
    }
  }
}