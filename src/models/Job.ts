import { prisma } from "@/lib/prisma";
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
        purpose: agentVersion.agentType.toLowerCase(),
        version: agentVersion.version.toString(),
        description: agentVersion.description,
        genericInstructions: agentVersion.genericInstructions || undefined,
        summaryInstructions: agentVersion.summaryInstructions || undefined,
        commentInstructions: agentVersion.commentInstructions || undefined,
        gradeInstructions: agentVersion.gradeInstructions || undefined,
        selfCritiqueInstructions: agentVersion.selfCritiqueInstructions || undefined,
        extendedCapabilityId: agentVersion.extendedCapabilityId || undefined,
      };

      // Analyze document
      console.log(`🧠 Analyzing document with agent ${agent.name}...`);
      const analysisResult = await analyzeDocument(documentForAnalysis, agent);

      // Extract the outputs and tasks
      const { tasks, ...evaluationOutputs } = analysisResult;

      // Create evaluation version
      const evaluationVersion = await prisma.evaluationVersion.create({
        data: {
          agentId: agent.id,
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
            priceInCents: task.priceInCents,
            timeInSeconds: task.timeInSeconds,
            log: task.log,
            llmInteractions: task.llmInteractions as any, // Cast for Prisma Json type
            jobId: job.id,
          },
        });
      }

      // Save comments with highlights
      if (evaluationOutputs.comments && evaluationOutputs.comments.length > 0) {
        for (const comment of evaluationOutputs.comments) {
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
- Total Tokens: ${totalInputTokens + totalOutputTokens}
  * Input Tokens: ${totalInputTokens}
  * Output Tokens: ${totalOutputTokens}
- Estimated Cost: $${(costInCents / 100).toFixed(6)}
- Runtime: [DURATION_PLACEHOLDER]s
- Status: Success

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
- Cost: $${(task.priceInCents / 100).toFixed(6)}
- Interactions: ${task.llmInteractions.length}
${task.llmInteractions
  .map(
    (interaction) => `
#### Interaction
\`\`\`
${interaction.messages.map((m) => `${m.role}: ${m.content}`).join("\n")}
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

      return {
        job,
        logFilename,
        logContent,
      };
    } catch (error) {
      await this.markJobAsFailed(job.id, error);
      throw error;
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
