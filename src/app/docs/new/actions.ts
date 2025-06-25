"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { DocumentModel } from "@/models/Document";

import { type DocumentInput } from "./schema";

function generateTitleFromContent(content: string): string {
  // Remove markdown formatting
  const plainText = content
    .replace(/#{1,6}\s+/g, '') // Remove headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
    .replace(/`([^`]+)`/g, '$1') // Remove inline code
    .replace(/```[^`]*```/gs, '') // Remove code blocks
    .trim();

  // Get first sentence or first 50 characters
  const firstSentence = plainText.match(/^[^.!?]+[.!?]?/)?.[0] || plainText;
  const title = firstSentence.slice(0, 50).trim();
  
  // Add ellipsis if truncated
  return title.length < firstSentence.length ? `${title}...` : title;
}

export async function createDocument(data: DocumentInput, agentIds: string[] = []) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("User must be logged in to create a document");
    }

    // Backend validation for content length
    if (!data.content || data.content.length < 30) {
      throw new Error("Content must be at least 30 characters");
    }

    const wordCount = data.content.trim().split(/\s+/).length;
    if (wordCount > 50000) {
      throw new Error("Content must not exceed 50,000 words");
    }

    // Generate title from content if not provided
    const title = data.title?.trim() || generateTitleFromContent(data.content);

    // Create the document using the DocumentModel
    const document = await DocumentModel.create({
      ...data,
      title,
      authors: data.authors || "Unknown",
      submittedById: session.user.id,
    });

    // Queue evaluations if agents are selected
    if (agentIds.length > 0) {
      const response = await fetch(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/documents/${document.id}/evaluate`,
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

    revalidatePath("/docs");
    redirect(`/docs/${document.id}`);
  } catch (error) {
    logger.error('Error creating document:', error);
    throw error;
  }
}
