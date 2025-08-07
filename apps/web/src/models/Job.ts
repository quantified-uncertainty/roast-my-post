import { prisma, JobStatus } from "@roast/db";
import type { Job as PrismaJob } from "@roast/db";
import { logger } from "@/lib/logger";

import {
  analyzeDocument,
} from "../lib/documentAnalysis";
import { Agent } from "@roast/ai";
import { ANALYSIS_MODEL } from "@roast/ai";
import {
  calculateApiCostInDollars,
  mapModelToCostModel,
} from "../utils/costCalculator";
import {
  HeliconeSessionManager,
  setGlobalSessionManager,
} from "@roast/ai";
import { fetchJobCostWithRetry } from "@roast/ai";

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
      priceInDollars: number;
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
    // Sanitize error message to handle Unicode characters
    let errorMessage = error instanceof Error ? error.message : String(error);
    
    // Remove problematic Unicode characters that might cause database issues
    errorMessage = errorMessage.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    
    // Log the error for debugging
    logger.error(`Marking job ${jobId} as failed with error: ${errorMessage}`);
    
    // Truncate error message if it's too long (Prisma String fields have limits)
    if (errorMessage.length > 1000) {
      errorMessage = errorMessage.substring(0, 997) + '...';
    }
    
    try {
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: JobStatus.FAILED,
          error: errorMessage,
          completedAt: new Date(),
        },
      });
      logger.info(`Successfully marked job ${jobId} as FAILED`);
    } catch (dbError) {
      logger.error(`Failed to update job ${jobId} status to FAILED:`, dbError);
      throw dbError;
    }

    // Check if we should retry
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
    
    // Create session manager for Helicone tracking
    let sessionManager: HeliconeSessionManager | undefined;
    try {
      const documentVersion = job.evaluation.document.versions[0];
      const agentVersion = job.evaluation.agent.versions[0];
      
      if (documentVersion && agentVersion) {
        // Use originalJobId for retries to group them under the same session
        const sessionId = job.originalJobId || job.id;
        const truncatedTitle = documentVersion.title.length > 50 
          ? documentVersion.title.slice(0, 50) + "..." 
          : documentVersion.title;
        
        sessionManager = HeliconeSessionManager.forJob(
          sessionId,
          `${agentVersion.name} evaluating ${truncatedTitle}`,
          {
            JobId: job.id,
            JobAttempt: job.originalJobId ? "retry" : "initial",
            DocumentId: job.evaluation.document.id,
            AgentId: job.evaluation.agent.id,
            AgentVersion: agentVersion.version.toString(),
            EvaluationId: job.evaluation.id,
            UserId: job.evaluation.agent.submittedBy?.id || 'anonymous',
          }
        );
        
        // Set as global for automatic header propagation
        setGlobalSessionManager(sessionManager);
      }
    } catch (error) {
      console.warn('⚠️ Failed to create Helicone session manager:', error);
      // Continue without session tracking rather than failing the job
      sessionManager = undefined;
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

      // Prepare document for analysis using Prisma's computed fullContent field
      const documentForAnalysis = {
        id: job.evaluation.document.id,
        slug: job.evaluation.document.id,
        title: documentVersion.title,
        content: documentVersion.fullContent, // Use computed field directly
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
      
      // Track the analysis phase with session manager
      const analysisResult = await (sessionManager 
        ? sessionManager.trackAnalysis('document', async () => {
            return analyzeDocument(documentForAnalysis, agent, 500, 5, job.id);
          })
        : analyzeDocument(documentForAnalysis, agent, 500, 5, job.id));

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
            jobId: job.id,
          },
        });
      }

      // Use the same content that was sent to AI for validation
      // documentForAnalysis.content already includes the prepend
      const fullContentForValidation = documentForAnalysis.content;
      
      // Save highlights with validation
      if (evaluationOutputs.highlights && evaluationOutputs.highlights.length > 0) {
        for (const comment of evaluationOutputs.highlights) {
          // Validate highlight by checking if quotedText matches document at specified offsets
          let isValid = true;
          let error: string | null = null;
          
          if (!comment.highlight) {
            isValid = false;
            error = "Highlight is missing";
          } else {
            try {
              const actualText = fullContentForValidation.slice(
                comment.highlight.startOffset, 
                comment.highlight.endOffset
              );
              
              if (actualText !== comment.highlight.quotedText) {
                isValid = false;
                error = `Text mismatch: expected "${comment.highlight.quotedText}" but found "${actualText}" at offsets ${comment.highlight.startOffset}-${comment.highlight.endOffset}`;
                logger.warn(`Invalid highlight detected: ${error}`);
              }
            } catch (highlightError) {
              isValid = false;
              error = `Validation error: ${highlightError instanceof Error ? highlightError.message : String(highlightError)}`;
              logger.warn(`Highlight validation failed: ${error}`);
            }
          }

          // Create highlight with validation status
          const createdHighlight = await prisma.evaluationHighlight.create({
            data: {
              startOffset: comment.highlight!.startOffset,
              endOffset: comment.highlight!.endOffset,
              quotedText: comment.highlight!.quotedText,
              prefix: comment.highlight!.prefix || null,
              isValid,
              error,
            },
          });

          // Create comment linked to highlight
          await prisma.evaluationComment.create({
            data: {
              description: comment.description || 'No description',
              importance: comment.importance || null,
              grade: comment.grade || null,
              header: comment.header || null,
              level: comment.level || null,
              source: comment.source || null,
              metadata: comment.metadata as any || null,
              evaluationVersionId: evaluationVersion.id,
              highlightId: createdHighlight.id,
            },
          });
        }
      }

      // Note: Token totals are now tracked automatically by the Claude wrapper
      const totalInputTokens = 0; // Legacy field, kept for compatibility
      const totalOutputTokens = 0; // Legacy field, kept for compatibility

      // Try to get accurate cost from Helicone first
      let priceInDollars: number;
      
      try {
        const heliconeData = await fetchJobCostWithRetry(job.id, 3, 1000);
        
        if (heliconeData) {
          // Store exact price in dollars with full precision
          priceInDollars = heliconeData.totalCostUSD;
          logger.info(`Using Helicone cost data for job ${job.id}: $${priceInDollars}`);
        } else {
          throw new Error('Helicone data not available');
        }
      } catch (error) {
        // Fallback to manual cost calculation
        logger.warn(`Failed to fetch Helicone cost for job ${job.id}, falling back to manual calculation:`, { error: error instanceof Error ? error.message : String(error) });
        
        priceInDollars = calculateApiCostInDollars(
          {
            input_tokens: totalInputTokens,
            output_tokens: totalOutputTokens,
          },
          mapModelToCostModel(ANALYSIS_MODEL)
        );
      }

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
- Estimated Cost: $${priceInDollars.toFixed(6)}
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
- Note: LLM interactions now tracked automatically by Claude wrapper
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
        priceInDollars: priceInDollars,
        durationInSeconds: (Date.now() - startTime) / 1000,
        logs: logContent,
      });

      return {
        job,
        logFilename,
        logContent,
      };
    } catch (error) {
      await this.markJobAsFailed(job.id, error);
      throw error;
    } finally {
      // Clear the global session manager after job completion
      setGlobalSessionManager(undefined);
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
    } catch (error) {
      // Re-throw the error to be handled by the caller
      throw error;
    }
  }

  /**
   * @deprecated Prisma client disconnect is handled automatically in serverless environments
   * This method is kept for backward compatibility but does nothing
   */
  async disconnect() {
    // No-op: Connection pooling is managed by Prisma in serverless environments
    // Disconnecting can cause issues with connection reuse
  }
}
