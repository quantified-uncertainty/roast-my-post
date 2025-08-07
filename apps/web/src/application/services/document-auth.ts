import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/database/prisma";

export async function checkDocumentOwnership(documentId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) {
    return false;
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { submittedById: true }
  });

  return document?.submittedById === session.user.id;
}