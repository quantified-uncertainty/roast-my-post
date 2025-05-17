"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { DocumentWithEvaluations } from "@/components/DocumentWithEvaluations";
import { Document } from "@/types/documents";

// Helper function to convert database doc to frontend doc
const convertDbDocToFrontendDoc = (dbDoc: any): Document => {
  return {
    id: dbDoc.id,
    slug: dbDoc.slug || dbDoc.id,
    title: dbDoc.versions[0].title,
    author: dbDoc.versions[0].authors.join(", "),
    content: dbDoc.versions[0].content,
    publishedDate: dbDoc.publishedDate,
    url: dbDoc.versions[0].urls[0] || null,
    platforms: dbDoc.versions[0].platforms || [],
    reviews: [], // Will need to handle reviews separately
    intendedAgents: dbDoc.versions[0].intendedAgents || [],
  };
};

// Fetch document by slug or id
const fetchDocumentBySlugOrId = async (slugOrId: string) => {
  try {
    // Simple fetch from API route we'll create later
    const response = await fetch(`/api/documents/${slugOrId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching document:", error);
    return null;
  }
};

export default function DocumentPage() {
  const params = useParams();
  const docId = params["docId"] as string;
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDocument = async () => {
      setLoading(true);
      try {
        // First try to load from static collection (for backward compatibility)
        // This can be removed once all documents are in the database
        try {
          const { documentsCollection } = await import("@/data/docs");
          const staticDoc = documentsCollection.documents.find(
            (doc) => doc.slug === docId
          );
          if (staticDoc) {
            setDocument(staticDoc);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.log("Static document collection not available");
        }

        // If not found in static collection, try to load from database
        const dbDoc = await fetchDocumentBySlugOrId(docId);
        if (dbDoc) {
          setDocument(convertDbDocToFrontendDoc(dbDoc));
        } else {
          setError("Document not found");
        }
      } catch (err) {
        console.error("Error loading document:", err);
        setError("Failed to load document");
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [docId]);

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading document...</p>
      </div>
    );
  }

  // Error or document not found
  if (error || !document) {
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
