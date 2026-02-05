import { NextRequest } from "next/server";
import { prisma } from "@roast/db";
import { AgenticPlugin } from "@roast/ai/server";
import type { AgenticStreamEvent } from "@roast/ai/server";
import { authenticateRequest } from "@/infrastructure/auth/auth-helpers";
import { commonErrors } from "@/infrastructure/http/api-response-helpers";
import { isAdmin } from "@/infrastructure/auth/auth";
import { logger } from "@/infrastructure/logging/logger";

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
        select: { content: true, markdownPrepend: true, title: true },
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

      const plugin = new AgenticPlugin({
        onMessage: (event: AgenticStreamEvent) => sendEvent(event),
        maxBudgetUsd: 2.0,
        profileId: body.profileId,
      });

      try {
        sendEvent({ type: "status", message: `Analyzing: ${version.title}` });

        const result = await plugin.analyze([], fullContent);

        sendEvent({
          type: "complete",
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
