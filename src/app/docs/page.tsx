"use client";

import Link from "next/link";

import { documentsCollection } from "@/data/docs";

export default function DocumentsPage() {
  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-lg font-semibold mb-4">Available Documents</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documentsCollection.documents.map((document) => {
              return (
                <Link
                  key={document.id}
                  href={`/docs/${document.slug}`}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-150"
                >
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold leading-7 text-gray-900">
                      {document.title}
                    </h2>
                    <p className="mt-1 truncate text-sm leading-5 text-gray-500">
                      {document.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
