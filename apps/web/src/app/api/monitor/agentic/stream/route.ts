import { NextRequest } from "next/server";
import { prisma } from "@roast/db";
import { AgenticPlugin } from "@roast/ai/server";
import type { AgenticStreamEvent, AnalysisResult } from "@roast/ai/server";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { isAdmin } from "@/infrastructure/auth/auth";
import { logger } from "@/infrastructure/logging/logger";
import { mkdir, writeFile, rm } from "fs/promises";
import { randomUUID } from "crypto";
import { join } from "path";

const AGENTIC_AGENT_ID = "system-agentic";

interface PersistParams {
  documentId: string;
  documentVersionId: string;
  profileId?: string;
  result: AnalysisResult;
  durationMs: number;
}

async function persistAgenticResult({ documentId, documentVersionId, profileId, result, durationMs }: PersistParams) {
  // Get or create the evaluation for this document + agent
  let evaluation = await prisma.evaluation.findUnique({
    where: {
      documentId_agentId: {
        documentId,
        agentId: AGENTIC_AGENT_ID,
      },
    },
  });

  if (!evaluation) {
    evaluation = await prisma.evaluation.create({
      data: {
        documentId,
        agentId: AGENTIC_AGENT_ID,
      },
    });
  }

  // Get the next version number
  const lastVersion = await prisma.evaluationVersion.findFirst({
    where: { evaluationId: evaluation.id },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (lastVersion?.version ?? 0) + 1;

  // Get the current agent version
  const agentVersion = await prisma.agentVersion.findFirst({
    where: { agentId: AGENTIC_AGENT_ID },
    orderBy: { version: "desc" },
    select: { id: true },
  });

  if (!agentVersion) {
    logger.warn("No agent version found for agentic agent, skipping persistence");
    return null;
  }

  // Fetch profile name if profileId provided
  let profileName: string | null = null;
  if (profileId) {
    const profile = await prisma.pluginProfile.findUnique({
      where: { id: profileId },
      select: { name: true },
    });
    profileName = profile?.name ?? null;
  }

  // Build pipeline telemetry (merge with plugin's telemetry)
  const pluginTelemetry = result.pipelineTelemetry ?? {};
  const pipelineTelemetry = {
    costUsd: result.cost ?? 0,
    profileId: profileId ?? null,
    profileName: profileName ?? "Default",
    analysisType: "agentic",
    durationMs,
    numTurns: (pluginTelemetry as { numTurns?: number }).numTurns ?? 0,
  };

  // Create the evaluation version
  const evalVersion = await prisma.evaluationVersion.create({
    data: {
      evaluationId: evaluation.id,
      agentId: AGENTIC_AGENT_ID,
      agentVersionId: agentVersion.id,
      documentVersionId,
      version: nextVersion,
      summary: result.summary ?? null,
      analysis: result.analysis ?? null,
      grade: result.grade ?? null,
      pipelineTelemetry,
    },
  });

  // Create comments with highlights
  for (const comment of result.comments) {
    const highlight = await prisma.evaluationHighlight.create({
      data: {
        startOffset: comment.highlight.startOffset,
        endOffset: comment.highlight.endOffset,
        prefix: comment.highlight.prefix ?? null,
        quotedText: comment.highlight.quotedText ?? "",
        isValid: comment.highlight.isValid ?? true,
        error: comment.highlight.error ?? null,
      },
    });

    await prisma.evaluationComment.create({
      data: {
        evaluationVersionId: evalVersion.id,
        highlightId: highlight.id,
        header: comment.header ?? null,
        description: comment.description,
        level: comment.level ?? "info",
        source: comment.source ?? null,
        importance: comment.importance ?? null,
        grade: comment.grade ?? null,
        metadata: comment.metadata ?? undefined,
      },
    });
  }

  return evalVersion.id;
}

export async function POST(request: NextRequest) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return commonErrors.unauthorized();
  }

  const adminCheck = await isAdmin();
  if (!adminCheck) {
    return commonErrors.forbidden();
  }

  let body: { documentId: string; profileId?: string };
  try {
    body = await request.json();
  } catch {
    return commonErrors.badRequest("Invalid JSON body");
  }

  if (!body.documentId || typeof body.documentId !== "string") {
    return commonErrors.badRequest("documentId is required");
  }

  // Fetch latest document version
  const document = await prisma.document.findUnique({
    where: { id: body.documentId },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 1,
        select: { id: true, content: true, markdownPrepend: true, title: true },
      },
    },
  });

  if (!document || document.versions.length === 0) {
    return commonErrors.notFound("Document not found or has no versions");
  }

  const version = document.versions[0];
  const fullContent = version.markdownPrepend
    ? `${version.markdownPrepend}\n\n${version.content}`
    : version.content;

  // Create temp workspace for agents to read/write
  const workspaceId = randomUUID();
  const workspacePath = join("/tmp", `agentic-${workspaceId}`);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function sendEvent(event: AgenticStreamEvent | Record<string, any>) {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          // Stream may have been closed by client
        }
      }

      // Set up workspace with document
      try {
        await mkdir(workspacePath, { recursive: true });
        await mkdir(join(workspacePath, "findings"), { recursive: true });
        await writeFile(join(workspacePath, "document.md"), fullContent, "utf-8");
        await writeFile(
          join(workspacePath, "metadata.json"),
          JSON.stringify({ title: version.title, documentId: body.documentId }, null, 2),
          "utf-8"
        );
        logger.info(`Created workspace at ${workspacePath}`);
      } catch (err) {
        logger.error("Failed to create workspace:", err);
        sendEvent({ type: "error", message: "Failed to create analysis workspace" });
        controller.close();
        return;
      }

      const plugin = new AgenticPlugin({
        onMessage: (event: AgenticStreamEvent) => sendEvent(event),
        maxBudgetUsd: 2.0,
        profileId: body.profileId,
        workspacePath, // Pass workspace path to plugin
      });

      try {
        sendEvent({ type: "status", message: `Analyzing: ${version.title}` });

        const startTime = Date.now();
        const result = await plugin.analyze([], fullContent);
        const durationMs = Date.now() - startTime;

        // Persist the result to the database
        let evaluationVersionId: string | null = null;
        try {
          evaluationVersionId = await persistAgenticResult({
            documentId: body.documentId,
            documentVersionId: version.id,
            profileId: body.profileId,
            result,
            durationMs,
          });
        } catch (persistError) {
          logger.error("Failed to persist agentic result:", persistError);
          // Continue - we still want to return the result even if persistence fails
        }

        sendEvent({
          type: "complete",
          evaluationVersionId,
          summary: result.summary ?? "",
          grade: result.grade ?? 0,
          cost: result.cost ?? 0,
          commentCount: result.comments.length,
          comments: result.comments.map((c) => ({
            header: c.header ?? null,
            description: c.description,
            level: c.level ?? "info",
            source: c.source ?? null,
            highlight: c.highlight,
          })),
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("Agentic stream error:", error instanceof Error ? error : new Error(errorMessage));
        sendEvent({ type: "error", message: errorMessage });
      } finally {
        // Clean up workspace
        try {
          await rm(workspacePath, { recursive: true, force: true });
          logger.info(`Cleaned up workspace at ${workspacePath}`);
        } catch (cleanupErr) {
          logger.warn(`Failed to clean up workspace: ${cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr)}`);
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
