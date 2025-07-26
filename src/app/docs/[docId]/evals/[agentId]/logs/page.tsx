import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { evaluationWithCurrentJob } from "@/lib/prisma/evaluation-includes";
import { checkDocumentOwnership } from "@/lib/document-auth";
import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { DocumentEvaluationSidebar } from "@/components/DocumentEvaluationSidebar";
import { PageHeader } from "@/components/PageHeader";
import { EvaluationTabsWrapper } from "@/components/EvaluationTabsWrapper";
import { JobSummary, TaskDisplay } from "@/components/job";

interface PageProps {
  params: Promise<{ 
    docId: string; 
    agentId: string;
  }>;
}

export default async function EvaluationLogsPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { docId, agentId } = resolvedParams;

  // Fetch evaluation and job data
  const evaluation = await prisma.evaluation.findFirst({
    where: {
      documentId: docId,
      agentId: agentId,
    },
    include: evaluationWithCurrentJob,
  });

  if (!evaluation) {
    notFound();
  }

  const agentName = evaluation.agent.versions[0]?.name || "Unknown Agent";
  const documentTitle = evaluation.document.versions[0]?.title || "Untitled Document";
  const allEvaluations = evaluation.document.evaluations || [];
  
  // Check if current user owns the document
  const isOwner = await checkDocumentOwnership(docId);
  
  // Get the current version and its job
  const currentVersion = evaluation.versions[0];
  const currentJob = currentVersion?.job;
  
  if (!currentVersion || !currentJob) {
    return (
      <div className="h-full bg-gray-50 flex flex-col overflow-hidden">
        <BreadcrumbHeader 
          items={[
            { label: documentTitle, href: `/docs/${docId}` },
            { label: agentName, href: `/docs/${docId}/evals/${agentId}` },
            { label: 'Logs' }
          ]}
        />
        <div className="flex-1 flex overflow-hidden">
          <DocumentEvaluationSidebar 
            docId={docId}
            currentAgentId={agentId}
            evaluations={allEvaluations}
            isOwner={isOwner}
          />
          <div className="flex-1 overflow-y-auto">
            <PageHeader 
              title={`${agentName} Evaluation`}
              layout="with-sidebar"
            />
            <EvaluationTabsWrapper docId={docId} agentId={agentId} />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <p className="text-gray-500">No job data available for the current evaluation version.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 flex flex-col overflow-hidden">
      {/* Breadcrumb Navigation - Full Width */}
      <BreadcrumbHeader 
        items={[
          { label: documentTitle, href: `/docs/${docId}` },
          { label: agentName, href: `/docs/${docId}/evals/${agentId}` },
          { label: 'Logs' }
        ]}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Document/Evaluation Switcher Sidebar */}
        <DocumentEvaluationSidebar 
          docId={docId}
          currentAgentId={agentId}
          evaluations={allEvaluations}
          isOwner={isOwner}
        />
        
        <div className="flex-1 overflow-y-auto">
          {/* Full-width Header */}
          <PageHeader 
            title={`${agentName} Evaluation`}
            layout="with-sidebar"
          />

          {/* Tab Navigation */}
          <EvaluationTabsWrapper 
            docId={docId} 
            agentId={agentId} 
            latestVersionNumber={currentVersion?.version || 1}
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Job Details</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Current evaluation job (version {currentVersion.version})
                </p>
              </div>
              
              <div className="px-6 py-6">
                <JobSummary 
                  job={{
                    id: currentJob.id,
                    status: currentJob.status,
                    createdAt: currentJob.createdAt,
                    completedAt: currentJob.completedAt,
                    startedAt: currentJob.startedAt,
                    durationInSeconds: currentJob.durationInSeconds,
                    costInCents: currentJob.costInCents,
                    attempts: currentJob.attempts,
                    originalJobId: currentJob.originalJobId,
                    error: currentJob.error,
                    logs: currentJob.logs || undefined
                  }}
                  showLogs={true}
                />

                {/* Task Details */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasks</h3>
                  <TaskDisplay 
                    tasks={(currentJob.tasks || []).map(task => ({
                      ...task,
                      priceInDollars: Number(task.priceInDollars)
                    }))} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

