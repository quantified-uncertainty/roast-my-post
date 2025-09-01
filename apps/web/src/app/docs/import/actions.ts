"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { importDocumentService } from "@/application/services/documentImport";
import { logger } from "@/infrastructure/logging/logger";

export async function importDocument(url: string, agentIds: string[] = [], isPrivate: boolean = true) {
  try {
    // Get the current user session
    const session = await auth();
    
    if (!session?.user?.id) {
      throw new Error("User must be logged in to import a document");
    }
    
    // Use the shared import service with privacy setting
    const result = await importDocumentService(url, session.user.id, agentIds, isPrivate);
    
    if (!result.success) {
      throw new Error(result.error || "Failed to import document");
    }

    revalidatePath("/docs");
    redirect(`/docs/${result.documentId}/reader`);
  } catch (error) {
    logger.error('❌ Error importing document:', error);
    throw error;
  }
}
