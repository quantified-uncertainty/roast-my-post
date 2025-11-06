import { logger } from "@/infrastructure/logging/logger";
import { processArticle } from "@/infrastructure/external/articleImport";
import { ValidationError, MAX_DOCUMENT_WORD_COUNT } from '@roast/domain';
import { getServices } from "./ServiceFactory";

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
  agentIds: string[] = [],
  isPrivate: boolean = true
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

    const wordCount = processedArticle.content.trim().split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount > MAX_DOCUMENT_WORD_COUNT) {
      return {
        success: false,
        error: `Article content exceeds the maximum limit of ${MAX_DOCUMENT_WORD_COUNT} words (found ${wordCount} words). Please use a shorter document or split it into multiple parts.`
      };
    }

    // Get services from factory
    const { documentService } = getServices();

    // Creating document using the DocumentService
    const result = await documentService.createDocument(
      userId,
      {
        title: processedArticle.title,
        content: processedArticle.content,
        authors: processedArticle.author,
        url: processedArticle.url,
        platforms: processedArticle.platforms,
        importUrl: url,
        isPrivate,
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
    
    // DocumentService handles evaluation creation when agentIds are provided
    // Return empty array for backward compatibility with existing consumers
    
    return {
      success: true,
      documentId: document.id,
      document: {
        id: document.id,
        title: document.title,
        authors: document.authorName,
      },
      evaluations: [], // Empty for backward compatibility
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