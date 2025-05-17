import Link from "next/link";
import { notFound } from "next/navigation";

import { DocumentWithEvaluations } from "@/components/DocumentWithEvaluations";
import { PrismaClient } from "@prisma/client";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ docId: string }>;
}) {
  const resolvedParams = await params;
  const docId = resolvedParams.docId;

  // Validate docId
  if (!docId) {
    notFound();
  }

  const prisma = new PrismaClient();
  const dbDoc = await prisma.document.findUnique({
    where: { id: docId },
    include: {
      versions: true,
      evaluations: {
        include: {
          agent: {
            include: {
              versions: {
                orderBy: {
                  version: "desc",
                },
                take: 1,
              },
            },
          },
          versions: {
            include: {
              comments: {
                include: {
                  highlight: true,
                },
              },
              job: true,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!dbDoc) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white p-4">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">
          Document not found
        </h1>
        <p className="mb-8 text-gray-600">
          The document you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/docs"
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Documents
        </Link>
      </div>
    );
  }

  // Convert dbDoc to frontend Document shape
  const document = {
    id: dbDoc.id,
    slug: dbDoc.id,
    title: dbDoc.versions[0].title,
    content: dbDoc.versions[0].content,
    author: dbDoc.versions[0].authors.join(", "),
    publishedDate: dbDoc.publishedDate.toISOString(),
    url: dbDoc.versions[0].urls[0],
    platforms: dbDoc.versions[0].platforms,
    intendedAgents: dbDoc.versions[0].intendedAgents,
    reviews: dbDoc.evaluations.map((evaluation) => ({
      agentId: evaluation.agent.id,
      createdAt: new Date(
        evaluation.versions[0]?.createdAt || evaluation.createdAt
      ),
      costInCents: evaluation.versions[0]?.job?.costInCents || 0,
      comments:
        evaluation.versions[0]?.comments.map((comment) => ({
          title: comment.title,
          description: comment.description,
          importance: comment.importance || undefined,
          grade: comment.grade || undefined,
          highlight: {
            startOffset: comment.highlight.startOffset,
            endOffset: comment.highlight.endOffset,
            quotedText: comment.highlight.quotedText,
          },
          isValid: comment.highlight.isValid,
        })) || [],
      thinking: evaluation.versions[0]?.job?.llmThinking || "",
      summary: evaluation.versions[0]?.summary || "",
      grade: evaluation.versions[0]?.grade || 0,
    })),
  };

  return (
    <div className="min-h-screen">
      <main>
        <div className="mx-auto max-w-full">
          <DocumentWithEvaluations document={document} />
        </div>
      </main>
    </div>
  );
}
