// Document type definitions
import type { Comment, DocumentReview } from "./documentReview";

// Raw types (matching JSON structure)
export interface RawDocumentReview {
  comments: Comment[];
  agentId: string;
  analysis?: string;
  costInCents: number;
  createdAt: string;
}

export interface RawDocument {
  id: string;
  slug: string;
  title: string;
  content: string;
  author: string;
  publishedDate: string;
  reviews: RawDocumentReview[];
  intendedAgents: string[];
}

export interface RawDocumentsCollection {
  documents: RawDocument[];
}

// Transformed types (with Date objects)
export interface Document {
  id: string;
  slug: string;
  title: string;
  content: string;
  author: string;
  publishedDate: string;
  reviews: DocumentReview[];
  intendedAgents: string[];
}

export interface DocumentsCollection {
  documents: Document[];
}

// Helper function to transform raw data to typed data
export function transformDocument(raw: RawDocument): Document {
  return {
    ...raw,
    reviews: raw.reviews.map((review) => ({
      ...review,
      createdAt: new Date(review.createdAt),
    })),
  };
}

export function transformDocumentsCollection(
  raw: RawDocumentsCollection
): DocumentsCollection {
  return {
    documents: raw.documents.map(transformDocument),
  };
}
