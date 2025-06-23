#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const GetAgentsArgsSchema = z.object({
  limit: z.number().optional().default(10),
  includeArchived: z.boolean().optional().default(false),
});

const GetRecentEvaluationsArgsSchema = z.object({
  agentId: z.string().optional(),
  limit: z.number().optional().default(20),
  status: z.enum(["success", "failed", "all"]).optional().default("all"),
});

const GetAgentStatsArgsSchema = z.object({
  agentId: z.string(),
  days: z.number().optional().default(7),
});

const GetFailedJobsArgsSchema = z.object({
  limit: z.number().optional().default(20),
  agentId: z.string().optional(),
});

const GetDocumentsArgsSchema = z.object({
  limit: z.number().optional().default(10),
  searchTerm: z.string().optional(),
});

const AnalyzeRecentEvalsArgsSchema = z.object({
  hours: z.number().optional().default(24),
  limit: z.number().optional().default(200),
});

const GetBatchResultsArgsSchema = z.object({
  batchId: z.string(),
});

const GetJobQueueStatusArgsSchema = z.object({
  includeDetails: z.boolean().optional().default(false),
});

const server = new Server(
  {
    name: "open-annotate-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_agents",
        description: "Get a list of agents with their latest versions",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of agents to return (default: 10)",
            },
            includeArchived: {
              type: "boolean",
              description: "Include archived agents (default: false)",
            },
          },
        },
      },
      {
        name: "get_recent_evaluations",
        description: "Get recent evaluations with optional filtering",
        inputSchema: {
          type: "object",
          properties: {
            agentId: {
              type: "string",
              description: "Filter by specific agent ID",
            },
            limit: {
              type: "number",
              description: "Number of evaluations to return (default: 20)",
            },
            status: {
              type: "string",
              enum: ["success", "failed", "all"],
              description: "Filter by evaluation status (default: all)",
            },
          },
        },
      },
      {
        name: "get_agent_stats",
        description: "Get performance statistics for a specific agent",
        inputSchema: {
          type: "object",
          properties: {
            agentId: {
              type: "string",
              description: "Agent ID to get stats for",
            },
            days: {
              type: "number",
              description: "Number of days to look back (default: 7)",
            },
          },
          required: ["agentId"],
        },
      },
      {
        name: "get_failed_jobs",
        description: "Get recent failed jobs with error details",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of jobs to return (default: 20)",
            },
            agentId: {
              type: "string",
              description: "Filter by specific agent ID",
            },
          },
        },
      },
      {
        name: "get_documents",
        description: "Get documents with optional search",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of documents to return (default: 10)",
            },
            searchTerm: {
              type: "string",
              description: "Search in document titles",
            },
          },
        },
      },
      {
        name: "analyze_recent_evals",
        description: "Analyze recent evaluations with comprehensive statistics",
        inputSchema: {
          type: "object",
          properties: {
            hours: {
              type: "number",
              description: "Number of hours to look back (default: 24)",
            },
            limit: {
              type: "number",
              description: "Maximum evaluations to analyze (default: 200)",
            },
          },
        },
      },
      {
        name: "get_batch_results",
        description: "Get results for a specific evaluation batch",
        inputSchema: {
          type: "object",
          properties: {
            batchId: {
              type: "string",
              description: "The batch ID to get results for",
            },
          },
          required: ["batchId"],
        },
      },
      {
        name: "get_job_queue_status",
        description: "Get current job queue status and statistics",
        inputSchema: {
          type: "object",
          properties: {
            includeDetails: {
              type: "boolean",
              description: "Include detailed job information (default: false)",
            },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "get_agents": {
        const { limit } = GetAgentsArgsSchema.parse(args);
        
        const agents = await prisma.agent.findMany({
          include: {
            versions: {
              orderBy: { version: "desc" },
              take: 1,
            },
          },
          take: limit,
          orderBy: { createdAt: "desc" },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                agents.map((agent) => ({
                  id: agent.id,
                  name: agent.versions[0]?.name || "Unknown",
                  type: agent.versions[0]?.agentType || "Unknown",
                  latestVersion: agent.versions[0]?.version || 0,
                  providesGrades: agent.versions[0]?.providesGrades || false,
                  createdAt: agent.createdAt,
                })),
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_recent_evaluations": {
        const { agentId, limit } = GetRecentEvaluationsArgsSchema.parse(args);
        
        const where: any = {};
        if (agentId) where.agentId = agentId;

        const evaluations = await prisma.evaluation.findMany({
          where,
          include: {
            agent: {
              include: {
                versions: {
                  orderBy: { version: "desc" },
                  take: 1,
                },
              },
            },
            document: true,
            versions: {
              orderBy: { version: "desc" },
              take: 1,
              include: {
                job: true,
              },
            },
          },
          take: limit,
          orderBy: { createdAt: "desc" },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                evaluations.map((evaluation) => {
                  const latestVersion = evaluation.versions[0];
                  const job = latestVersion?.job;
                  const agentVersion = evaluation.agent.versions[0];
                  
                  return {
                    id: evaluation.id,
                    documentId: evaluation.documentId,
                    agentName: agentVersion?.name || "Unknown",
                    agentVersion: agentVersion?.version || 0,
                    status: job?.status || "NO_JOB",
                    grade: latestVersion?.grade || null,
                    cost: job?.costInCents ? job.costInCents / 100 : 0,
                    createdAt: evaluation.createdAt,
                    error: job?.error || null,
                  };
                }),
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_agent_stats": {
        const { agentId, days } = GetAgentStatsArgsSchema.parse(args);
        
        const since = new Date();
        since.setDate(since.getDate() - days);

        const agent = await prisma.agent.findUnique({
          where: { id: agentId },
          include: {
            versions: {
              include: {
                evaluations: {
                  where: {
                    createdAt: { gte: since },
                  },
                  include: {
                    job: true,
                  },
                },
              },
            },
          },
        });

        if (!agent) {
          throw new Error(`Agent with ID ${agentId} not found`);
        }

        const latestVersion = agent.versions[agent.versions.length - 1];
        const stats = {
          agentName: latestVersion?.name || "Unknown",
          agentType: latestVersion?.agentType || "Unknown",
          totalVersions: agent.versions.length,
          evaluationsInPeriod: 0,
          successRate: 0,
          averageGrade: 0,
          totalCost: 0,
          failureReasons: {} as Record<string, number>,
        };

        let totalGrades = 0;
        let successCount = 0;

        for (const version of agent.versions) {
          for (const evaluationVersion of version.evaluations) {
            stats.evaluationsInPeriod++;
            
            if (evaluationVersion.job) {
              stats.totalCost += (evaluationVersion.job.costInCents || 0) / 100;
              
              if (evaluationVersion.job.status === "COMPLETED") {
                successCount++;
                if (evaluationVersion.grade !== null) {
                  totalGrades += evaluationVersion.grade;
                }
              } else if (evaluationVersion.job.error) {
                const errorKey = evaluationVersion.job.error.split('\n')[0].substring(0, 50);
                stats.failureReasons[errorKey] = (stats.failureReasons[errorKey] || 0) + 1;
              }
            }
          }
        }

        stats.successRate = stats.evaluationsInPeriod > 0 
          ? (successCount / stats.evaluationsInPeriod) * 100 
          : 0;
        
        stats.averageGrade = successCount > 0 
          ? totalGrades / successCount 
          : 0;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      }

      case "get_failed_jobs": {
        const { limit, agentId } = GetFailedJobsArgsSchema.parse(args);
        
        const where: any = { status: "FAILED" };
        if (agentId) {
          where.evaluation = {
            agentId: agentId,
          };
        }

        const failedJobs = await prisma.job.findMany({
          where,
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
                document: true,
              },
            },
          },
          take: limit,
          orderBy: { createdAt: "desc" },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                failedJobs.map((job) => ({
                  id: job.id,
                  documentId: job.evaluation.documentId,
                  agentName: job.evaluation.agent.versions[0]?.name || "Unknown",
                  error: job.error,
                  attempts: job.attempts,
                  createdAt: job.createdAt,
                  duration: job.durationInSeconds,
                })),
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_documents": {
        const { limit, searchTerm } = GetDocumentsArgsSchema.parse(args);
        
        const where: any = {};
        if (searchTerm) {
          where.versions = {
            some: {
              title: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
          };
        }

        const documents = await prisma.document.findMany({
          where,
          include: {
            versions: {
              orderBy: { version: "desc" },
              take: 1,
            },
            evaluations: {
              include: {
                versions: {
                  orderBy: { version: "desc" },
                  take: 1,
                  include: {
                    job: true,
                  },
                },
              },
            },
          },
          take: limit,
          orderBy: { createdAt: "desc" },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                documents.map((doc) => {
                  const latestVersion = doc.versions[0];
                  const evaluationCount = doc.evaluations.length;
                  const completedEvaluations = doc.evaluations.filter(
                    (e) => e.versions[0]?.job?.status === "COMPLETED"
                  ).length;
                  
                  return {
                    id: doc.id,
                    title: latestVersion?.title || "Untitled",
                    authors: latestVersion?.authors || [],
                    publishedDate: doc.publishedDate,
                    evaluationCount,
                    completedEvaluations,
                    createdAt: doc.createdAt,
                  };
                }),
                null,
                2
              ),
            },
          ],
        };
      }

      case "analyze_recent_evals": {
        const { hours, limit } = AnalyzeRecentEvalsArgsSchema.parse(args);
        
        const since = new Date();
        since.setHours(since.getHours() - hours);

        const evaluations = await prisma.evaluationVersion.findMany({
          where: {
            createdAt: { gte: since },
          },
          include: {
            job: true,
            agentVersion: {
              include: {
                agent: true,
              },
            },
            evaluation: {
              include: {
                document: true,
              },
            },
          },
          take: limit,
          orderBy: { createdAt: "desc" },
        });

        // Calculate statistics
        const stats = {
          totalEvaluations: evaluations.length,
          timeRange: { from: since, to: new Date() },
          byStatus: {} as Record<string, number>,
          byAgent: {} as Record<string, { count: number; avgGrade: number | null; failureRate: number }>,
          avgProcessingTime: 0,
          totalCost: 0,
          gradeDistribution: {} as Record<number, number>,
          topErrors: {} as Record<string, number>,
        };

        let totalProcessingTime = 0;
        let processedCount = 0;

        for (const evalVersion of evaluations) {
          const job = evalVersion.job;
          const agentName = evalVersion.agentVersion.agent.id;

          // Status tracking
          const status = job?.status || "NO_JOB";
          stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

          // Agent tracking
          if (!stats.byAgent[agentName]) {
            stats.byAgent[agentName] = { count: 0, avgGrade: null, failureRate: 0 };
          }
          stats.byAgent[agentName].count++;

          // Cost and time tracking
          if (job) {
            stats.totalCost += (job.costInCents || 0) / 100;
            if (job.durationInSeconds) {
              totalProcessingTime += job.durationInSeconds;
              processedCount++;
            }

            // Error tracking
            if (job.status === "FAILED" && job.error) {
              const errorKey = job.error.split('\n')[0].substring(0, 100);
              stats.topErrors[errorKey] = (stats.topErrors[errorKey] || 0) + 1;
            }
          }

          // Grade distribution
          if (evalVersion.grade !== null) {
            stats.gradeDistribution[evalVersion.grade] = 
              (stats.gradeDistribution[evalVersion.grade] || 0) + 1;
          }
        }

        // Calculate averages
        stats.avgProcessingTime = processedCount > 0 ? totalProcessingTime / processedCount : 0;

        // Calculate per-agent statistics
        for (const [agentName, agentStats] of Object.entries(stats.byAgent)) {
          const agentEvals = evaluations.filter(e => e.agentVersion.agent.id === agentName);
          const grades = agentEvals
            .map(e => e.grade)
            .filter((g): g is number => g !== null);
          
          if (grades.length > 0) {
            agentStats.avgGrade = grades.reduce((a, b) => a + b, 0) / grades.length;
          }

          const failedCount = agentEvals.filter(e => e.job?.status === "FAILED").length;
          agentStats.failureRate = agentStats.count > 0 ? (failedCount / agentStats.count) * 100 : 0;
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      }

      case "get_batch_results": {
        const { batchId } = GetBatchResultsArgsSchema.parse(args);
        
        const batch = await prisma.agentEvalBatch.findUnique({
          where: { id: batchId },
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
                    versions: {
                      orderBy: { version: "desc" },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        });

        if (!batch) {
          throw new Error(`Batch with ID ${batchId} not found`);
        }

        const results = {
          batchId: batch.id,
          batchName: batch.name,
          agentName: batch.agent.versions[0]?.name || "Unknown",
          targetCount: batch.targetCount,
          completedCount: 0,
          failedCount: 0,
          pendingCount: 0,
          successRate: 0,
          avgGrade: 0,
          totalCost: 0,
          evaluations: [] as any[],
        };

        let totalGrades = 0;
        let gradeCount = 0;

        for (const job of batch.jobs) {
          const evalVersion = job.evaluation.versions[0];
          
          if (job.status === "COMPLETED") {
            results.completedCount++;
            if (evalVersion?.grade !== null && evalVersion?.grade !== undefined) {
              totalGrades += evalVersion.grade;
              gradeCount++;
            }
          } else if (job.status === "FAILED") {
            results.failedCount++;
          } else {
            results.pendingCount++;
          }

          results.totalCost += (job.costInCents || 0) / 100;

          results.evaluations.push({
            jobId: job.id,
            documentTitle: job.evaluation.document.versions?.[0]?.title || "Untitled",
            status: job.status,
            grade: evalVersion?.grade,
            error: job.error,
            duration: job.durationInSeconds,
          });
        }

        results.successRate = batch.jobs.length > 0 
          ? (results.completedCount / batch.jobs.length) * 100 
          : 0;
        
        results.avgGrade = gradeCount > 0 ? totalGrades / gradeCount : 0;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case "get_job_queue_status": {
        const { includeDetails } = GetJobQueueStatusArgsSchema.parse(args);
        
        const [pendingJobs, runningJobs, recentCompleted, recentFailed] = await Promise.all([
          prisma.job.count({ where: { status: "PENDING" } }),
          prisma.job.count({ where: { status: "RUNNING" } }),
          prisma.job.findMany({
            where: { status: "COMPLETED" },
            take: 10,
            orderBy: { completedAt: "desc" },
            include: includeDetails ? {
              evaluation: {
                include: {
                  agent: true,
                  document: true,
                },
              },
            } : undefined,
          }),
          prisma.job.findMany({
            where: { status: "FAILED" },
            take: 10,
            orderBy: { updatedAt: "desc" },
            include: includeDetails ? {
              evaluation: {
                include: {
                  agent: true,
                  document: true,
                },
              },
            } : undefined,
          }),
        ]);

        const queueStatus = {
          summary: {
            pending: pendingJobs,
            running: runningJobs,
            recentlyCompleted: recentCompleted.length,
            recentlyFailed: recentFailed.length,
          },
          health: {
            isHealthy: pendingJobs < 100 && runningJobs > 0,
            backlogSize: pendingJobs,
            processingRate: recentCompleted.length > 0 ? "Active" : "Idle",
          },
        };

        if (includeDetails) {
          (queueStatus as any).recentCompleted = recentCompleted.map(job => ({
            id: job.id,
            completedAt: job.completedAt,
            duration: job.durationInSeconds,
            cost: job.costInCents ? job.costInCents / 100 : 0,
            agent: (job as any).evaluation?.agent?.id,
            document: (job as any).evaluation?.document?.id,
          }));

          (queueStatus as any).recentFailed = recentFailed.map(job => ({
            id: job.id,
            failedAt: job.updatedAt,
            error: job.error?.split('\n')[0],
            attempts: job.attempts,
            agent: (job as any).evaluation?.agent?.id,
            document: (job as any).evaluation?.document?.id,
          }));
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(queueStatus, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  try {
    // Test database connection
    await prisma.$connect();
    console.error("✅ Database connected successfully");
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("🚀 Open Annotate MCP server running on stdio");
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.error("\n👋 Shutting down MCP server...");
      await prisma.$disconnect();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main().catch(async (error) => {
  console.error("❌ Server error:", error);
  await prisma.$disconnect();
  process.exit(1);
});