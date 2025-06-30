import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EvaluationTabs } from "./EvaluationTabs";
import { RerunButton } from "./RerunButton";
import { JobStatusIndicator } from "./JobStatusIndicator";
import { rerunEvaluation, createOrRerunEvaluation } from "@/app/docs/[docId]/evaluations/actions";

interface EvaluationTabsWrapperProps {
  docId: string;
  agentId: string;
  latestVersionNumber?: number;
}

export async function EvaluationTabsWrapper({ 
  docId, 
  agentId, 
  latestVersionNumber = 1 
}: EvaluationTabsWrapperProps) {
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
      select: { 
        id: true,
        jobs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            status: true
          }
        }
      }
    })
  ]);
  
  const isOwner = session?.user?.id === document?.submittedById;
  const hasExistingEvaluation = !!evaluation;
  const latestJobStatus = evaluation?.jobs?.[0]?.status;

  return (
    <div className="border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <EvaluationTabs 
            docId={docId} 
            agentId={agentId} 
            latestVersionNumber={latestVersionNumber}
          />
          <div className="py-3 flex items-center gap-4">
            {isOwner && latestJobStatus && latestJobStatus !== "COMPLETED" && (
              <JobStatusIndicator status={latestJobStatus} size="md" showLabel />
            )}
            <RerunButton 
              agentId={agentId}
              documentId={docId}
              isOwner={isOwner}
              hasExistingEvaluation={hasExistingEvaluation}
              rerunAction={rerunEvaluation}
              createOrRerunAction={createOrRerunEvaluation}
            />
          </div>
        </div>
      </div>
    </div>
  );
}