"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { DocumentService } from "@/lib/services/DocumentService";
import { ValidationError } from "@/lib/core/errors";

import { type DocumentInput } from "./schema";

// Initialize service
const documentService = new DocumentService();

export async function createDocument(data: DocumentInput, agentIds: string[] = []) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("User must be logged in to create a document");
    }

    // Create the document using the new DocumentService
    const result = await documentService.createDocument(
      session.user.id,
      {
        title: data.title,
        content: data.content,
        authors: data.authors || "Unknown",
        url: data.urls,
        platforms: data.platforms ? [data.platforms] : [],
        importUrl: data.importUrl
      },
      agentIds
    );

    if (result.isError()) {
      const error = result.error();
      if (error instanceof ValidationError) {
        // Join validation errors into a single message
        throw new Error(error.details?.join('. ') || error.message);
      }
      throw new Error(error?.message || "Failed to create document");
    }

    const document = result.unwrap();

    // Queue evaluations if agents are selected
    if (agentIds.length > 0) {
      // Get the host from the request headers to work with any port
      const { headers } = await import("next/headers");
      const headersList = await headers();
      const host = headersList.get("host");
      
      // Construct the base URL dynamically
      const baseUrl = process.env.NEXTAUTH_URL || 
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
        (host ? `http://${host}` : null);
      
      if (!baseUrl) {
        logger.error('Unable to determine base URL for API call');
      } else {
        const response = await fetch(
          `${baseUrl}/api/documents/${document.id}/evaluate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ agentIds }),
          }
        );

        if (!response.ok) {
          logger.error('Failed to queue evaluations:', await response.text());
        }
      }
    }

    revalidatePath("/docs");
    redirect(`/docs/${document.id}/reader`);
  } catch (error) {
    logger.error('Error creating document:', error);
    throw error;
  }
}
