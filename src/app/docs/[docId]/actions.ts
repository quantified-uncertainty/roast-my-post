"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { DocumentModel } from "@/models/Document";

export async function deleteDocument(docId: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "User must be logged in to delete a document" };
    }

    // Check if the current user is the document owner
    const isOwner = await DocumentModel.checkOwnership(docId, session.user.id);
    if (!isOwner) {
      return { success: false, error: "You don't have permission to delete this document" };
    }

    // Delete the document
    await DocumentModel.delete(docId);

    // Revalidate documents path
    revalidatePath("/docs");
    
    // Return success response (will cause client-side redirect)
    return { success: true, redirectTo: "/docs" };
  } catch (error) {
    console.error("Error deleting document:", error);
    return { success: false, error: "Failed to delete document" };
  }
}