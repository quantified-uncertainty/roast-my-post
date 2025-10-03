import { formatDistanceToNow } from "date-fns";
import { BookOpen } from "lucide-react";
// @ts-expect-error - No types available for markdown-truncate
import truncateMarkdown from "markdown-truncate";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { DocumentActions } from "@/components/DocumentActions";
import {
  DocumentEvaluationSidebar,
} from "@/components/DocumentEvaluationSidebar";
import SlateEditor from "@/components/SlateEditor";
import { Button } from "@/components/ui/button";
import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/database/prisma";
import { generateDocumentMetadata } from "@/lib/document-metadata";
import { DocumentModel } from "@/models/Document";

import { EvaluationManagement } from "./components/EvaluationManagement";
import { PrivacySection } from "./components/PrivacySection";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ docId: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  return generateDocumentMetadata(resolvedParams.docId);
}

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

  // Use unsafe version since privacy is checked by the layout
  // Show all evaluations in the sidebar regardless of staleness
  const document =
    await DocumentModel.getDocumentWithAllEvaluationsUnsafe(docId);

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
              status: review.jobs[0].status,
            }
          : undefined,
      })),
      jobs: review.jobs?.map((job) => ({
        status: job.status,
      })),
    })) || [];

  const availableAgents = await getAvailableAgents(docId);

  return (
    <div className="flex flex-col bg-gray-50">
      {/* Full-width breadcrumbs */}
      <BreadcrumbHeader
        items={[
          { label: document.title || "Untitled Document" },
          { label: "Overview" },
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
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 lg:auto-rows-fr lg:grid-cols-3">
              {/* Main Content */}
              <div className="flex flex-col lg:col-span-2">
                {/* Submitter Notes Card - only show if notes exist */}
                {document.submitterNotes && (
                  <div className="mb-6 rounded-lg border bg-gray-100 p-6 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold">
                      Submitter's Notes
                    </h3>
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap">
                        {document.submitterNotes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Document Preview Card */}
                <div className="flex flex-1 flex-col">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Document Preview
                    </h2>
                    <div className="flex items-center gap-2">
                      <Button asChild size="sm">
                        <Link href={`/docs/${docId}/reader`}>
                          <BookOpen className="h-3.5 w-3.5" />
                          Reader View
                        </Link>
                      </Button>
                      {isOwner && (
                        <DocumentActions
                          docId={docId}
                          document={{
                            importUrl: document.importUrl,
                            isPrivate: document.isPrivate,
                          }}
                        />
                      )}
                    </div>
                  </div>

                  <div className="prose prose-gray max-w-none flex-1 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
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
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="flex flex-col lg:col-span-1">
                <div className="flex-1 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
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

                    <PrivacySection
                      docId={docId}
                      isPrivate={document.isPrivate || false}
                      isOwner={isOwner}
                    />

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
