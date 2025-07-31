import { redirect } from "next/navigation";
import { prisma } from "@roast/db";

interface PageProps {
  params: Promise<{ 
    docId: string; 
    agentId: string;
  }>;
}

export default async function VersionsRedirectPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { docId, agentId } = resolvedParams;

  // Get the most recent version
  const latestVersion = await prisma.evaluationVersion.findFirst({
    where: {
      evaluation: {
        documentId: docId,
        agentId: agentId,
      },
    },
    orderBy: {
      version: 'desc',
    },
    select: {
      version: true,
    },
  });

  // Redirect to the latest version, or version 1 if none found
  const versionNumber = latestVersion?.version || 1;
  redirect(`/docs/${docId}/evals/${agentId}/versions/${versionNumber}`);
}