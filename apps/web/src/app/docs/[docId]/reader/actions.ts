"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

import { auth } from "@/lib/auth";
import { processArticle } from "@/lib/articleImport";
import { DocumentService } from "@/lib/services/DocumentService";
import { NotFoundError, AuthorizationError } from "@/lib/core/errors";

// Initialize service
const documentService = new DocumentService();

export async function deleteDocument(docId: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        error: "User must be logged in to delete a document",
      };
    }

    // Delete the document using the service
    const result = await documentService.deleteDocument(docId, session.user.id);
    
    if (result.isError()) {
      const error = result.error();
      if (error instanceof NotFoundError) {
        return {
          success: false,
          error: "Document not found",
        };
      }
      if (error instanceof AuthorizationError) {
        return {
          success: false,
          error: "You don't have permission to delete this document",
        };
      }
      return {
        success: false,
        error: error?.message || "Failed to delete document",
      };
    }

    // Revalidate documents path
    revalidatePath("/docs");

    // Return success response (will cause client-side redirect)
    return { success: true, redirectTo: "/docs" };
  } catch (error) {
    logger.error('Error deleting document:', error);
    return { success: false, error: "Failed to delete document" };
  }
}

export async function reuploadDocument(docId: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        error: "User must be logged in to re-upload a document",
      };
    }

    // Check ownership using the service
    const ownershipResult = await documentService.checkOwnership(docId, session.user.id);
    if (ownershipResult.isError() || !ownershipResult.unwrap()) {
      return {
        success: false,
        error: "You don't have permission to re-upload this document",
      };
    }

    // Get the current document to extract its URL
    const docResult = await documentService.getDocumentForReader(docId, session.user.id);
    if (docResult.isError()) {
      return {
        success: false,
        error: "Document not found",
      };
    }
    
    const document = docResult.unwrap();
    const importUrl = document.importUrl;
    if (!importUrl) {
      return {
        success: false,
        error: "Document was not imported from a URL and cannot be re-uploaded",
      };
    }

    // Process the article again from the importUrl
    const processedArticle = await processArticle(importUrl);

    // Update the document with the new content
    const updateResult = await documentService.updateDocument(
      docId,
      session.user.id,
      {
        title: processedArticle.title,
        content: processedArticle.content,
      }
    );

    if (updateResult.isError()) {
      const error = updateResult.error();
      return {
        success: false,
        error: error?.message || "Failed to update document",
      };
    }

    // Revalidate the document paths
    revalidatePath(`/docs/${docId}/reader`);
    revalidatePath(`/docs/${docId}`);

    return { success: true };
  } catch (error) {
    logger.error('Error re-uploading document:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to re-upload document" 
    };
  }
}
