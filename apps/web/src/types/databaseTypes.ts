// Database-specific types that extend the base AI package types
import type { Document as BaseDocument, Comment as BaseComment } from "@roast/ai";

// Database Document type that includes all the database fields
export interface Document extends BaseDocument {
  createdAt: Date;
  updatedAt: Date;
  submittedById: string;
  submittedBy?: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null; // Add image field that exists in database
  };
  importUrl?: string; // For documents imported from URLs
  ephemeralBatchId?: string;
}

// Comment type that extends the AI package Comment type with database fields
export interface Comment extends BaseComment {
  id?: string;
  evaluationId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  agentId?: string;
  reasoning?: string;
}