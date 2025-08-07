import Link from "next/link";
import { notFound } from "next/navigation";

import { DocumentWithEvaluations } from "@/components/DocumentWithEvaluations";
import { auth } from "@/infrastructure/auth/auth";
import { DocumentModel } from "@/models/Document";

export default async function DocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ docId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
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
  const isOwner = currentUserId
    ? document.submittedById === currentUserId
    : false;

  // Parse evaluation filter from query params
  const evalParam = resolvedSearchParams.evals;
  const selectedEvalIds = evalParam
    ? Array.isArray(evalParam)
      ? evalParam
      : typeof evalParam === 'string'
      ? evalParam.split(',').filter(id => id.length > 0)
      : [evalParam]
    : undefined;

  // Parse debug parameter from query params
  const debugParam = resolvedSearchParams.debug;
  const showDebugComments = debugParam === 'true' || debugParam === '1';

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          <DocumentWithEvaluations 
            document={document} 
            isOwner={isOwner}
            initialSelectedEvalIds={selectedEvalIds}
            showDebugComments={showDebugComments}
          />
        </div>
      </div>
    </div>
  );
}
