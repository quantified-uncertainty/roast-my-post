import { Suspense } from "react";
import DocumentsClient from "./DocumentsClient";
import { prisma, Prisma } from "@roast/db";

export const dynamic = "force-dynamic";

interface DocumentsPageProps {
  searchParams: {
    q?: string;
  };
}

export default async function DocumentsPage({
  searchParams,
}: DocumentsPageProps) {
  const searchQuery = searchParams.q || "";

  // Initialize where statement
  let whereStatement: Prisma.DocumentVersionWhereInput = {};

  // Add search condition if query exists
  if (searchQuery.trim() && searchQuery.trim().length >= 2) {
    whereStatement.searchableText = {
      contains: searchQuery.trim().toLowerCase(),
      mode: "insensitive",
    };
  }

  // Execute query with where statement
  const rawDocuments = await prisma.documentVersion.findMany({
    where: whereStatement,
    include: {
      document: {
        include: {
          evaluations: {
            include: {
              agent: {
                include: {
                  versions: {
                    orderBy: { version: "desc" },
                    take: 1,
                  },
                },
              },
              versions: {
                orderBy: { version: "desc" },
                take: 1,
                include: {
                  comments: {
                    include: {
                      highlight: true,
                    },
                  },
                  job: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Serialize to plain objects for client component
  const documents = rawDocuments.map((doc) => ({
    id: doc.id,
    title: doc.title,
    authors: doc.authors,
    content: doc.content,
    urls: doc.urls,
    platforms: doc.platforms,
    intendedAgents: doc.intendedAgents,
    importUrl: doc.importUrl,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    document: {
      id: doc.document.id,
      publishedDate: doc.document.publishedDate.toISOString(),
      createdAt: doc.document.createdAt.toISOString(),
      updatedAt: doc.document.updatedAt.toISOString(),
      submittedById: doc.document.submittedById,
      evaluations: doc.document.evaluations.map((evaluation) => ({
        id: evaluation.id,
        agentId: evaluation.agentId,
        createdAt: evaluation.createdAt.toISOString(),
        agent: {
          id: evaluation.agent.id,
          versions: evaluation.agent.versions.map((version) => ({
            id: version.id,
            name: version.name,
            description: version.description,
            providesGrades: version.providesGrades,
          })),
        },
        versions: evaluation.versions.map((version) => ({
          id: version.id,
          grade: version.grade,
          comments: version.comments.map((comment) => ({
            id: comment.id,
            description: comment.description,
            importance: comment.importance,
            grade: comment.grade,
            highlight: {
              id: comment.highlight.id,
              startOffset: comment.highlight.startOffset,
              endOffset: comment.highlight.endOffset,
              prefix: comment.highlight.prefix,
              quotedText: comment.highlight.quotedText,
              isValid: comment.highlight.isValid,
              error: comment.highlight.error,
            },
          })),
          job: version.job
            ? {
                priceInDollars: version.job.priceInDollars
                  ? Number(version.job.priceInDollars)
                  : null,
                llmThinking: version.job.llmThinking,
              }
            : null,
          summary: version.summary,
          analysis: version.analysis,
          selfCritique: version.selfCritique,
        })),
      })),
    },
  }));

  const totalCount = rawDocuments.length;

  return (
    <Suspense>
      <DocumentsClient
        documents={documents}
        searchQuery={searchQuery}
        totalCount={totalCount}
        hasSearched={!!searchQuery.trim() && searchQuery.trim().length >= 2}
      />
    </Suspense>
  );
}
