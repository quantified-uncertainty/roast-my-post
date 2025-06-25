import {
  NextRequest,
  NextResponse,
} from "next/server";

import { authenticateRequest } from "@/lib/auth-helpers";
import { processArticle } from "@/lib/articleImport";
import { DocumentModel } from "@/models/Document";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse, commonErrors } from "@/lib/api-response-helpers";


export async function POST(request: NextRequest) {
  try {
    // Authenticate request (API key first, then session)
    const userId = await authenticateRequest(request);

    if (!userId) {
      return errorResponse("User must be logged in to import a document", 401);
    }

    const { url, importUrl, agentIds } = await request.json();
    if (!url) {
      return commonErrors.badRequest("URL is required");
    }

    // Validate agentIds if provided
    if (agentIds && !Array.isArray(agentIds)) {
      return commonErrors.badRequest("agentIds must be an array");
    }

    // Use the shared article processing library
    const processedArticle = await processArticle(url);

    const documentData = {
      title: processedArticle.title,
      authors: processedArticle.author,
      content: processedArticle.content,
      urls: processedArticle.url,
      platforms: processedArticle.platforms.join(", "),
      importUrl: importUrl || url,
    };

    // Creating document
    const document = await DocumentModel.create({
      ...documentData,
      submittedById: userId,
    });

    const latestVersion = document.versions[document.versions.length - 1];
    
    // Create evaluations and jobs if agentIds are provided
    const createdEvaluations = [];
    if (agentIds && agentIds.length > 0) {
      // Creating evaluations for agents
      
      for (const agentId of agentIds) {
        try {
          // Create evaluation and job in a transaction
          const result = await prisma.$transaction(async (tx) => {
            // Create the evaluation
            const evaluation = await tx.evaluation.create({
              data: {
                documentId: document.id,
                agentId: agentId,
              },
            });

            // Create the job
            const job = await tx.job.create({
              data: {
                evaluationId: evaluation.id,
              },
            });

            return { evaluation, job };
          });

          createdEvaluations.push({
            evaluationId: result.evaluation.id,
            agentId: agentId,
            jobId: result.job.id,
          });
        } catch (error) {
          // Failed to create evaluation for agent
        }
      }
    }

    return successResponse({
      success: true,
      documentId: document.id,
      document: {
        id: document.id,
        title: latestVersion.title,
        authors: latestVersion.authors,
      },
      evaluations: createdEvaluations,
    });
  } catch (error) {
    // Error importing document
    return errorResponse(
      error instanceof Error ? error.message : "Failed to import document",
      500
    );
  }
}
