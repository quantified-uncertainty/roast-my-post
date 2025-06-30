"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

import { auth } from "@/lib/auth";
import { processArticle } from "@/lib/articleImport";
import { DocumentModel } from "@/models/Document";

export async function deleteDocument(docId: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        error: "User must be logged in to delete a document",
      };
    }

    // Check if the current user is the document owner
    const isOwner = await DocumentModel.checkOwnership(docId, session.user.id);
    if (!isOwner) {
      return {
        success: false,
        error: "You don't have permission to delete this document",
      };
    }

    // Delete the document
    await DocumentModel.delete(docId);

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

    // Check if the current user is the document owner
    const isOwner = await DocumentModel.checkOwnership(docId, session.user.id);
    if (!isOwner) {
      return {
        success: false,
        error: "You don't have permission to re-upload this document",
      };
    }

    // Get the current document to extract its URL
    const document = await DocumentModel.getDocumentWithEvaluations(docId);
    if (!document) {
      return {
        success: false,
        error: "Document not found",
      };
    }

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
    await DocumentModel.update(
      docId,
      {
        title: processedArticle.title,
        authors: processedArticle.author,
        content: processedArticle.content,
        urls: processedArticle.url,
        platforms: processedArticle.platforms.join(", "),
        importUrl: importUrl,
      },
      session.user.id
    );

    // Revalidate the document paths
    revalidatePath(`/docs/${docId}/preview`);
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
