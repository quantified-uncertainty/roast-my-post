import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  Job as PrismaJob,
  JobStatus,
} from "@prisma/client";

import {
  analyzeDocument,
  countTokensFromInteractions,
} from "../lib/documentAnalysis";
import { Agent } from "../types/agentSchema";
import { ANALYSIS_MODEL } from "../types/openai";
import {
  calculateApiCost,
  mapModelToCostModel,
} from "../utils/costCalculator";
import {
  createJobSessionConfig,
  heliconeSessionsConfig,
  SESSION_PATHS,
} from "../lib/helicone/sessions";

export class JobModel {
  /**
   * Find the oldest pending job (skips retries if original is still pending/running)
   */
  async findNextPendingJob() {
    // Get pending jobs ordered by creation time, with reasonable limit
    const pendingJobs = await prisma.job.findMany({
      where: {
        status: JobStatus.PENDING,
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 100, // Process up to 100 pending jobs at a time
      select: {
        id: true,
        originalJobId: true,
        createdAt: true,
      },
    });

    // For each pending job, check if it's safe to process
    for (const job of pendingJobs) {
      if (job.originalJobId) {
        // This is a retry - check if any earlier attempts are still pending/running
        const earlierAttempts = await prisma.job.findMany({
          where: {
            OR: [
              { id: job.originalJobId },
              { 
                AND: [
                  { originalJobId: job.originalJobId },
                  { createdAt: { lt: job.createdAt } }
                ]
              }
            ],
            status: { in: [JobStatus.PENDING, JobStatus.RUNNING] }
          }
        });

        if (earlierAttempts.length > 0) {
          // Skip this retry - earlier attempts are still in progress
          continue;
        }
      }

      // This job is safe to process - fetch full details
      const fullJob = await prisma.job.findFirst({
        where: { id: job.id },
        include: {
          evaluation: {
            include: {
              document: {
                include: {
                  versions: {
                    orderBy: {
                      version: "desc",
                    },
                    take: 1,
                  },
                },
              },
              agent: {
                include: {
                  submittedBy: true,
                  versions: {
                    orderBy: {
                      version: "desc",
                    },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      });

      return fullJob;
    }

    return null;
  }

  /**
   * Atomically claim and mark a pending job as running
   * Returns the claimed job or null if no job available
   */
  async claimNextPendingJob() {
    // Use a transaction to atomically find and update a job
    const result = await prisma.$transaction(async (tx) => {
      // Find the oldest pending job with row-level lock
      const job = await tx.$queryRaw<Array<{id: string}>>`
        SELECT id FROM "Job" 
        WHERE status = 'PENDING'
        ORDER BY "createdAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;

      if (!job || job.length === 0) {
        return null;
      }

      const jobId = job[0].id;

      // Update the job to RUNNING status
      await tx.job.update({
        where: { id: jobId },
        data: {
          status: JobStatus.RUNNING,
          startedAt: new Date(),
          attempts: { increment: 1 },
        },
      });

      // Fetch the full job with relations
      const fullJob = await tx.job.findUnique({
        where: { id: jobId },
        include: {
          evaluation: {
            include: {
              document: {
                include: {
                  versions: {
                    orderBy: {
                      version: "desc",
                    },
                    take: 1,
                  },
                },
              },
              agent: {
                include: {
                  submittedBy: true,
                  versions: {
                    orderBy: {
                      version: "desc",
                    },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      });

      return fullJob;
    });

    return result;
  }

  /**
   * Update job status to running
   */
  async markJobAsRunning(jobId: string) {
    return prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.RUNNING,
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    });
  }

  /**
   * Update job as completed
   */
  async markJobAsCompleted(
    jobId: string,
    data: {
      llmThinking: string | null;
      costInCents: number;
      durationInSeconds: number;
      logs: string;
    }
  ) {
    return prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.COMPLETED,
        completedAt: new Date(),
        ...data,
      },
    });
  }

  /**
   * Update job as failed and create retry if needed
   */
  async markJobAsFailed(jobId: string, error: unknown) {
    const MAX_RETRY_ATTEMPTS = 3;
    
    // Get current job info
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { 
        attempts: true,
        originalJobId: true,
        evaluationId: true,
        agentEvalBatchId: true,
      }
    });

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Update current job as failed
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.FAILED,
        error: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
      },
    });

    // Check if we should retry
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isRetryableError = this.isRetryableError(errorMessage);
    
    if (isRetryableError && job.attempts < MAX_RETRY_ATTEMPTS) {
      // Create retry job
      const retryJob = await prisma.job.create({
        data: {
          status: JobStatus.PENDING,
          evaluationId: job.evaluationId,
          originalJobId: job.originalJobId || jobId, // Link to original job
          attempts: job.attempts + 1,
          agentEvalBatchId: job.agentEvalBatchId,
        },
      });

      return retryJob;
    } else {
      const reason = !isRetryableError 
        ? "non-retryable error" 
        : `max attempts (${MAX_RETRY_ATTEMPTS + 1}) reached`;
    }

    return prisma.job.findUnique({ where: { id: jobId } });
  }

  /**
   * Determine if an error should trigger a retry
   */
  private isRetryableError(errorMessage: string): boolean {
    // Don't retry validation errors or permanent failures
    const nonRetryablePatterns = [
      'validation',
      'invalid',
      'not found',
      'unauthorized',
      'forbidden',
      'bad request',
    ];
    
    const lowerError = errorMessage.toLowerCase();
    if (nonRetryablePatterns.some(pattern => lowerError.includes(pattern))) {
      return false;
    }

    // Retry network/API/timeout errors
    const retryablePatterns = [
      'timeout',
      'timed out',
      'econnrefused',
      'econnreset',
      'socket hang up',
      'rate limit',
      'too many requests',
      '429',
      '502',
      '503',
      '504',
      'internal server error',
      '500',
      'network',
      'api error',
    ];
    
    return retryablePatterns.some(pattern => lowerError.includes(pattern));
  }

  /**
   * Get all job attempts (original + retries) for a given job
   */
  async getJobAttempts(jobId: string) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { originalJobId: true }
    });

    if (!job) return [];

    // If this is a retry, use its originalJobId, otherwise use the jobId itself
    const originalId = job.originalJobId || jobId;

    // Get all attempts for this original job
    const attempts = await prisma.job.findMany({
      where: {
        OR: [
          { id: originalId },
          { originalJobId: originalId }
        ]
      },
      orderBy: { createdAt: 'asc' },
      include: {
        tasks: true,
        evaluationVersion: true
      }
    });

    return attempts;
  }

  /**
   * Process a specific job
   */
  async processJob(
    job: PrismaJob & {
      evaluation: {
        document: {
          versions: any[];
          id: string;
          publishedDate: Date;
        };
        agent: {
          versions: any[];
          id: string;
          submittedBy?: {
            id: string;
            email?: string | null;
          } | null;
        };
        id: string;
      };
    }
  ) {
    const startTime = Date.now(); // Start timing immediately
    
    // Create session configuration for Helicone tracking
    let sessionConfig = null;
    if (heliconeSessionsConfig.enabled && heliconeSessionsConfig.features.jobSessions) {
      try {
        const documentVersion = job.evaluation.document.versions[0];
        const agentVersion = job.evaluation.agent.versions[0];
        
        if (documentVersion && agentVersion) {
          sessionConfig = createJobSessionConfig(
            job.id,
            job.originalJobId,
            agentVersion.name,
            documentVersion.title,
            SESSION_PATHS.JOB_START,
            {
              DocumentId: job.evaluation.document.id,
              AgentId: job.evaluation.agent.id,
              AgentVersion: agentVersion.version.toString(),
              EvaluationId: job.evaluation.id,
            },
            job.evaluation.agent.submittedBy?.id
          );
          
        }
      } catch (error) {
        console.warn('⚠️ Failed to create Helicone session config:', error);
        // Continue without session tracking rather than failing the job
      }
    }
    
    try {
      // Get the latest document version and agent version
      const documentVersion = job.evaluation.document.versions[0];
      const agentVersion = job.evaluation.agent.versions[0];

      if (!documentVersion) {
        throw new Error("Document version not found");
      }

      if (!agentVersion) {
        throw new Error("Agent version not found");
      }

      // Prepare document for analysis
      const documentForAnalysis = {
        id: job.evaluation.document.id,
        slug: job.evaluation.document.id,
        title: documentVersion.title,
        content: documentVersion.content,
        author: documentVersion.authors.join(", "),
        publishedDate: job.evaluation.document.publishedDate.toISOString(),
        url: documentVersion.urls[0],
        platforms: documentVersion.platforms,
        reviews: [],
        intendedAgents: documentVersion.intendedAgents,
      };

      // Prepare agent info
      const agent: Agent = {
        id: job.evaluation.agent.id,
        name: agentVersion.name,
        version: agentVersion.version.toString(),
        description: agentVersion.description,
        primaryInstructions: agentVersion.primaryInstructions || undefined,
        selfCritiqueInstructions: agentVersion.selfCritiqueInstructions || undefined,
        providesGrades: agentVersion.providesGrades || false,
        extendedCapabilityId: agentVersion.extendedCapabilityId || undefined,
      };

      // Analyze document
      
      // Update session path for analysis phase based on agent type
      let analysisPath: string = SESSION_PATHS.ANALYSIS_COMPREHENSIVE;
      if (agentVersion.extendedCapabilityId === "simple-link-verifier") {
        analysisPath = SESSION_PATHS.ANALYSIS_LINK_VERIFICATION;
      } else if (agentVersion.extendedCapabilityId === "spelling-grammar") {
        analysisPath = SESSION_PATHS.ANALYSIS_SPELLING_GRAMMAR;
      } else if (agentVersion.extendedCapabilityId === "multi-epistemic-eval") {
        analysisPath = SESSION_PATHS.ANALYSIS_PLUGINS;
      }
      
      const analysisSessionConfig = sessionConfig ? {
        ...sessionConfig,
        sessionPath: analysisPath,
      } : undefined;
      
      const analysisResult = await analyzeDocument(documentForAnalysis, agent, 500, 5, analysisSessionConfig, job.id);

      // Extract the outputs and tasks
      const { tasks, ...evaluationOutputs } = analysisResult;

      // Get the latest version number for this evaluation
      const latestEvaluationVersion = await prisma.evaluationVersion.findFirst({
        where: { evaluationId: job.evaluation.id },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      
      const nextVersion = latestEvaluationVersion?.version 
        ? latestEvaluationVersion.version + 1 
        : 1;

      // Create evaluation version
      const evaluationVersion = await prisma.evaluationVersion.create({
        data: {
          agentId: agent.id,
          version: nextVersion,
          summary: evaluationOutputs.summary,
          analysis: evaluationOutputs.analysis,
          grade: evaluationOutputs.grade,
          selfCritique: evaluationOutputs.selfCritique,
          agentVersionId: agentVersion.id,
          evaluationId: job.evaluation.id,
          documentVersionId: documentVersion.id,
          job: {
            connect: {
              id: job.id,
            },
          },
        },
      });

      // Save tasks to database
      for (const task of tasks) {
        await prisma.task.create({
          data: {
            name: task.name,
            modelName: task.modelName,
            priceInDollars: task.priceInDollars,
            timeInSeconds: task.timeInSeconds,
            log: task.log,
            llmInteractions: task.llmInteractions as any, // Cast for Prisma Json type
            jobId: job.id,
          },
        });
      }

      // Save highlights with highlights
      if (evaluationOutputs.highlights && evaluationOutputs.highlights.length > 0) {
        for (const comment of evaluationOutputs.highlights) {
          // Create highlight
          const createdHighlight = await prisma.evaluationHighlight.create({
            data: {
              startOffset: comment.highlight.startOffset,
              endOffset: comment.highlight.endOffset,
              quotedText: comment.highlight.quotedText,
              prefix: comment.highlight.prefix || null,
            },
          });

          // Create comment linked to highlight
          await prisma.evaluationComment.create({
            data: {
              description: comment.description,
              importance: comment.importance || null,
              grade: comment.grade || null,
              evaluationVersionId: evaluationVersion.id,
              highlightId: createdHighlight.id,
            },
          });
        }
      }

      // Calculate total usage from all interactions
      const totalInputTokens = tasks.reduce(
        (sum, task) =>
          sum +
          countTokensFromInteractions(task.llmInteractions, "input_tokens"),
        0
      );
      const totalOutputTokens = tasks.reduce(
        (sum, task) =>
          sum +
          countTokensFromInteractions(task.llmInteractions, "output_tokens"),
        0
      );

      const costInCents = calculateApiCost(
        {
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
        },
        mapModelToCostModel(ANALYSIS_MODEL)
      );

      // Create log file with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const logFilename = `${timestamp}-job-${job.id}.md`;

      // Include plugin logs if available
      const pluginLogsSection = analysisResult.jobLogString ? `

## Plugin Analysis Logs
${analysisResult.jobLogString}

---

` : '';

      const logContent = `# Job Execution Log ${new Date().toISOString()}
    
## Document Information
- ID: ${job.evaluation.document.id}
- Title: ${documentVersion.title}
- Authors: ${documentVersion.authors.join(", ")}

## Agent Information
- ID: ${job.evaluation.agent.id}
- Name: ${agentVersion.name}

## Summary Statistics
- Total Tokens: ${totalInputTokens + totalOutputTokens}
  * Input Tokens: ${totalInputTokens}
  * Output Tokens: ${totalOutputTokens}
- Estimated Cost: $${(costInCents / 100).toFixed(6)}
- Runtime: [DURATION_PLACEHOLDER]s
- Status: Success
${pluginLogsSection}
## LLM Thinking
\`\`\`
${evaluationOutputs.thinking || "No thinking provided"}
\`\`\`

## Tasks
${tasks
  .map(
    (task) => `
### ${task.name}
- Model: ${task.modelName}
- Time: ${task.timeInSeconds}s
- Cost: $${task.priceInDollars.toFixed(6)}
- Interactions: ${task.llmInteractions.length}
${task.llmInteractions
  .map(
    (interaction) => `
#### Interaction
\`\`\`
${interaction.messages?.map((m) => `${m.role}: ${m.content}`).join("\n") || "No messages"}
\`\`\`
`
  )
  .join("\n")}
`
  )
  .join("\n")}

## Response
\`\`\`json
${JSON.stringify(evaluationOutputs, null, 2)}
\`\`\`
`;

      await this.markJobAsCompleted(job.id, {
        llmThinking: evaluationOutputs.thinking,
        costInCents: costInCents,
        durationInSeconds: (Date.now() - startTime) / 1000,
        logs: logContent,
      });

      // Log successful completion to session
      if (sessionConfig) {
      }

      return {
        job,
        logFilename,
        logContent,
      };
    } catch (error) {
      // Log failure to session
      if (sessionConfig) {
      }
      
      await this.markJobAsFailed(job.id, error);
      throw error;
    }
  }

  /**
   * Find and process the next pending job
   */
  async run() {
    try {
      logger.info('🔍 Looking for pending jobs...');
      const job = await this.claimNextPendingJob();

      if (!job) {
        logger.info('✅ No pending jobs found.');
        return false;
      }


      await this.processJob(job);
      return true;
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Disconnect the Prisma client
   */
  async disconnect() {
    await prisma.$disconnect();
  }
}
