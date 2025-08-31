import { formatDistanceToNow } from "date-fns";
// @ts-expect-error - No types available for markdown-truncate
import truncateMarkdown from "markdown-truncate";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { DocumentActions } from "@/components/DocumentActions";
import { DocumentEvaluationSidebar } from "@/components/DocumentEvaluationSidebar";
import SlateEditor from "@/components/SlateEditor";
import { PageHeader } from "@/components/PageHeader";
import { ExperimentalBadge } from "@/components/ExperimentalBadge";
import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/database/prisma";
import { DocumentModel } from "@/models/Document";
import {
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  LockClosedIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { EvaluationManagement } from "./components/EvaluationManagement";

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
      ephemeralBatchId: null, // Exclude ephemeral agents
    },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return agents.map((agent) => ({
    id: agent.id,
    name: agent.versions[0]?.name || "Unknown Agent",
    description: agent.versions[0]?.description || undefined,
    purpose: undefined,
    isRecommended: agent.isRecommended,
    isDeprecated: agent.isDeprecated,
    isSystemManaged: agent.isSystemManaged,
    providesGrades: agent.versions[0]?.providesGrades || false,
  }));
}

export default async function DocumentPage({
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

  // Use getDocumentWithAllEvaluations to show all evaluations in the sidebar
  // regardless of staleness - users should always see their evaluations
  const document = await DocumentModel.getDocumentWithAllEvaluations(docId, currentUserId);

  if (!document) {
    notFound();
  }

  // Get ephemeral batch information
  const documentWithBatch = await prisma.document.findUnique({
    where: { id: docId },
    select: {
      ephemeralBatch: {
        select: {
          trackingId: true,
          isEphemeral: true,
        },
      },
    },
  });

  const isOwner = currentUserId
    ? document.submittedById === currentUserId
    : false;

  // Get word count from document content
  const wordCount = document.content?.trim().split(/\s+/).length || 0;

  // Calculate file size from content (estimate based on UTF-8 encoding)
  const contentSizeBytes = new TextEncoder().encode(
    document.content || ""
  ).length;
  const fileSizeKB = contentSizeBytes / 1024;
  const fileSize =
    fileSizeKB > 1024
      ? `${(fileSizeKB / 1024).toFixed(1)} MB`
      : `${Math.round(fileSizeKB)} KB`;

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
              status: review.jobs[0].status as
                | "PENDING"
                | "RUNNING"
                | "COMPLETED"
                | "FAILED",
            }
          : undefined,
      })),
      jobs: review.jobs?.map((job) => ({
        status: job.status as "PENDING" | "RUNNING" | "COMPLETED" | "FAILED",
      })),
    })) || [];

  const availableAgents = await getAvailableAgents(docId);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      {/* Full-width breadcrumbs */}
      <BreadcrumbHeader
        items={[
          { label: document.title || "Untitled Document" },
          { label: "Overview" },
        ]}
      />

      {/* Sidebar and content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Document/Evaluation Switcher Sidebar */}
        <DocumentEvaluationSidebar
          docId={docId}
          evaluations={evaluations}
          isOwner={isOwner}
        />

        <div className="flex-1 overflow-y-auto">
          {/* Full-width Header */}
          <PageHeader
            title={document.title || "Untitled Document"}
            subtitle="Document Overview"
          >
            <div className="flex items-center gap-4">
              {documentWithBatch?.ephemeralBatch && (
                <ExperimentalBadge 
                  trackingId={documentWithBatch.ephemeralBatch.trackingId}
                />
              )}
              {isOwner && (
                <DocumentActions
                  docId={docId}
                  document={{ 
                    importUrl: document.importUrl,
                    isPrivate: document.isPrivate 
                  }}
                />
              )}
            </div>
          </PageHeader>

          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Main Content */}
              <div className="lg:col-span-2">
                {/* Document Preview Card */}
                <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-6 text-lg font-semibold text-gray-900">
                    Document Opening
                  </h2>

                  <div className="prose prose-gray max-w-none">
                    {document.content ? (
                      <div className="leading-relaxed text-gray-700">
                        <SlateEditor 
                          content={truncateMarkdown(document.content, {
                            limit: 500,
                            ellipsis: true,
                          })}
                          highlights={[]}
                        />
                      </div>
                    ) : (
                      <p className="italic text-gray-500">
                        No content available
                      </p>
                    )}

                    <p className="mt-4 text-sm text-gray-500">
                      Blog Post • First paragraph preview
                    </p>
                  </div>

                  <div className="mt-6 flex gap-3">
                    {document.importUrl ? (
                      <a
                        href={document.importUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                      >
                        <ArrowTopRightOnSquareIcon className="mr-2 h-4 w-4" />
                        Go to source
                      </a>
                    ) : (
                      <Link
                        href={`/docs/${docId}/reader`}
                        className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                      >
                        <BookOpenIcon className="mr-2 h-4 w-4" />
                        View full document
                      </Link>
                    )}
                    <Link
                      href={`/docs/${docId}/reader`}
                      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <BookOpenIcon className="mr-2 h-4 w-4" />
                      Reader View
                    </Link>
                  </div>
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="lg:col-span-1">
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-6 text-lg font-semibold text-gray-900">
                    Document Information
                  </h2>

                  <dl className="space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Document Title
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {document.title || "Untitled"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Privacy
                      </dt>
                      <dd className="mt-1 flex items-center gap-2 text-sm text-gray-900">
                        {document.isPrivate ? (
                          <>
                            <LockClosedIcon className="h-4 w-4 text-gray-400" />
                            <span>Private</span>
                          </>
                        ) : (
                          <>
                            <GlobeAltIcon className="h-4 w-4 text-gray-400" />
                            <span>Public</span>
                          </>
                        )}
                      </dd>
                    </div>

                    {document.importUrl && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          Blog URL
                        </dt>
                        <dd className="mt-1">
                          <a
                            href={document.importUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all text-sm text-blue-600 hover:text-blue-800"
                          >
                            {document.importUrl}
                          </a>
                        </dd>
                      </div>
                    )}

                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        File Size
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">{fileSize}</dd>
                    </div>

                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Word Count
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {wordCount.toLocaleString()} words
                      </dd>
                    </div>

                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Upload Date
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {formatDistanceToNow(new Date(document.createdAt), {
                          addSuffix: true,
                        })}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Uploaded By
                      </dt>
                      <dd className="mt-1 flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200">
                          <span className="text-xs font-medium text-gray-600">
                            {document.submittedBy?.name
                              ?.charAt(0)
                              ?.toUpperCase() ||
                              document.submittedBy?.email
                                ?.charAt(0)
                                ?.toUpperCase() ||
                              "?"}
                          </span>
                        </div>
                        <span className="text-sm text-gray-900">
                          {document.submittedBy?.name ||
                            document.submittedBy?.email ||
                            "Unknown"}
                        </span>
                      </dd>
                    </div>

                    {document.author && (
                      <div>
                        <dt className="mb-2 text-sm font-medium text-gray-500">
                          Authors
                        </dt>
                        <dd className="space-y-2">
                          {document.author.split(",").map((author, index) => (
                            <div key={index} className="text-sm text-gray-900">
                              {author.trim()}
                            </div>
                          ))}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>

            {/* Evaluation Management Section */}
            <div className="mt-8">
              <EvaluationManagement
                docId={docId}
                evaluations={document.reviews || []}
                availableAgents={availableAgents}
                isOwner={isOwner}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
