"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { documentsCollection } from "@/types/documents";
import { DocumentReviewSet } from "@/components/DocumentReviewSet";
import { DocumentReviewSetData } from "@/types/documentReviewSet";

export default function DocumentPage() {
  const params = useParams();
  const docId = params.docId as string;
  
  // Find the document by slug
  const document = documentsCollection.documents.find(doc => doc.slug === docId);
  
  // Handle document not found
  if (!document) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Document not found</h1>
        <p className="text-gray-600 mb-8">The document you're looking for doesn't exist or has been moved.</p>
        <Link
          href="/docs"
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Back to Documents
        </Link>
      </div>
    );
  }
  
  // Convert the single document to a DocumentReviewSetData format expected by DocumentReviewSet
  const reviewSetData: DocumentReviewSetData = {
    title: document.title,
    description: document.description,
    items: [
      {
        id: document.id,
        title: document.title,
        icon: document.icon,
        review: document.review
      }
    ]
  };
  
  return (
    <div className="min-h-screen">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
              <p className="text-sm text-gray-600">
                {document.description}
              </p>
            </div>
            <Link
              href="/docs"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Documents
            </Link>
          </div>
        </div>
      </header>
      
      <main>
        <div className="max-w-full mx-auto">
          <DocumentReviewSet reviewSet={reviewSetData} />
        </div>
      </main>
    </div>
  );
}