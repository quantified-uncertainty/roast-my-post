"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/infrastructure/logging/logger";

import { auth } from "@/infrastructure/auth/auth";
import { DocumentModel } from "@/models/Document";

// This is a raw server action without the client wrapper
type DocumentUpdateData = {
  docId: string;
  title?: string;
  authors?: string;
  content: string;
  urls?: string;
  platforms?: string;
  intendedAgents?: string;
  importUrl?: string;
  isPrivate?: boolean;
};

export async function updateDocument(
  formData: FormData | DocumentUpdateData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Handle both FormData and direct object submission
    let docId, data;

    if (formData instanceof FormData) {
      docId = formData.get("docId") as string;
      data = {
        title: formData.get("title") as string,
        authors: formData.get("authors") as string,
        content: formData.get("content") as string,
        urls: formData.get("urls") as string,
        platforms: formData.get("platforms") as string,
        intendedAgents: formData.get("intendedAgents") as string,
        importUrl: formData.get("importUrl") as string,
        isPrivate: formData.get("isPrivate") === "true",
      };
    } else {
      // Handle direct object submission
      ({ docId, ...data } = formData);
    }

    if (!docId) {
      throw new Error("Document ID is required");
    }

    // Validate user session
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("User must be logged in to update a document");
    }

    // Check if the current user is the document owner
    const isOwner = await DocumentModel.checkOwnership(docId, session.user.id);
    if (!isOwner) {
      throw new Error("You don't have permission to update this document");
    }

    // Update the document
    await DocumentModel.update(docId, data, session.user.id);

    // Revalidate the document path
    revalidatePath(`/docs/${docId}`);
    revalidatePath("/docs");

    // Return success
    return { success: true };
  } catch (error) {
    logger.error('Error updating document:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update document",
    };
  }
}
