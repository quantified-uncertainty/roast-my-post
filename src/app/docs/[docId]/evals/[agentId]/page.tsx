import { notFound } from "next/navigation";

import { checkDocumentOwnership } from "@/lib/document-auth";
import { DocumentEvaluationSidebar } from "@/components/DocumentEvaluationSidebar";
import { PageHeader } from "@/components/PageHeader";
import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { EvaluationTabsWrapper } from "@/components/EvaluationTabsWrapper";
import { EvaluationContent } from "@/components/evaluation";
import { getEvaluationForDisplay, extractEvaluationDisplayData } from "@/lib/evaluation/evaluationQueries";




export default async function EvaluationPage({
  params,
}: {
  params: Promise<{ docId: string; agentId: string }>;
}) {
  const resolvedParams = await params;
  const { docId, agentId } = resolvedParams;

  const evaluation = await getEvaluationForDisplay(docId, agentId);

  if (!evaluation) {
    notFound();
  }

  const evaluationData = extractEvaluationDisplayData(evaluation);
  
  // Check if current user owns the document
  const isOwner = await checkDocumentOwnership(docId);


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
          evaluations={evaluationData.allEvaluations}
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
            comments={evaluationData.comments}
            agentName={evaluationData.agentName}
            agentDescription={evaluationData.agentDescription}
            grade={evaluationData.grade}
            ephemeralBatch={evaluationData.ephemeralBatch}
            costInCents={evaluationData.costInCents}
            durationInSeconds={evaluationData.durationInSeconds}
            createdAt={evaluationData.createdAt}
            isStale={evaluationData.isStale}
            showNavigation={true}
            compact={false}
            maxWidth="4xl"
            evaluationData={{ ...evaluation, agentId: evaluationData.agentId }}
            isOnEvalPage={true}
          />
        </div>
        </div>
      </div>
    </div>
  );
}