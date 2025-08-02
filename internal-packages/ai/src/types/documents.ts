// Document type definitions
import type {
  Comment,
} from "../shared/types";

// Domain evaluation type (without database-specific fields)
export interface Evaluation {
  agentId: string;
  agent: {
    id: string;
    name: string;
    version: string;
    description: string;
    primaryInstructions?: string;
    selfCritiqueInstructions?: string;
    providesGrades?: boolean;
  };
  comments: Comment[];
  priceInDollars: number;
  createdAt: Date;
  thinking: string;
  summary: string;
  grade: number | null;
  analysis?: string;
  selfCritique?: string;
}

// Raw types (matching JSON structure)
export interface RawDocumentReview {
  agentId: string;
  agent: {
    id: string;
    name: string;
    version: string;
    description: string;
    primaryInstructions?: string;
    selfCritiqueInstructions?: string;
    providesGrades?: boolean;
  };
  comments: Comment[];
  priceInDollars: number;
  createdAt: string;
  thinking: string;
  summary: string;
  grade: number | null;
}

export interface RawDocument {
  id: string;
  slug: string;
  title: string;
  content: string;
  author: string;
  publishedDate: string;
  url?: string;
  platforms?: string[];
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
  url?: string;
  platforms?: string[];
  reviews: Evaluation[];
  intendedAgents: string[];
}

export interface DocumentsCollection {
  documents: Document[];
}

// Helper function to transform raw data to typed data
export function transformDocument(raw: RawDocument): Document {
  return {
    ...raw,
    // Filter out nullish reviews and safely parse createdAt
    reviews: (raw.reviews || []) // Handle cases where raw.reviews might be null/undefined
      .filter((review): review is RawDocumentReview => !!review) // Filter out null/undefined reviews
      .map((review) => {
        const createdAt = review.createdAt
          ? new Date(review.createdAt)
          : new Date(0); // Fallback to epoch if missing
        if (!review.createdAt) {
          // Log a warning instead of error if createdAt is missing
          console.warn(
            `Review for agent ${review.agentId} in document ${raw.id} is missing createdAt. Using epoch as fallback.`
          );
        }
        // Ensure the mapped object conforms to Evaluation if it differs from RawDocumentReview
        // Assuming Evaluation is the same as RawDocumentReview except createdAt is Date type
        return {
          ...review,
          createdAt: createdAt, // Assign the parsed or fallback date
          grade: review.grade ?? undefined, // Convert null to undefined for optional field
        };
      }),
  };
}

export function transformDocumentsCollection(
  raw: RawDocumentsCollection
): DocumentsCollection {
  return {
    documents: raw.documents.map(transformDocument),
  };
}