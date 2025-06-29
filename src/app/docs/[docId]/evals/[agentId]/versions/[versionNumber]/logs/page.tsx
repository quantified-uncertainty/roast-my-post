import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { DocumentEvaluationSidebar } from "@/components/DocumentEvaluationSidebar";
import { EvaluationVersionSidebar } from "@/components/EvaluationVersionSidebar";
import { PageHeader } from "@/components/PageHeader";
import { VersionTabs } from "@/components/VersionTabs";
import { TaskDisplayClient } from "./TaskDisplayClient";

interface PageProps {
  params: Promise<{ 
    docId: string; 
    agentId: string;
    versionNumber: string;
  }>;
}


export default async function VersionLogsPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { docId, agentId, versionNumber } = resolvedParams;
  const versionNum = parseInt(versionNumber);

  if (!docId || !agentId || isNaN(versionNum)) {
    notFound();
  }

  // Fetch the evaluation with all versions
  const evaluation = await prisma.evaluation.findFirst({
    where: {
      documentId: docId,
      agentId: agentId,
    },
    include: {
      document: {
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 1,
          },
          evaluations: {
            include: {
              agent: {
                include: {
                  versions: {
                    orderBy: { version: 'desc' },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
      agent: {
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      },
      versions: {
        orderBy: { version: 'desc' },
        include: {
          job: {
            include: {
              tasks: {
                orderBy: { createdAt: 'asc' },
              },
            },
          },
        },
      },
    },
  });

  if (!evaluation) {
    notFound();
  }

  // Find the specific version
  const selectedVersion = evaluation.versions.find(v => v.version === versionNum);
  
  if (!selectedVersion || !selectedVersion.job) {
    notFound();
  }

  const job = selectedVersion.job;
  const agentName = evaluation.agent.versions[0]?.name || "Unknown Agent";
  const documentTitle = evaluation.document.versions[0]?.title || "Untitled Document";
  
  // Get all evaluations for the sidebar
  const allEvaluations = evaluation.document.evaluations || [];

  return (
    <div className="h-full bg-gray-50 flex flex-col overflow-hidden">
      {/* Breadcrumb Navigation - Full Width */}
      <BreadcrumbHeader 
        documentTitle={documentTitle}
        agentName={agentName}
        versionNumber={versionNum}
        isLogsPage={true}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Document/Evaluation Switcher Sidebar */}
        <DocumentEvaluationSidebar 
          docId={docId}
          currentAgentId={agentId}
          evaluations={allEvaluations}
        />
        
        {/* Version Sidebar */}
        <EvaluationVersionSidebar
          docId={docId}
          agentId={agentId}
          versions={evaluation.versions}
          currentVersion={versionNum}
        />
        
        <div className="flex-1 overflow-y-auto">
          {/* Full-width Header */}
          <PageHeader 
            title={`${agentName} Evaluation (v${versionNum})`}
            layout="with-sidebar"
          />

          {/* Tab Navigation */}
          <VersionTabs docId={docId} agentId={agentId} versionNumber={versionNum} />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Job Details</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Execution details for version {versionNum}
                </p>
              </div>
              
              <div className="px-6 py-6">
                {/* Job Status and Basic Info */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Status</h3>
                    <span className={cn(
                      "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
                      job.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                      job.status === 'FAILED' ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'
                    )}>
                      {job.status.toLowerCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Job ID</h3>
                    <p className="text-sm text-gray-900 font-mono">{job.id}</p>
                  </div>
                </div>

                {/* Error Message */}
                {job.error && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Error</h3>
                    <div className="p-3 bg-red-50 rounded-md">
                      <p className="text-sm text-red-800">{job.error}</p>
                    </div>
                  </div>
                )}

                {/* Task Details */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasks</h3>
                  <TaskDisplayClient tasks={job.tasks || []} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}