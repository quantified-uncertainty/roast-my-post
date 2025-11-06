"use server";

import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@roast/db";

/**
 * Check if the current user owns a specific document
 */
export async function checkDocumentOwnership(
  documentId: string
): Promise<boolean> {
  const session = await auth();

  if (!session?.user?.id) {
    return false;
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { submittedById: true },
  });

  return document?.submittedById === session.user.id;
}
