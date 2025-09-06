// Database-specific types that extend the base AI package types
import type { Document as BaseDocument, Comment as BaseComment } from "@roast/ai";
import type { JobStatus } from "@roast/db";

// Database Document type that includes all the database fields
export interface Document extends Omit<BaseDocument, 'reviews'> {
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
  isPrivate?: boolean; // Document privacy setting
  // Override reviews field to use database Evaluation type
  reviews: Evaluation[];
}

// Comment type that extends the AI package Comment type with database fields
export interface Comment extends Omit<BaseComment, 'importance' | 'grade' | 'highlight'> {
  id?: string;
  evaluationId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  agentId?: string;
  reasoning?: string;
  importance: number | null;
  grade: number | null;
  // Highlight fields merged from EvaluationHighlight table
  highlightStartOffset: number;
  highlightEndOffset: number;
  highlightQuotedText: string;
  highlightPrefix: string | null;
  highlightError: string | null;
  highlightIsValid: boolean;
}

// Database Evaluation type that includes all the database-specific fields
export interface Evaluation {
  id: string;
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
  // Database-specific fields
  versions?: Array<{
    id: string;
    version: number;
    summary: string;
    analysis?: string;
    grade: number | null;
    selfCritique?: string;
    createdAt: Date;
    isStale?: boolean;
    documentVersion?: {
      version: number;
    };
    comments?: Array<Comment & {
      id: string;
      description: string;
      highlight?: Highlight;
    }>;
    job?: Job;
  }>;
  jobs?: JobSummary[];
  isStale?: boolean;
}

// Database Task type
export interface Task {
  id: string;
  name: string;
  modelName: string;
  priceInDollars: number;
  timeInSeconds: number;
  log: string;
  createdAt: Date;
}

// Database Job type
export interface Job {
  id: string;
  status: JobStatus;
  priceInDollars: number;
  durationInSeconds?: number;
  llmThinking?: string | null;
  tasks?: Task[];
}

// Simplified job summary type
export interface JobSummary {
  id: string;
  status: JobStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  priceInDollars?: number;
  durationInSeconds?: number;
  error?: string;
}