"use client";

import Link from "next/link";

import { documentsCollection } from "@/data/docs";

export default function DocumentsPage() {
  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="mb-4 text-lg font-semibold">Available Documents</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {documentsCollection.documents.map((document) => {
              return (
                <Link
                  key={document.id}
                  href={`/docs/${document.slug}`}
                  className="rounded-lg border border-gray-200 p-4 transition-colors duration-150 hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base leading-7 font-semibold text-gray-900">
                      {document.title}
                    </h2>
                    <p className="mt-1 truncate text-sm leading-5 text-gray-500">
                      {document.content}
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
