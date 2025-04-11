// Document type definitions
import type { DocumentReview } from "./documentReview";

export interface Document {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: any; // Icon component from a library like Heroicons
  content: string;
  reviews: DocumentReview[];
}

export interface DocumentsCollection {
  documents: Document[];
}