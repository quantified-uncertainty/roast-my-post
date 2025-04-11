"use client";

import Link from "next/link";

import { documentsCollection } from "@/data/docs";

export default function DocumentsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
              <p className="text-sm text-gray-600">
                Browse our collection of research documents
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-4 bg-white">
            <h2 className="text-lg font-semibold mb-4">Available Documents</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documentsCollection.documents.map((document) => {
                const Icon = document.icon;
                return (
                  <Link
                    key={document.id}
                    href={`/docs/${document.slug}`}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-150"
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <Icon className="h-6 w-6 text-gray-500" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-md font-medium text-gray-900">
                          {document.title}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {document.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
