#!/usr/bin/env node
import { z } from "zod";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  StdioServerTransport,
} from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  prisma,
  type Agent,
  type AgentVersion,
  type Document,
  type Evaluation,
  type EvaluationVersion,
  type Job,
  type Prisma,
} from "@roast/db";

// Type definitions for Prisma queries with includes
type AgentWithVersions = Agent & {
  versions: AgentVersion[];
};

type EvaluationWithRelations = Evaluation & {
  agent: AgentWithVersions;
  document: Document;
  versions: (EvaluationVersion & {
    job: Job | null;
  })[];
};


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

const SearchDocumentsArgsSchema = z.object({
  query: z.string(),
  limit: z.number().optional().default(50),
  offset: z.number().optional().default(0),
  searchContent: z.boolean().optional().default(false),
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

const CreateAgentVersionArgsSchema = z.object({
  agentId: z.string(),
  name: z.string(),
  description: z.string(),
  primaryInstructions: z.string(),
  selfCritiqueInstructions: z.string().optional(),
  providesGrades: z.boolean().optional().default(false),
  extendedCapabilityId: z.string().optional(),
  readme: z.string().optional(),
});

const SpawnBatchJobsArgsSchema = z.object({
  agentId: z.string(),
  name: z.string().optional(),
  targetCount: z.number().min(1).max(100),
});

const ImportArticleArgsSchema = z.object({
  url: z.string().url(),
  agentIds: z.array(z.string()).optional(),
});

const UpdateDocumentArgsSchema = z.object({
  documentId: z.string(),
  intendedAgentIds: z.array(z.string()).optional(),
});

// New unified API schemas
const GetEvaluationArgsSchema = z.object({
  documentId: z.string(),
  agentId: z.string(),
  includeAllVersions: z.boolean().optional().default(false),
});

const RerunEvaluationArgsSchema = z.object({
  documentId: z.string(),
  agentId: z.string(),
  reason: z.string().optional(),
});

const ListDocumentEvaluationsArgsSchema = z.object({
  documentId: z.string(),
  includeStale: z.boolean().optional().default(false),
  agentIds: z.array(z.string()).optional(),
});


const GetDocumentArgsSchema = z.object({
  documentId: z.string(),
  includeStale: z.boolean().optional().default(false),
});

const server = new Server(
  {
    name: "@roast/mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Get API base URL from environment or use default
const ROAST_MY_POST_MCP_API_BASE_URL =
  process.env.ROAST_MY_POST_MCP_API_BASE_URL || "http://localhost:3000";
const API_KEY = process.env.ROAST_MY_POST_MCP_USER_API_KEY;

// Helper function to make authenticated API calls
async function authenticatedFetch(endpoint: string, options: RequestInit = {}) {
  if (!API_KEY) {
    throw new Error(
      "ROAST_MY_POST_MCP_USER_API_KEY environment variable is not set"
    );
  }

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(`${ROAST_MY_POST_MCP_API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `API request failed: ${response.status}`;

    // Try to parse error as JSON for better error messages
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage += ` - ${errorJson.error || errorText}`;
    } catch {
      errorMessage += ` - ${errorText}`;
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

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
        name: "search_documents",
        description: "Search documents using the server's search API (searches in titles, authors, platforms, URLs, and optionally content)",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query string",
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return (default: 50)",
            },
            offset: {
              type: "number",
              description: "Number of results to skip for pagination (default: 0)",
            },
            searchContent: {
              type: "boolean",
              description: "Whether to search in document content in addition to metadata (default: false)",
            },
          },
          required: ["query"],
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
      {
        name: "create_agent_version",
        description: "Create a new version of an existing agent",
        inputSchema: {
          type: "object",
          properties: {
            agentId: {
              type: "string",
              description: "ID of the agent to update",
            },
            name: {
              type: "string",
              description: "Name of the agent",
            },
            purpose: {
              type: "string",
              enum: ["ASSESSOR", "ADVISOR", "ENRICHER", "EXPLAINER"],
              description: "Type/purpose of the agent",
            },
            description: {
              type: "string",
              description: "Description of what the agent does",
            },
            primaryInstructions: {
              type: "string",
              description: "Primary instructions for the agent",
            },
            selfCritiqueInstructions: {
              type: "string",
              description: "Self-critique instructions (optional)",
            },
            providesGrades: {
              type: "boolean",
              description: "Whether the agent provides grades (default: false)",
            },
            extendedCapabilityId: {
              type: "string",
              description: "Extended capability ID (optional)",
            },
            readme: {
              type: "string",
              description: "Readme/documentation for the agent (optional)",
            },
          },
          required: [
            "agentId",
            "name",
            "purpose",
            "description",
            "primaryInstructions",
          ],
        },
      },
      {
        name: "spawn_batch_jobs",
        description: "Create a batch of evaluation jobs for an agent",
        inputSchema: {
          type: "object",
          properties: {
            agentId: {
              type: "string",
              description: "ID of the agent to run evaluations for",
            },
            name: {
              type: "string",
              description: "Name for the batch (optional)",
            },
            targetCount: {
              type: "number",
              description: "Number of evaluations to run (1-100)",
            },
          },
          required: ["agentId", "targetCount"],
        },
      },
      {
        name: "import_article",
        description:
          "Import an article from a URL and optionally create evaluations with specified agents",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL of the article to import",
            },
            agentIds: {
              type: "array",
              items: {
                type: "string",
              },
              description:
                "Array of agent IDs to create evaluations for (optional)",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "update_document",
        description: "Update document properties like intended agents",
        inputSchema: {
          type: "object",
          properties: {
            documentId: {
              type: "string",
              description: "ID of the document to update",
            },
            intendedAgentIds: {
              type: "array",
              items: {
                type: "string",
              },
              description:
                "Array of agent IDs that should evaluate this document",
            },
          },
          required: ["documentId"],
        },
      },
      {
        name: "get_document",
        description: "Get a document with all its evaluations and metadata",
        inputSchema: {
          type: "object",
          properties: {
            documentId: {
              type: "string",
              description: "Document ID to fetch",
            },
            includeStale: {
              type: "boolean",
              description: "Include stale evaluations (default: false)",
            },
          },
          required: ["documentId"],
        },
      },
      {
        name: "get_evaluation",
        description: "Get detailed evaluation data for a specific document and agent",
        inputSchema: {
          type: "object",
          properties: {
            documentId: {
              type: "string",  
              description: "Document ID",
            },
            agentId: {
              type: "string",
              description: "Agent ID",
            },
            includeAllVersions: {
              type: "boolean",
              description: "Include all versions or just latest (default: false)",
            },
          },
          required: ["documentId", "agentId"],
        },
      },
      {
        name: "rerun_evaluation",
        description: "Re-run an evaluation for a specific document and agent",
        inputSchema: {
          type: "object",
          properties: {
            documentId: {
              type: "string",
              description: "Document ID",
            },
            agentId: {
              type: "string", 
              description: "Agent ID",
            },
            reason: {
              type: "string",
              description: "Optional reason for re-running",
            },
          },
          required: ["documentId", "agentId"],
        },
      },
      {
        name: "list_document_evaluations",
        description: "List all evaluations for a document",
        inputSchema: {
          type: "object",
          properties: {
            documentId: {
              type: "string",
              description: "Document ID",
            },
            includeStale: {
              type: "boolean",
              description: "Include stale evaluations (default: false)",
            },
            agentIds: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Optional filter by agent IDs",
            },
          },
          required: ["documentId"],
        },
      },
      {
        name: "verify_setup",
        description:
          "Verify MCP server setup: check DATABASE_URL and API key configuration",
        inputSchema: {
          type: "object",
          properties: {},
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
                agents.map((agent: AgentWithVersions) => ({
                  id: agent.id,
                  name: agent.versions[0]?.name || "Unknown",
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

        const where: { agentId?: string } = {};
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
                evaluations.map((evaluation: EvaluationWithRelations) => {
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
                    cost: job?.priceInDollars ? parseFloat(job.priceInDollars.toString()) : 0,
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
              stats.totalCost += evaluationVersion.job.priceInDollars ? parseFloat(evaluationVersion.job.priceInDollars.toString()) : 0;

              if (evaluationVersion.job.status === "COMPLETED") {
                successCount++;
                if (evaluationVersion.grade !== null) {
                  totalGrades += evaluationVersion.grade;
                }
              } else if (evaluationVersion.job.error) {
                const errorKey = evaluationVersion.job.error
                  .split("\n")[0]
                  .substring(0, 50);
                stats.failureReasons[errorKey] =
                  (stats.failureReasons[errorKey] || 0) + 1;
              }
            }
          }
        }

        stats.successRate =
          stats.evaluationsInPeriod > 0
            ? (successCount / stats.evaluationsInPeriod) * 100
            : 0;

        stats.averageGrade = successCount > 0 ? totalGrades / successCount : 0;

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

        const where: Prisma.JobWhereInput = { status: "FAILED" };
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
                  agentName:
                    job.evaluation.agent.versions[0]?.name || "Unknown",
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

        const where: Prisma.DocumentWhereInput = {};
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

      case "search_documents": {
        const { query, limit, offset, searchContent } = SearchDocumentsArgsSchema.parse(args);

        try {
          if (!API_KEY) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      error: "No API key configured",
                      instructions:
                        "Set ROAST_MY_POST_MCP_USER_API_KEY environment variable in your MCP server configuration",
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          // Build query parameters
          const params = new URLSearchParams({
            q: query,
            limit: limit.toString(),
            offset: offset.toString(),
          });
          
          if (searchContent) {
            params.append("searchContent", "true");
          }

          // Call the search endpoint
          const result = await authenticatedFetch(`/api/documents/search?${params.toString()}`, {
            method: "GET",
          });

          // Format the results
          const formattedResults = {
            query,
            total: result.total,
            hasMore: result.hasMore,
            documentsFound: result.documents.length,
            searchType: searchContent ? "metadata + content" : "metadata only",
            documents: result.documents.map((doc: {
              id: string;
              title?: string;
              author?: string;
              platforms?: string[];
              url?: string;
              publishedDate?: string;
              evaluations?: Array<{ agentName: string; agentId: string; grade?: number | null }>;
              versions?: Array<{ content?: string }>;
            }) => ({
              id: doc.id,
              title: doc.title,
              author: doc.author,
              platforms: doc.platforms,
              url: doc.url,
              publishedDate: doc.publishedDate,
              evaluations: doc.evaluations?.length || 0,
              matchedIn: searchContent ? "metadata or content" : "metadata",
            })),
          };

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(formattedResults, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    error:
                      error instanceof Error ? error.message : String(error),
                    hint: "Make sure your API key is valid and the server is running",
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }
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
          byAgent: {} as Record<
            string,
            { count: number; avgGrade: number | null; failureRate: number }
          >,
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
            stats.byAgent[agentName] = {
              count: 0,
              avgGrade: null,
              failureRate: 0,
            };
          }
          stats.byAgent[agentName].count++;

          // Cost and time tracking
          if (job) {
            stats.totalCost += job.priceInDollars ? parseFloat(job.priceInDollars.toString()) : 0;
            if (job.durationInSeconds) {
              totalProcessingTime += job.durationInSeconds;
              processedCount++;
            }

            // Error tracking
            if (job.status === "FAILED" && job.error) {
              const errorKey = job.error.split("\n")[0].substring(0, 100);
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
        stats.avgProcessingTime =
          processedCount > 0 ? totalProcessingTime / processedCount : 0;

        // Calculate per-agent statistics
        for (const [agentName, agentStats] of Object.entries(stats.byAgent)) {
          const agentEvals = evaluations.filter(
            (e) => e.agentVersion.agent.id === agentName
          );
          const grades = agentEvals
            .map((e) => e.grade)
            .filter((g): g is number => g !== null);

          if (grades.length > 0) {
            agentStats.avgGrade =
              grades.reduce((a: number, b: number) => a + b, 0) / grades.length;
          }

          const failedCount = agentEvals.filter(
            (e) => e.job?.status === "FAILED"
          ).length;
          agentStats.failureRate =
            agentStats.count > 0 ? (failedCount / agentStats.count) * 100 : 0;
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
          evaluations: [] as Array<{
            jobId: string;
            documentTitle: string;
            status: string;
            grade?: number | null;
            error?: string | null;
            duration?: number | null;
          }>,
        };

        let totalGrades = 0;
        let gradeCount = 0;

        for (const job of batch.jobs) {
          const evalVersion = job.evaluation.versions[0];

          if (job.status === "COMPLETED") {
            results.completedCount++;
            if (
              evalVersion?.grade !== null &&
              evalVersion?.grade !== undefined
            ) {
              totalGrades += evalVersion.grade;
              gradeCount++;
            }
          } else if (job.status === "FAILED") {
            results.failedCount++;
          } else {
            results.pendingCount++;
          }

          results.totalCost += job.priceInDollars ? parseFloat(job.priceInDollars.toString()) : 0;

          results.evaluations.push({
            jobId: job.id,
            documentTitle:
              job.evaluation.document.versions?.[0]?.title || "Untitled",
            status: job.status,
            grade: evalVersion?.grade,
            error: job.error,
            duration: job.durationInSeconds,
          });
        }

        results.successRate =
          batch.jobs.length > 0
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

        const [pendingJobs, runningJobs, recentCompleted, recentFailed] =
          await Promise.all([
            prisma.job.count({ where: { status: "PENDING" } }),
            prisma.job.count({ where: { status: "RUNNING" } }),
            prisma.job.findMany({
              where: { status: "COMPLETED" },
              take: 10,
              orderBy: { completedAt: "desc" },
              include: includeDetails
                ? {
                    evaluation: {
                      include: {
                        agent: true,
                        document: true,
                      },
                    },
                  }
                : undefined,
            }),
            prisma.job.findMany({
              where: { status: "FAILED" },
              take: 10,
              orderBy: { updatedAt: "desc" },
              include: includeDetails
                ? {
                    evaluation: {
                      include: {
                        agent: true,
                        document: true,
                      },
                    },
                  }
                : undefined,
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
          (queueStatus as any).recentCompleted = recentCompleted.map((job) => ({
            id: job.id,
            completedAt: job.completedAt,
            duration: job.durationInSeconds,
            cost: job.priceInDollars ? parseFloat(job.priceInDollars.toString()) : 0,
            agent: (job as any).evaluation?.agent?.id,
            document: (job as any).evaluation?.document?.id,
          }));

          (queueStatus as any).recentFailed = recentFailed.map((job) => ({
            id: job.id,
            failedAt: job.updatedAt,
            error: job.error?.split("\n")[0],
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

      case "create_agent_version": {
        const args = CreateAgentVersionArgsSchema.parse(
          request.params.arguments
        );

        try {
          if (!API_KEY) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      error: "No API key configured",
                      instructions:
                        "Set ROAST_MY_POST_MCP_USER_API_KEY environment variable in your MCP server configuration",
                      example: {
                        mcpServers: {
                          "roast-my-post": {
                            env: {
                              DATABASE_URL: "your-database-url",
                              ROAST_MY_POST_MCP_USER_API_KEY:
                                "rmp_your-api-key-here",
                            },
                          },
                        },
                      },
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          // Use the agent update endpoint through the API
          const agentData = {
            agentId: args.agentId,
            name: args.name,
            description: args.description,
            primaryInstructions: args.primaryInstructions,
            selfCritiqueInstructions: args.selfCritiqueInstructions,
            providesGrades: args.providesGrades || false,
            extendedCapabilityId: args.extendedCapabilityId,
            readme: args.readme,
          };

          // Call the agent creation/update action through API
          const result = await authenticatedFetch("/api/agents", {
            method: "PUT",
            body: JSON.stringify(agentData),
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    agent: result.agent,
                    message: `Successfully created version ${result.agent.version} of agent ${args.agentId}`,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    error:
                      error instanceof Error ? error.message : String(error),
                    hint: "Make sure your API key is valid and has the necessary permissions",
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }
      }

      case "spawn_batch_jobs": {
        const args = SpawnBatchJobsArgsSchema.parse(request.params.arguments);

        try {
          if (!API_KEY) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      error: "No API key configured",
                      instructions:
                        "Set ROAST_MY_POST_MCP_USER_API_KEY environment variable in your MCP server configuration",
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          // Call the batch creation endpoint
          const result = await authenticatedFetch(
            `/api/agents/${args.agentId}/eval-batch`,
            {
              method: "POST",
              body: JSON.stringify({
                name: args.name,
                targetCount: args.targetCount,
              }),
            }
          );

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    batch: result.batch,
                    message: result.message,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    error:
                      error instanceof Error ? error.message : String(error),
                    hint: "Make sure your API key is valid and you own the agent",
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }
      }

      case "import_article": {
        const args = ImportArticleArgsSchema.parse(request.params.arguments);

        try {
          if (!API_KEY) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      error: "No API key configured",
                      instructions:
                        "Set ROAST_MY_POST_MCP_USER_API_KEY environment variable in your MCP server configuration",
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          // Call the import endpoint
          const result = await authenticatedFetch("/api/import", {
            method: "POST",
            body: JSON.stringify({
              url: args.url,
              importUrl: args.url,
              agentIds: args.agentIds,
            }),
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    documentId: result.documentId,
                    document: result.document,
                    evaluations: result.evaluations,
                    message:
                      `Successfully imported article "${result.document.title}"` +
                      (result.evaluations && result.evaluations.length > 0
                        ? ` and created ${result.evaluations.length} evaluation(s)`
                        : ""),
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    error:
                      error instanceof Error ? error.message : String(error),
                    hint: "Make sure the URL is valid and accessible",
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }
      }

      case "update_document": {
        const args = UpdateDocumentArgsSchema.parse(request.params.arguments);

        try {
          if (!API_KEY) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      error: "No API key configured",
                      instructions:
                        "Set ROAST_MY_POST_MCP_USER_API_KEY environment variable in your MCP server configuration",
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          // Call the document update endpoint
          const result = await authenticatedFetch(
            `/api/documents/${args.documentId}`,
            {
              method: "PUT",
              body: JSON.stringify({
                intendedAgentIds: args.intendedAgentIds,
              }),
            }
          );

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    error:
                      error instanceof Error ? error.message : String(error),
                    hint: "Make sure the document ID is valid and you have permission to update it",
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }
      }

      case "get_document": {
        const { documentId, includeStale } = GetDocumentArgsSchema.parse(args);

        try {
          const response = await authenticatedFetch(
            `/api/docs/${documentId}?includeStale=${includeStale || false}`
          );

          if (!response.ok) {
            const errorMsg = response.status === 404 ? 'Document not found' : 
                           response.status === 403 ? 'Access denied' :
                           response.status === 401 ? 'Authentication required' :
                           'Failed to fetch document';
            throw new Error(errorMsg);
          }

          const data = await response.json();
          
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(data, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text", 
                text: `Error fetching document: ${error instanceof Error ? error.message : 'An unexpected error occurred'}`,
              },
            ],
          };
        }
      }

      case "get_evaluation": {
        const { documentId, agentId, includeAllVersions } = GetEvaluationArgsSchema.parse(args);

        try {
          const response = await authenticatedFetch(
            `/api/docs/${documentId}/evals/${agentId}?includeAllVersions=${includeAllVersions}`
          );

          if (!response.ok) {
            const errorMsg = response.status === 404 ? 'Evaluation not found' : 
                           response.status === 403 ? 'Access denied' :
                           response.status === 401 ? 'Authentication required' :
                           'Failed to fetch evaluation';
            throw new Error(errorMsg);
          }

          const data = await response.json();
          
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(data, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error fetching evaluation: ${error instanceof Error ? error.message : 'An unexpected error occurred'}`,
              },
            ],
          };
        }
      }

      case "rerun_evaluation": {
        const { documentId, agentId, reason } = RerunEvaluationArgsSchema.parse(args);

        try {
          const response = await authenticatedFetch(
            `/api/docs/${documentId}/evals/${agentId}/rerun`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ reason }),
            }
          );

          if (!response.ok) {
            const errorMsg = response.status === 404 ? 'Evaluation or agent not found' : 
                           response.status === 403 ? 'You do not have permission to re-run this evaluation' :
                           response.status === 401 ? 'Authentication required' :
                           response.status === 400 ? 'Invalid request' :
                           'Failed to re-run evaluation';
            throw new Error(errorMsg);
          }

          const data = await response.json();
          
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(data, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error re-running evaluation: ${error instanceof Error ? error.message : 'An unexpected error occurred'}`,
              },
            ],
          };
        }
      }

      case "list_document_evaluations": {
        const { documentId, includeStale, agentIds } = ListDocumentEvaluationsArgsSchema.parse(args);

        try {
          const queryParams = new URLSearchParams();
          if (includeStale) queryParams.set('includeStale', 'true');
          if (agentIds && agentIds.length > 0) queryParams.set('agentIds', agentIds.join(','));

          const response = await authenticatedFetch(
            `/api/docs/${documentId}/evaluations?${queryParams.toString()}`
          );

          if (!response.ok) {
            const errorMsg = response.status === 404 ? 'Document not found' : 
                           response.status === 403 ? 'Access denied' :
                           response.status === 401 ? 'Authentication required' :
                           'Failed to list evaluations';
            throw new Error(errorMsg);
          }

          const data = await response.json();
          
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(data, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error listing evaluations: ${error instanceof Error ? error.message : 'An unexpected error occurred'}`,
              },
            ],
          };
        }
      }


      case "verify_setup": {
        // Environment variables
        const databaseUrl = process.env.DATABASE_URL;
        const apiKey = process.env.ROAST_MY_POST_MCP_USER_API_KEY;
        const apiBaseUrl =
          process.env.ROAST_MY_POST_MCP_API_BASE_URL || "http://localhost:3000";

        // Check environment variables
        const envStatus = {
          DATABASE_URL: databaseUrl ? "✓ Set" : "✗ Not set",
          ROAST_MY_POST_MCP_USER_API_KEY: apiKey ? "✓ Set" : "✗ Not set",
          ROAST_MY_POST_MCP_API_BASE_URL: `✓ ${apiBaseUrl}`,
        };

        // Initialize status object
        const setupStatus = {
          environment: envStatus,
          database: {
            configured: !!databaseUrl,
            connected: false,
            error: null as string | null,
          },
          apiKey: {
            configured: !!apiKey,
            valid: false,
            error: null as string | null,
            debug: null as any,
            possibleReasons: null as string[] | null,
          },
          server: {
            reachable: false,
            error: null as string | null,
          },
          setup: {
            complete: false,
            instructions: null as any,
          },
          user: null as any,
        };

        // Test database connection
        if (databaseUrl) {
          try {
            await prisma.$queryRaw`SELECT 1`;
            setupStatus.database.connected = true;
          } catch (error) {
            setupStatus.database.error =
              error instanceof Error ? error.message : String(error);
          }
        } else {
          setupStatus.database.error =
            "DATABASE_URL environment variable not set";
        }

        // Test API key and server connectivity
        if (apiKey) {
          // Add debug info
          setupStatus.apiKey.debug = {
            keyFormat: {
              startsWithRmp: apiKey.startsWith("rmp_"),
              length: apiKey.length,
              validFormat: /^rmp_[A-Za-z0-9_-]+$/.test(apiKey),
            },
            maskedKey: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`,
          };

          // Test server reachability and API key validity
          try {
            const result = await authenticatedFetch("/api/validate-key", {
              method: "GET",
            });
            setupStatus.apiKey.valid = true;
            setupStatus.server.reachable = true;
            setupStatus.user = result.user;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);

            // Determine if it's a connectivity issue or auth issue
            if (
              errorMessage.includes("fetch failed") ||
              errorMessage.includes("ECONNREFUSED")
            ) {
              setupStatus.server.error = `Cannot reach server at ${apiBaseUrl}`;
            } else {
              setupStatus.server.reachable = true;
              setupStatus.apiKey.error = errorMessage;

              if (errorMessage.includes("401")) {
                setupStatus.apiKey.possibleReasons = [
                  "API key format invalid (must start with 'rmp_')",
                  "API key doesn't exist in database",
                  "API key might be expired or revoked",
                ];
              }
            }
          }
        } else {
          setupStatus.apiKey.error =
            "ROAST_MY_POST_MCP_USER_API_KEY environment variable not set";
        }

        // Overall status
        setupStatus.setup.complete =
          setupStatus.database.connected &&
          setupStatus.apiKey.valid &&
          setupStatus.server.reachable;

        // Add instructions if setup is incomplete
        if (!setupStatus.setup.complete) {
          setupStatus.setup.instructions = {
            message: "To complete setup:",
            steps: [],
            example: {
              mcpServers: {
                "roast-my-post": {
                  command: "node",
                  args: ["mcp-server/dist/index.js"],
                  env: {
                    DATABASE_URL:
                      databaseUrl ||
                      "postgresql://user:pass@localhost:5432/roast_my_post",
                    ROAST_MY_POST_MCP_USER_API_KEY:
                      apiKey || "rmp_your-api-key-here",
                    ROAST_MY_POST_MCP_API_BASE_URL: apiBaseUrl,
                  },
                },
              },
            },
          };

          // Add specific steps based on what's missing
          if (!databaseUrl) {
            setupStatus.setup.instructions.steps.push(
              "1. Set DATABASE_URL to your PostgreSQL connection string"
            );
          }
          if (!apiKey) {
            setupStatus.setup.instructions.steps.push(
              "2. Get your API key from Settings page and set ROAST_MY_POST_MCP_USER_API_KEY"
            );
          }
          if (!setupStatus.server.reachable && apiKey) {
            setupStatus.setup.instructions.steps.push(
              "3. Ensure the server is running at " + apiBaseUrl
            );
          }
          setupStatus.setup.instructions.steps.push(
            "4. Restart Claude Code for changes to take effect"
          );
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(setupStatus, null, 2),
            },
          ],
          isError: !setupStatus.setup.complete,
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
    // Log startup configuration for debugging
    console.error("🔧 MCP Server Starting...");
    console.error(`📍 Process ID: ${process.pid}`);
    console.error(`🔑 API Key: ${process.env.ROAST_MY_POST_MCP_USER_API_KEY ? 
      process.env.ROAST_MY_POST_MCP_USER_API_KEY.substring(0, 10) + '...' + 
      process.env.ROAST_MY_POST_MCP_USER_API_KEY.slice(-4) : 
      '❌ NOT SET'}`);
    console.error(`🌐 API URL: ${process.env.ROAST_MY_POST_MCP_API_BASE_URL || '❌ NOT SET'}`);
    console.error(`🗄️  Database: ${process.env.DATABASE_URL ? '✅ Configured' : '❌ NOT SET'}`);

    // Test database connection
    await prisma.$connect();
    console.error("✅ Database connected successfully");

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("🚀 RoastMyPost MCP server running on stdio");

    // Handle stdin EOF when parent process disconnects
    process.stdin.on('end', async () => {
      console.error("📌 Stdin closed, parent disconnected, shutting down...");
      await prisma.$disconnect();
      process.exit(0);
    });

    // Handle stdin errors
    process.stdin.on('error', async (err) => {
      console.error("📌 Stdin error, shutting down:", err.message);
      await prisma.$disconnect();
      process.exit(0);
    });

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      console.error("\n👋 Shutting down MCP server...");
      await prisma.$disconnect();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
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
