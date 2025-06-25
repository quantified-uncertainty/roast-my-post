import {
  NextRequest,
  NextResponse,
} from "next/server";

import { authenticateRequest } from "@/lib/auth-helpers";
import { logger } from "@/lib/logger";
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
    let processedArticle;
    try {
      processedArticle = await processArticle(url);
    } catch (processError) {
      logger.error('Article processing failed:', processError);
      
      // Provide platform-specific error messages
      if (url.includes("facebook.com")) {
        return errorResponse(
          "Failed to import from Facebook. Facebook often blocks automated content extraction. Please copy and paste the content manually using the 'Submit Text' option.",
          400
        );
      } else if (url.includes("twitter.com") || url.includes("x.com")) {
        return errorResponse(
          "Failed to import from Twitter/X. This platform may block automated content extraction. Please copy and paste the content manually using the 'Submit Text' option.",
          400
        );
      } else if (url.includes("linkedin.com")) {
        return errorResponse(
          "Failed to import from LinkedIn. LinkedIn requires authentication for content access. Please copy and paste the content manually using the 'Submit Text' option.",
          400
        );
      }
      
      // Generic error message
      return errorResponse(
        `Failed to extract content from this URL. The website may be blocking automated access or the content may be behind a paywall. Please try copying and pasting the content manually using the 'Submit Text' option. Error: ${processError instanceof Error ? processError.message : 'Unknown error'}`,
        400
      );
    }

    // Validate content length
    if (!processedArticle.content || processedArticle.content.length < 30) {
      return errorResponse(
        "Article content must be at least 30 characters. The automatic import may not have extracted content properly from this URL. Try copying and pasting the content manually using the 'Submit Text' option.", 
        400
      );
    }

    const wordCount = processedArticle.content.trim().split(/\s+/).length;
    if (wordCount > 50000) {
      return errorResponse(
        `Article content exceeds the maximum limit of 50,000 words (found ${wordCount.toLocaleString()} words). Please use a shorter document or split it into multiple parts.`, 
        400
      );
    }

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
