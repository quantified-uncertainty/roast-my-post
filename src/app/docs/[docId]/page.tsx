import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpTrayIcon, PlusIcon } from "@heroicons/react/24/outline";
import { ChevronRightIcon } from "@heroicons/react/24/solid";

import { auth } from "@/lib/auth";
import { DocumentModel } from "@/models/Document";
import { formatDistanceToNow } from "date-fns";
import { DocumentEvaluationSidebar } from "@/components/DocumentEvaluationSidebar";
import { GradeBadge } from "@/components/GradeBadge";
import { PageHeader } from "@/components/PageHeader";

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

  const document = await DocumentModel.getDocumentWithEvaluations(docId);

  if (!document) {
    notFound();
  }

  const isOwner = currentUserId
    ? document.submittedById === currentUserId
    : false;

  // Get word count from document content
  const wordCount = document.content?.trim().split(/\s+/).length || 0;

  // Calculate file size from content (estimate based on UTF-8 encoding)
  const contentSizeBytes = new TextEncoder().encode(document.content || '').length;
  const fileSizeKB = contentSizeBytes / 1024;
  const fileSize = fileSizeKB > 1024 
    ? `${(fileSizeKB / 1024).toFixed(1)} MB`
    : `${Math.round(fileSizeKB)} KB`;

  return (
    <div className="h-full bg-gray-50 flex overflow-hidden">
      {/* Document/Evaluation Switcher Sidebar */}
      <DocumentEvaluationSidebar 
        docId={docId}
        evaluations={document.reviews || []}
      />
      
      <div className="flex-1 overflow-y-auto">
        {/* Full-width Header */}
        <PageHeader 
          title={document.title || "Untitled Document"}
          subtitle="Document Preview"
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Document Preview Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Executive Summary</h2>
              
              <div className="prose prose-gray max-w-none">
                <div className="text-gray-700 leading-relaxed">
                  {document.content ? (
                    <p>{document.content.substring(0, 500)}...</p>
                  ) : (
                    <p className="text-gray-500 italic">No content available</p>
                  )}
                </div>
                
                <p className="text-sm text-gray-500 mt-4">
                  Blog Post • First paragraph preview
                </p>
              </div>

              <div className="mt-6 flex gap-3">
                {document.importUrl ? (
                  <a
                    href={document.importUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Go to source
                  </a>
                ) : (
                  <Link
                    href={`/docs/${docId}/preview`}
                    className="inline-flex items-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View full document
                  </Link>
                )}
                <button className="inline-flex items-center px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Preview
                </button>
              </div>
            </div>

            {/* AI Evaluations Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Evaluations</h2>
              <p className="text-sm text-gray-600 mb-6">Analysis results from different AI evaluation models</p>

              {document.reviews && document.reviews.length > 0 ? (
                <div className="space-y-3">
                  {document.reviews.map((evaluation, index) => (
                    <Link
                      key={evaluation.agentId || `agent-${index}`}
                      href={`/docs/${docId}/evals/${evaluation.agentId}`}
                      className="block group"
                    >
                      <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-medium text-gray-900">
                              {evaluation.agent?.name || "Unknown Agent"}
                            </h3>
                            {evaluation.versions && evaluation.versions.length > 1 && (
                              <span className="text-xs text-gray-500">
                                {evaluation.versions.length} versions
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {evaluation.summary || "No summary available"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <GradeBadge grade={evaluation.grade ?? null} variant="light" size="sm" />
                          <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No evaluations yet</p>
                  {isOwner && (
                    <Link
                      href={`/docs/${docId}/evaluations`}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                    >
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Add Evaluation
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Document Information</h2>
              
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Document Title</dt>
                  <dd className="mt-1 text-sm text-gray-900">{document.title || "Untitled"}</dd>
                </div>

                {document.importUrl && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Blog URL</dt>
                    <dd className="mt-1">
                      <a
                        href={document.importUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 break-all"
                      >
                        {document.importUrl}
                      </a>
                    </dd>
                  </div>
                )}

                <div>
                  <dt className="text-sm font-medium text-gray-500">File Size</dt>
                  <dd className="mt-1 text-sm text-gray-900">{fileSize}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Word Count</dt>
                  <dd className="mt-1 text-sm text-gray-900">{wordCount.toLocaleString()} words</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Upload Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Uploaded By</dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">
                        {document.submittedBy?.name?.charAt(0)?.toUpperCase() || 
                         document.submittedBy?.email?.charAt(0)?.toUpperCase() || 
                         "?"}
                      </span>
                    </div>
                    <span className="text-sm text-gray-900">
                      {document.submittedBy?.name || document.submittedBy?.email || "Unknown"}
                    </span>
                  </dd>
                </div>

                {document.author && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-2">Authors</dt>
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

              {isOwner && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Editor Actions</h3>
                  <div className="space-y-2">
                    {document.importUrl && (
                      <button className="w-full inline-flex items-center justify-center px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors">
                        <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
                        Re-upload Document
                      </button>
                    )}
                    <Link
                      href={`/docs/${docId}/evaluations`}
                      className="w-full inline-flex items-center justify-center px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Add Evaluation
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}