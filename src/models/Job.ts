import { prisma } from "@/lib/prisma";
import {
  Job as PrismaJob,
  JobStatus,
} from "@prisma/client";

import { Agent } from "../types/agentSchema";
import { calculateApiCost } from "../utils/costCalculator";
import { analyzeDocument } from "../utils/documentAnalysis";
import { polishReview } from "../utils/documentAnalysis/polishReview";
import { writeLogFile } from "../utils/documentAnalysis/utils";

export class JobModel {
  /**
   * Find the oldest pending job
   */
  async findNextPendingJob() {
    const job = await prisma.job.findFirst({
      where: {
        status: JobStatus.PENDING,
      },
      orderBy: {
        createdAt: "asc",
      },
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

    return job;
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
   * Update job as failed
   */
  async markJobAsFailed(jobId: string, error: unknown) {
    return prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.FAILED,
        error: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
      },
    });
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
        };
        id: string;
      };
    }
  ) {
    const startTime = Date.now(); // Start timing immediately
    try {
      await this.markJobAsRunning(job.id);

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
        iconName: "robot", // TODO: Fix this
        purpose: agentVersion.agentType.toLowerCase(),
        version: agentVersion.version.toString(),
        description: agentVersion.description,
        genericInstructions: agentVersion.genericInstructions,
        summaryInstructions: agentVersion.summaryInstructions,
        commentInstructions: agentVersion.commentInstructions,
        gradeInstructions: agentVersion.gradeInstructions || undefined,
      };

      // Analyze document
      console.log(`🧠 Analyzing document with agent ${agent.name}...`);
      const { review, usage, llmResponse, finalPrompt, agentContext, tasks } =
        await analyzeDocument(documentForAnalysis, agent);

      // Process the review
      const polishedReview = await polishReview(
        review,
        documentForAnalysis.content
      );

      // Create evaluation version
      const evaluationVersion = await prisma.evaluationVersion.create({
        data: {
          agentId: agent.id,
          summary: polishedReview.summary,
          analysis: polishedReview.analysis,
          grade: polishedReview.grade,
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
            priceInCents: task.priceInCents,
            timeInSeconds: task.timeInSeconds,
            log: task.log,
            jobId: job.id,
          },
        });
      }

      // Save comments with highlights
      if (polishedReview.comments && polishedReview.comments.length > 0) {
        for (const comment of polishedReview.comments) {
          // Create highlight
          const highlight = await prisma.evaluationHighlight.create({
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
              title: comment.title,
              description: comment.description,
              importance: comment.importance || null,
              grade: comment.grade || null,
              evaluationVersionId: evaluationVersion.id,
              highlightId: highlight.id,
            },
          });
        }
      }

      const costInCents = calculateApiCost(usage);

      // Create log file with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const logFilename = `${timestamp}-job-${job.id}.md`;

      const logContent = `# Job Execution Log ${new Date().toISOString()}
    
## Document Information
- ID: ${job.evaluation.document.id}
- Title: ${documentVersion.title}
- Authors: ${documentVersion.authors.join(", ")}

## Agent Information
- ID: ${job.evaluation.agent.id}
- Name: ${agentVersion.name}
- Type: ${agentVersion.agentType}

## Summary Statistics
- Total Tokens: ${usage?.total_tokens || 0}
  * Prompt Tokens: ${usage?.prompt_tokens || 0}
  * Completion Tokens: ${usage?.completion_tokens || 0}
- Estimated Cost: $${(costInCents / 100).toFixed(6)}
- Runtime: [DURATION_PLACEHOLDER]s
- Status: Success

## LLM Thinking
\`\`\`
${polishedReview.thinking || "No thinking provided"}
\`\`\`

## Prompt
\`\`\`
${finalPrompt}
\`\`\`

## Response
\`\`\`json
${JSON.stringify(llmResponse, null, 2)}
\`\`\`
`;

      // Calculate final duration including ALL processing (DB writes, file I/O, etc.)
      const endTime = Date.now();
      const durationInSeconds = Math.round((endTime - startTime) / 1000);
      
      // Update the log file with actual duration
      const finalLogContent = logContent.replace('[DURATION_PLACEHOLDER]', durationInSeconds.toString());
      await writeLogFile(finalLogContent, logFilename);

      console.log(`📝 Log written to ${logFilename}`);

      // Update job as completed
      await this.markJobAsCompleted(job.id, {
        llmThinking: polishedReview.thinking || null,
        costInCents,
        durationInSeconds,
        logs: finalLogContent,
      });

      console.log(`✅ Job ${job.id} completed successfully`);
      return true;
    } catch (error) {
      console.error("❌ Error processing job:", error);
      await this.markJobAsFailed(job.id, error);
      console.log(`❌ Job ${job.id} marked as failed`);
      return false;
    }
  }

  /**
   * Find and process the next pending job
   */
  async run() {
    try {
      console.log("🔍 Looking for pending jobs...");
      const job = await this.findNextPendingJob();

      if (!job) {
        console.log("✅ No pending jobs found.");
        return false;
      }

      console.log(
        `📋 Processing job ${job.id} for document ${job.evaluation.document.id} with agent ${job.evaluation.agent.id}`
      );

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
