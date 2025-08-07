import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/database/prisma";
import { PageHeader } from "./PageHeader";
import { RerunButtonClient } from "./RerunButtonClient";

interface VersionPageHeaderProps {
  title: string;
  layout?: "default" | "with-sidebar";
  docId: string;
  agentId: string;
}

export async function VersionPageHeader({ 
  title, 
  layout = "default",
  docId,
  agentId
}: VersionPageHeaderProps) {
  const session = await auth();
  
  // Check if the user owns this document and get evaluation info
  const [document, evaluation] = await Promise.all([
    prisma.document.findUnique({
      where: { id: docId },
      select: { submittedById: true }
    }),
    prisma.evaluation.findFirst({
      where: {
        documentId: docId,
        agentId: agentId
      },
      select: { id: true }
    })
  ]);
  
  const isOwner = session?.user?.id === document?.submittedById;
  const hasExistingEvaluation = !!evaluation;

  return (
    <PageHeader title={title} layout={layout}>
      <RerunButtonClient 
        agentId={agentId}
        documentId={docId}
        isOwner={isOwner}
        hasExistingEvaluation={hasExistingEvaluation}
      />
    </PageHeader>
  );
}