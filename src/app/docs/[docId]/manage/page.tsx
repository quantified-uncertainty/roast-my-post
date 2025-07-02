import { notFound } from "next/navigation";

import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { DocumentEvaluationSidebar } from "@/components/DocumentEvaluationSidebar";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DocumentModel } from "@/models/Document";

import { ManagePageClient } from "./ManagePageClient";

async function getAvailableAgents(docId: string) {
  // Get all agents that don't have evaluations for this document yet
  const existingEvaluations = await prisma.evaluation.findMany({
    where: { documentId: docId },
    select: { agentId: true },
  });

  const existingAgentIds = existingEvaluations.map((e) => e.agentId);

  const agents = await prisma.agent.findMany({
    where: {
      id: { notIn: existingAgentIds },
    },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });

  return agents.map((agent) => ({
    id: agent.id,
    name: agent.versions[0]?.name || "Unknown Agent",
    description: agent.versions[0]?.description || undefined,
    purpose: undefined,
  }));
}

export default async function ManageEvaluationsPage({
  params,
}: {
  params: Promise<{ docId: string }>;
}) {
  const resolvedParams = await params;
  const { docId } = resolvedParams;

  const session = await auth();
  const currentUserId = session?.user?.id;

  const document = await DocumentModel.getDocumentWithEvaluations(docId);
  if (!document) {
    notFound();
  }

  const isOwner = currentUserId
    ? document.submittedById === currentUserId
    : false;

  const availableAgents = await getAvailableAgents(docId);
  const documentTitle = document.title || "Untitled Document";

  // Transform reviews to evaluations format for the sidebar
  const evaluations =
    document.reviews?.map((review) => ({
      id: review.id || "",
      agentId: review.agent.id,
      agent: {
        name: review.agent.name,
        versions: [
          {
            name: review.agent.name,
          },
        ],
      },
      versions:
        review.versions?.map((version) => ({
          grade: version.grade,
          job: version.job
            ? {
                status: "COMPLETED" as const,
              }
            : undefined,
        })) || [],
      jobs:
        review.jobs?.map((job) => ({
          status: job.status as "PENDING" | "RUNNING" | "COMPLETED" | "FAILED",
        })) || [],
    })) || [];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      {/* Breadcrumb Navigation */}
      <BreadcrumbHeader
        items={[
          { label: documentTitle, href: `/docs/${docId}` },
          { label: "Eval Dashboard" },
        ]}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <DocumentEvaluationSidebar
          docId={docId}
          evaluations={evaluations}
          isOwner={true}
        />

        <div className="flex-1 overflow-y-auto">
          {/* Page Header */}
          <div className="border-b border-gray-200 bg-white">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="py-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  Eval Dashboard
                </h1>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Client Component for Interactive Parts */}
            <ManagePageClient
              docId={docId}
              evaluations={document.reviews || []}
              availableAgents={availableAgents}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
