import { notFound } from "next/navigation";

import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { DocumentEvaluationSidebar } from "@/components/DocumentEvaluationSidebar";
import { auth } from "@/infrastructure/auth/auth";
import { DocumentModel } from "@/models/Document";

import { ExportClient } from "./ExportClient";

export default async function DocumentExportPage({
  params,
}: {
  params: Promise<{ docId: string }>;
}) {
  const resolvedParams = await params;
  const docId = resolvedParams.docId;
  const session = await auth();
  const currentUserId = session?.user?.id;

  if (!docId) {
    notFound();
  }

  // Use unsafe version since privacy is checked by the layout
  const document =
    await DocumentModel.getDocumentWithAllEvaluationsUnsafe(docId);

  if (!document) {
    notFound();
  }

  const isOwner = currentUserId
    ? document.submittedById === currentUserId
    : false;

  // Transform reviews to match the expected Evaluation interface
  const evaluations =
    document.reviews?.map((review) => ({
      id: review.id,
      agentId: review.agent.id,
      agent: {
        name: review.agent.name,
        versions: [
          {
            name: review.agent.name,
          },
        ],
      },
      versions: review.versions?.map((version) => ({
        grade: version.grade,
        job: review.jobs?.[0]
          ? {
              status: review.jobs[0].status,
            }
          : undefined,
      })),
      jobs: review.jobs?.map((job) => ({
        status: job.status,
      })),
    })) || [];

  return (
    <div className="flex flex-col bg-gray-50">
      {/* Full-width breadcrumbs */}
      <BreadcrumbHeader
        items={[
          { label: document.title || "Untitled Document" },
          { label: "Export" },
        ]}
      />

      {/* Sidebar and content */}
      <div className="flex min-h-0 flex-1">
        {/* Document/Evaluation Switcher Sidebar */}
        <DocumentEvaluationSidebar
          docId={docId}
          evaluations={evaluations}
          isOwner={isOwner}
        />

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-full px-4 py-8 sm:px-6 lg:px-8">
            <ExportClient
              document={{
                id: document.id,
                title: document.title || "Untitled Document",
                content: document.content || "",
                author: document.author,
                platforms: document.platforms,
                url: document.url,
                importUrl: document.importUrl,
                publishedDate: new Date(document.publishedDate),
              }}
              evaluations={
                document.reviews?.map((review) => ({
                  agentId: review.agent.id,
                  agentName: review.agent.name,
                  summary: review.summary,
                  analysis: review.analysis,
                  grade: review.grade,
                  selfCritique: review.selfCritique,
                  comments:
                    review.comments?.map((comment) => ({
                      header: comment.header,
                      description: comment.description,
                      importance: comment.importance,
                      grade: comment.grade,
                      variant: comment.variant,
                      source: comment.source,
                      metadata: comment.metadata,
                      highlight: comment.highlight
                        ? {
                            quotedText: comment.highlight.quotedText,
                            startOffset: comment.highlight.startOffset,
                            endOffset: comment.highlight.endOffset,
                          }
                        : undefined,
                    })) || [],
                })) || []
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
