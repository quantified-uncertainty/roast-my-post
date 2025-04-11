"use client";

import Link from 'next/link';

import { DocumentWithEvaluations } from '@/components/DocumentWithEvaluations';
import { documentsCollection } from '@/data/docs';

export default function DocumentPage() {
  // Use the first document in the collection
  const document = documentsCollection.documents[0];

  return (
    <div className="min-h-screen">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Document Review
              </h1>
              <p className="text-sm text-gray-600">{document.title}</p>
            </div>
            <Link
              href="/agents"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Explore Agents
            </Link>
          </div>
        </div>
      </header>

      <main>
        <div className="max-w-full mx-auto">
          <DocumentWithEvaluations document={document} />
        </div>
      </main>
    </div>
  );
}
