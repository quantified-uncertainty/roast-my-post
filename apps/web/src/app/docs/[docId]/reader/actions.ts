"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/infrastructure/logging/logger";

import { auth } from "@/infrastructure/auth/auth";
import { processArticle } from "@/infrastructure/external/articleImport";
import { NotFoundError, AuthorizationError } from '@roast/domain';
import { getServices } from "@/application/services/ServiceFactory";
import { prisma } from "@/infrastructure/database/prisma";

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
    const { documentService } = getServices();
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
    const { documentService } = getServices();
    const ownershipResult = await documentService.checkOwnership(docId, session.user.id);
    if (ownershipResult.isError()) {
      return {
        success: false,
        error: "You don't have permission to re-upload this document",
      };
    }
    
    if (!ownershipResult.unwrap()) {
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

export async function toggleDocumentPrivacy(docId: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        error: "User must be logged in to change document privacy",
      };
    }

    // Get the document to check ownership and current privacy status
    const document = await prisma.document.findUnique({
      where: { id: docId },
      select: { 
        submittedById: true, 
        isPrivate: true 
      },
    });

    if (!document) {
      return {
        success: false,
        error: "Document not found",
      };
    }

    if (document.submittedById !== session.user.id) {
      return {
        success: false,
        error: "You don't have permission to change this document's privacy",
      };
    }

    // Toggle the privacy status
    await prisma.document.update({
      where: { id: docId },
      data: { isPrivate: !document.isPrivate },
    });

    // Revalidate the document page
    revalidatePath(`/docs/${docId}`);

    return { 
      success: true, 
      isPrivate: !document.isPrivate 
    };
  } catch (error) {
    logger.error("Failed to toggle document privacy", { error, docId });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}
