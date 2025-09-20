import { notFound } from "next/navigation";

import {
  extractEvaluationDisplayData,
  getEvaluationForDisplay,
} from "@/application/workflows/evaluation/evaluationQueries";
import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { DocumentEvaluationSidebar } from "@/components/DocumentEvaluationSidebar";
import { EvaluationContent } from "@/components/evaluation";
import { EvaluationTabsWrapper } from "@/components/EvaluationTabsWrapper";
import { DocEvalPageHeader } from "@/components/DocEvalPageHeader";
import { auth } from "@/infrastructure/auth/auth";

// Note: serializePrismaResult import removed as it's not used in this file

export default async function EvaluationPage({
  params,
}: {
  params: Promise<{ docId: string; agentId: string }>;
}) {
  const resolvedParams = await params;
  const { docId, agentId } = resolvedParams;

  // Get current user for ownership check
  const session = await auth();
  const currentUserId = session?.user?.id;

  // Privacy check is now handled by the layout
  const result = await getEvaluationForDisplay(docId, agentId, currentUserId);

  if (!result.evaluation) {
    notFound();
  }

  const evaluationData = extractEvaluationDisplayData(result);
  const { isOwner } = evaluationData;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      {/* Breadcrumb Navigation - Full Width */}
      <BreadcrumbHeader
        items={[
          { label: evaluationData.documentTitle, href: `/docs/${docId}` },
          { label: evaluationData.agentName },
        ]}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Document/Evaluation Switcher Sidebar */}
        <DocumentEvaluationSidebar
          docId={docId}
          currentAgentId={agentId}
          evaluations={evaluationData.allEvaluations as any}
          isOwner={isOwner}
        />

        <div className="flex-1 overflow-y-auto">
          {/* Full-width Header */}
          <DocEvalPageHeader
            title={`${evaluationData.agentName} Evaluation`}
            docId={docId}
            agentId={agentId}
            layout="with-sidebar"
            showRerunButton={true}
            showReaderButton={true}
            isOwner={isOwner}
          />

          {/* Tab Navigation */}
          <EvaluationTabsWrapper
            docId={docId}
            agentId={agentId}
            latestVersionNumber={evaluationData.version}
          />

          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <EvaluationContent
              summary={evaluationData.summary}
              analysis={evaluationData.analysis}
              thinking={evaluationData.thinking}
              selfCritique={evaluationData.selfCritique}
              logs={evaluationData.logs}
              comments={evaluationData.comments.map((comment) => ({
                ...comment,
                metadata:
                  (comment.metadata as Record<string, unknown> | null) || null,
              }))}
              agentName={evaluationData.agentName}
              agentDescription={evaluationData.agentDescription}
              grade={evaluationData.grade}
              ephemeralBatch={evaluationData.ephemeralBatch}
              costInCents={
                evaluationData.priceInDollars
                  ? Math.round(evaluationData.priceInDollars * 100)
                  : undefined
              }
              durationInSeconds={evaluationData.durationInSeconds}
              createdAt={evaluationData.createdAt.toISOString()}
              isStale={evaluationData.isStale}
              showNavigation={true}
              compact={false}
              maxWidth="4xl"
              evaluationData={{
                agentId: evaluationData.agentId,
                documentId: evaluationData.documentId,
                evaluationId: evaluationData.evaluationId,
              }}
              isOnEvalPage={true}
              isOwner={isOwner}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
