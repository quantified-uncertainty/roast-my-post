"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { DocumentWithEvaluations } from "@/components/DocumentWithEvaluations";
import { documentsCollection } from "@/data/docs";

export default function DocumentPage() {
  const params = useParams();
  const docId = params.docId as string;

  // Find the document by slug
  const document = documentsCollection.documents.find(
    (doc) => doc.slug === docId
  );

  // Handle document not found
  if (!document) {
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
