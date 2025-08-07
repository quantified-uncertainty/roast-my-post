import { logger } from "@/lib/logger";
import { processArticle } from "@/lib/articleImport";
import { DocumentService } from "@/lib/services/DocumentService";
import { ValidationError } from "@/lib/core/errors";
import { prisma } from "@roast/db";

export interface ImportDocumentResult {
  success: boolean;
  documentId?: string;
  document?: {
    id: string;
    title: string;
    authors: string;
  };
  evaluations?: Array<{
    evaluationId: string;
    agentId: string;
    jobId: string;
  }>;
  error?: string;
}

export async function importDocumentService(
  url: string,
  userId: string,
  agentIds: string[] = []
): Promise<ImportDocumentResult> {
  try {
    logger.info(`🔄 Starting article import for URL: ${url}`);
    
    // Process the article
    const processedArticle = await processArticle(url);
    logger.info(`✅ Article processing completed`);
    
    // Validate content length
    if (!processedArticle.content || processedArticle.content.length < 30) {
      return {
        success: false,
        error: "Article content must be at least 30 characters. The automatic import may not have extracted content properly from this URL. Try copying and pasting the content manually using the 'Submit Text' option."
      };
    }

    const wordCount = processedArticle.content.trim().split(/\s+/).length;
    if (wordCount > 50000) {
      return {
        success: false,
        error: `Article content exceeds the maximum limit of 50,000 words (found ${wordCount.toLocaleString()} words). Please use a shorter document or split it into multiple parts.`
      };
    }

    // Initialize service
    const documentService = new DocumentService();

    // Creating document using the new DocumentService
    const result = await documentService.createDocument(
      userId,
      {
        title: processedArticle.title,
        content: processedArticle.content,
        authors: processedArticle.author,
        url: processedArticle.url,
        platforms: processedArticle.platforms,
        importUrl: url,
      },
      agentIds
    );

    if (result.isError()) {
      const error = result.error();
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: error.details?.join('. ') || error.message
        };
      }
      return {
        success: false,
        error: error?.message || "Failed to create document"
      };
    }

    const document = result.unwrap();
    
    // Create evaluations and jobs if agentIds are provided
    const createdEvaluations = [];
    if (agentIds && agentIds.length > 0) {
      logger.info(`Creating evaluations for ${agentIds.length} agents`);
      
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
          logger.error(`Failed to create evaluation for agent ${agentId}:`, error);
        }
      }
    }

    return {
      success: true,
      documentId: document.id,
      document: {
        id: document.id,
        title: document.title,
        authors: document.authorName,
      },
      evaluations: createdEvaluations,
    };
  } catch (error) {
    logger.error('Error in importDocumentService:', error);
    
    // Handle platform-specific errors
    if (error instanceof Error) {
      if (error.message.includes("Failed to extract content") || error.message.includes("Failed to fetch")) {
        if (url.includes("facebook.com")) {
          return {
            success: false,
            error: "Failed to import from Facebook. Facebook often blocks automated content extraction. Please copy and paste the content manually using the 'Submit Text' option."
          };
        } else if (url.includes("twitter.com") || url.includes("x.com")) {
          return {
            success: false,
            error: "Failed to import from Twitter/X. This platform may block automated content extraction. Please copy and paste the content manually using the 'Submit Text' option."
          };
        } else if (url.includes("linkedin.com")) {
          return {
            success: false,
            error: "Failed to import from LinkedIn. LinkedIn requires authentication for content access. Please copy and paste the content manually using the 'Submit Text' option."
          };
        }
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to import document"
    };
  }
}