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
    include: { versions: true },
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

  // Convert dbDoc to frontend Document shape if needed
  const document = {
    id: dbDoc.id,
    slug: dbDoc.id,
    title: dbDoc.versions[0].title,
    author: dbDoc.versions[0].authors.join(", "),
    content: dbDoc.versions[0].content,
    publishedDate: dbDoc.publishedDate.toISOString(),
    url: dbDoc.versions[0].urls[0] || undefined,
    platforms: dbDoc.versions[0].platforms || [],
    reviews: [], // Will need to handle reviews separately
    intendedAgents: dbDoc.versions[0].intendedAgents || [],
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
