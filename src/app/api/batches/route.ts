import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth-helpers";
import { z } from "zod";
import { nanoid } from "nanoid";

// Schema for ephemeral agent creation
const ephemeralAgentSchema = z.object({
  name: z.string().min(1).max(100),
  primaryInstructions: z.string().min(1).max(10000),
  selfCritiqueInstructions: z.string().optional(),
  providesGrades: z.boolean().optional(),
  description: z.string().optional(),
});

// Schema for ephemeral document creation
const ephemeralDocumentSchema = z.object({
  urls: z.array(z.string().url()).optional(),
  inline: z.array(z.object({
    title: z.string().min(1),
    content: z.string().min(1),
    author: z.string().optional(),
  })).optional(),
});

// Main request schema
const createBatchSchema = z.object({
  // Existing fields
  agentId: z.string().optional(),
  targetCount: z.number().int().min(1).max(100).optional(),
  documentIds: z.array(z.string()).optional(),
  name: z.string().optional(),
  
  // New experiment fields
  trackingId: z.string().optional(),
  description: z.string().optional(),
  isEphemeral: z.boolean().optional(),
  expiresInDays: z.number().int().min(1).max(90).optional(),
  
  // Ephemeral resource creation
  ephemeralAgent: ephemeralAgentSchema.optional(),
  ephemeralDocuments: ephemeralDocumentSchema.optional(),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await authenticateRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = createBatchSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Validate that we have either agentId or ephemeralAgent
    if (!data.agentId && !data.ephemeralAgent) {
      return NextResponse.json(
        { error: "Must specify either agentId or ephemeralAgent" },
        { status: 400 }
      );
    }

    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      let agentId = data.agentId;
      let ephemeralAgentId: string | undefined;

      // Create ephemeral agent if needed
      if (data.ephemeralAgent) {
        const ephemeralAgent = await tx.agent.create({
          data: {
            id: `exp_agent_${nanoid(12)}`,
            submittedById: userId,
            // Will link to batch after batch creation
          },
        });

        // Create the first version of the agent
        await tx.agentVersion.create({
          data: {
            agentId: ephemeralAgent.id,
            version: 1,
            name: data.ephemeralAgent.name,
            description: data.ephemeralAgent.description || "",
            primaryInstructions: data.ephemeralAgent.primaryInstructions,
            selfCritiqueInstructions: data.ephemeralAgent.selfCritiqueInstructions,
            providesGrades: data.ephemeralAgent.providesGrades || false,
          },
        });

        agentId = ephemeralAgent.id;
        ephemeralAgentId = ephemeralAgent.id;
      }

      // Validate agent access if using existing agent
      if (data.agentId) {
        const agent = await tx.agent.findUnique({
          where: { id: data.agentId },
        });

        if (!agent) {
          throw new Error("Agent not found");
        }

        if (agent.submittedById !== userId) {
          throw new Error("Forbidden");
        }
      }

      // Calculate expiration date if ephemeral
      const expiresAt = data.isEphemeral && data.expiresInDays
        ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined;

      // Generate trackingId if not provided but is ephemeral
      const trackingId = data.isEphemeral 
        ? (data.trackingId || `exp_${nanoid(8)}`)
        : data.trackingId;

      // Create the batch
      const batch = await tx.agentEvalBatch.create({
        data: {
          name: data.name,
          agentId: agentId!,
          targetCount: data.targetCount,
          requestedDocumentIds: data.documentIds || [],
          userId,
          trackingId,
          description: data.description,
          expiresAt,
          isEphemeral: data.isEphemeral || false,
        },
      });

      // Link ephemeral agent to batch if created
      if (ephemeralAgentId) {
        await tx.agent.update({
          where: { id: ephemeralAgentId },
          data: { ephemeralBatchId: batch.id },
        });
      }

      // Handle ephemeral documents
      const ephemeralDocumentIds: string[] = [];
      if (data.ephemeralDocuments) {
        // Import from URLs
        if (data.ephemeralDocuments.urls) {
          // TODO: Implement URL import logic
          // For now, we'll skip this and implement in a separate PR
        }

        // Create inline documents
        if (data.ephemeralDocuments.inline) {
          for (const doc of data.ephemeralDocuments.inline) {
            const document = await tx.document.create({
              data: {
                id: `exp_doc_${nanoid(12)}`,
                publishedDate: new Date(),
                submittedById: userId,
                ephemeralBatchId: batch.id,
              },
            });

            await tx.documentVersion.create({
              data: {
                documentId: document.id,
                version: 1,
                title: doc.title,
                content: doc.content,
                authors: doc.author ? [doc.author] : [],
                urls: [],
                platforms: ["ephemeral"],
                intendedAgents: [agentId!],
              },
            });

            ephemeralDocumentIds.push(document.id);
          }
        }
      }

      // Determine which documents to use
      let documentsToProcess: string[] = [];
      
      if (data.documentIds) {
        documentsToProcess = data.documentIds;
      } else if (ephemeralDocumentIds.length > 0) {
        documentsToProcess = ephemeralDocumentIds;
      } else if (data.targetCount) {
        // Find random documents with evaluations for this agent
        const existingDocs = await tx.document.findMany({
          where: {
            evaluations: {
              some: {
                agentId: agentId!,
              },
            },
          },
          select: { id: true },
          take: data.targetCount,
        });
        
        documentsToProcess = existingDocs.map(d => d.id);
      }

      // Create evaluations and jobs for each document
      const jobsToCreate = [];
      
      for (const documentId of documentsToProcess) {
        // Check if evaluation exists
        let evaluation = await tx.evaluation.findFirst({
          where: {
            documentId,
            agentId: agentId!,
          },
        });

        // Create evaluation if it doesn't exist
        if (!evaluation) {
          evaluation = await tx.evaluation.create({
            data: {
              documentId,
              agentId: agentId!,
            },
          });
        }

        jobsToCreate.push({
          evaluationId: evaluation.id,
          agentEvalBatchId: batch.id,
        });
      }

      // Create all jobs
      if (jobsToCreate.length > 0) {
        await tx.job.createMany({
          data: jobsToCreate,
        });
      }

      // Return the batch with counts
      return await tx.agentEvalBatch.findUnique({
        where: { id: batch.id },
        include: {
          agent: {
            select: {
              id: true,
              ephemeralBatchId: true,
            },
          },
          _count: {
            select: {
              jobs: true,
              ephemeralDocuments: true,
            },
          },
        },
      });
    });

    // Format response
    const response = {
      batch: {
        id: result?.id,
        trackingId: result?.trackingId,
        trackingUrl: result?.trackingId ? `/experiments/${result.trackingId}` : undefined,
        expiresAt: result?.expiresAt,
        isEphemeral: result?.isEphemeral,
        jobCount: result?._count.jobs || 0,
      },
      agent: {
        id: result?.agent.id,
        isEphemeral: !!result?.agent.ephemeralBatchId,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    logger.error('Error creating batch:', error);
    
    if (error instanceof Error) {
      if (error.message === "Agent not found") {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    
    return NextResponse.json(
      { error: "Failed to create batch" },
      { status: 500 }
    );
  }
}

// GET endpoint for listing batches with experiment filtering
export async function GET(request: NextRequest) {
  try {
    const userId = await authenticateRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "experiment", "regular", or null for all
    const includeExpired = searchParams.get("includeExpired") === "true";
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: any = {
      userId,
    };

    if (type === "experiment") {
      where.isEphemeral = true;
    } else if (type === "regular") {
      where.isEphemeral = false;
    }

    if (!includeExpired) {
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ];
    }

    const [batches, total] = await Promise.all([
      prisma.agentEvalBatch.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          agent: {
            select: {
              id: true,
              versions: {
                orderBy: { version: "desc" },
                take: 1,
                select: {
                  name: true,
                },
              },
            },
          },
          jobs: {
            select: {
              status: true,
            },
          },
        },
      }),
      prisma.agentEvalBatch.count({ where }),
    ]);

    // Format response
    const formattedBatches = batches.map(batch => ({
      id: batch.id,
      name: batch.name,
      trackingId: batch.trackingId,
      description: batch.description,
      isEphemeral: batch.isEphemeral,
      expiresAt: batch.expiresAt,
      createdAt: batch.createdAt,
      agent: {
        id: batch.agent.id,
        name: batch.agent.versions[0]?.name || "Unknown",
      },
      jobStats: {
        total: batch.jobs.length,
        completed: batch.jobs.filter(j => j.status === "COMPLETED").length,
        failed: batch.jobs.filter(j => j.status === "FAILED").length,
        running: batch.jobs.filter(j => j.status === "RUNNING").length,
        pending: batch.jobs.filter(j => j.status === "PENDING").length,
      },
    }));

    return NextResponse.json({
      batches: formattedBatches,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Error fetching batches:', error);
    return NextResponse.json(
      { error: "Failed to fetch batches" },
      { status: 500 }
    );
  }
}