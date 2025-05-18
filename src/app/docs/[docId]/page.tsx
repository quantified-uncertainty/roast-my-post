import Link from "next/link";
import { notFound } from "next/navigation";

import { DocumentWithEvaluations } from "@/components/DocumentWithEvaluations";
import { auth } from "@/lib/auth";
import { DocumentModel } from "@/models/Document";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ docId: string }>;
}) {
  const resolvedParams = await params;
  const docId = resolvedParams.docId;
  const session = await auth();
  const currentUserId = session?.user?.id;

  // Validate docId
  if (!docId) {
    notFound();
  }

  const document = await DocumentModel.getDocumentWithEvaluations(docId);

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

  // Check if current user is the owner
  const isOwner = currentUserId ? document.submittedById === currentUserId : false;

  return (
    <div className="min-h-screen">
      <main>
        <div className="mx-auto max-w-full">
          <DocumentWithEvaluations 
            document={document} 
            isOwner={isOwner}
          />
        </div>
      </main>
    </div>
  );
}
