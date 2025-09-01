import { notFound } from "next/navigation";

import { auth } from "@/infrastructure/auth/auth";
import { DocumentEvaluationSidebar } from "@/components/DocumentEvaluationSidebar";
import { PageHeader } from "@/components/PageHeader";
import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { EvaluationTabsWrapper } from "@/components/EvaluationTabsWrapper";
import { EvaluationContent } from "@/components/evaluation";
import { getEvaluationForDisplay, extractEvaluationDisplayData } from "@/application/workflows/evaluation/evaluationQueries";
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
    <div className="h-full bg-gray-50 flex flex-col overflow-hidden">
      {/* Breadcrumb Navigation - Full Width */}
      <BreadcrumbHeader 
        items={[
          { label: evaluationData.documentTitle, href: `/docs/${docId}` },
          { label: evaluationData.agentName }
        ]}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Document/Evaluation Switcher Sidebar */}
        <DocumentEvaluationSidebar 
          docId={docId}
          currentAgentId={agentId}
          evaluations={evaluationData.allEvaluations as any}
          isOwner={isOwner}
        />
        
        <div className="flex-1 overflow-y-auto">
          {/* Full-width Header */}
          <PageHeader 
            title={`${evaluationData.agentName} Evaluation`}
            layout="with-sidebar"
          />

          {/* Tab Navigation */}
          <EvaluationTabsWrapper 
            docId={docId} 
            agentId={agentId} 
            latestVersionNumber={evaluationData.version}
          />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <EvaluationContent
            summary={evaluationData.summary}
            analysis={evaluationData.analysis}
            thinking={evaluationData.thinking}
            selfCritique={evaluationData.selfCritique}
            logs={evaluationData.logs}
            comments={evaluationData.comments.map(comment => ({
              ...comment,
              metadata: comment.metadata as Record<string, unknown> | null || null
            }))}
            agentName={evaluationData.agentName}
            agentDescription={evaluationData.agentDescription}
            grade={evaluationData.grade}
            ephemeralBatch={evaluationData.ephemeralBatch}
            costInCents={evaluationData.priceInDollars ? Math.round(evaluationData.priceInDollars * 100) : undefined}
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