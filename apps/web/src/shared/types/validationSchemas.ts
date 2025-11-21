/**
 * Validation schemas for API boundaries and database operations
 * These schemas validate data coming from external sources (APIs, forms, etc.)
 * and ensure it matches our database requirements.
 */

import { z } from "zod";
// Zod schema for comment variant enum
export const CommentVariantSchema = z.enum(['error', 'warning', 'nitpick', 'info', 'success', 'debug']);

// Schema for document highlight validation
export const HighlightValidationSchema = z.object({
  startOffset: z.number(),
  endOffset: z.number(),
  quotedText: z.string(),
  isValid: z.boolean(),
  prefix: z.string().optional(),
  error: z.string().optional(),
});

export type HighlightValidation = z.infer<typeof HighlightValidationSchema>;

// Schema for document comment validation
export const CommentValidationSchema = z.object({
  description: z.string(),
  title: z.string().optional(),
  observation: z.string().optional(),
  significance: z.string().optional(),
  importance: z.number().optional(),
  grade: z.number().optional(),
  highlight: HighlightValidationSchema,
  isValid: z.boolean(),
  error: z.string().optional(),
  
  // Plugin standardization fields
  header: z.string().optional(), // Concise summary like "2+2=5 → 2+2=4"
  variant: CommentVariantSchema.optional(),
  source: z.string().optional(), // Plugin identifier: 'math', 'spelling', etc.
  metadata: z.record(z.string(), z.any()).optional(), // Plugin-specific data
});

export type CommentValidation = z.infer<typeof CommentValidationSchema>;

// Schema for task validation
export const TaskValidationSchema = z.object({
  id: z.string(),
  name: z.string(),
  modelName: z.string(),
  priceInDollars: z.number(),
  timeInSeconds: z.number(),
  log: z.string(),
});

export type TaskValidation = z.infer<typeof TaskValidationSchema>;

// Schema for evaluation version validation
export const EvaluationVersionValidationSchema = z.object({
  version: z.number().nullable().optional(),
  createdAt: z.date(),
  job: z
    .object({
      priceInDollars: z.number(),
      durationInSeconds: z.number(),
      tasks: z.array(TaskValidationSchema).optional(),
    })
    .optional(),
  comments: z.array(CommentValidationSchema),
  summary: z.string(),
  analysis: z.string().optional(),
  grade: z.number().optional(),
  selfCritique: z.string().optional(),
  documentVersion: z.object({
    version: z.number(),
  }),
  isStale: z.boolean().optional(),
});

export type EvaluationVersionValidation = z.infer<typeof EvaluationVersionValidationSchema>;

// Schema for evaluation validation
export const EvaluationValidationSchema = z.object({
  id: z.string().optional(),
  agentId: z.string(),
  agent: z.object({
    id: z.string(),
    name: z.string(),
    version: z.string(),
    description: z.string(),
    primaryInstructions: z.string().optional(),
    selfCritiqueInstructions: z.string().optional(),
    providesGrades: z.boolean().optional(),
  }),
  createdAt: z.date(),
  priceInDollars: z.number(),
  comments: z.array(CommentValidationSchema),
  thinking: z.string(),
  analysis: z.string(),
  summary: z.string(),
  grade: z.number().optional(),
  selfCritique: z.string().optional(),
  documentVersion: z.object({
    title: z.string(),
    content: z.string(),
    version: z.number(),
  }),
});

export type EvaluationValidation = z.infer<typeof EvaluationValidationSchema>;

// Schema for document version validation
export const DocumentVersionValidationSchema = z.object({
  title: z.string(),
  content: z.string(),
  version: z.number(),
  createdAt: z.date(),
  authors: z.array(z.string()),
  urls: z.array(z.string()),
  platforms: z.array(z.string()),
  intendedAgents: z.array(z.string()),
  markdownPrepend: z.string().optional(),
  aiMetadata: z.record(z.string(), z.any()).optional(),
});

export type DocumentVersionValidation = z.infer<typeof DocumentVersionValidationSchema>;

// Schema for document validation
export const DocumentValidationSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  publishedDate: z.date(),
  url: z.string().optional(),
  importUrl: z.string().optional(),
  author: z.string().optional(),
  platforms: z.array(z.string()),
  intendedAgents: z.array(z.string()),
  content: z.string(),
  versions: z.array(DocumentVersionValidationSchema),
  reviews: z.array(EvaluationValidationSchema).optional(),
});

export type DocumentValidation = z.infer<typeof DocumentValidationSchema>;