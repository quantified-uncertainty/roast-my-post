import { z } from "zod";

// Schema for document highlight
export const HighlightSchema = z.object({
  startOffset: z.number(),
  endOffset: z.number(),
  quotedText: z.string(),
  isValid: z.boolean(),
  prefix: z.string().optional(),
});

export type Highlight = z.infer<typeof HighlightSchema>;

// Schema for document comment
export const CommentSchema = z.object({
  title: z.string(),
  description: z.string(),
  importance: z.number().optional(),
  grade: z.number().optional(),
  highlight: HighlightSchema,
  isValid: z.boolean(),
  error: z.string().optional(),
});

export type Comment = z.infer<typeof CommentSchema>;

// Schema for evaluation version
export const EvaluationVersionSchema = z.object({
  createdAt: z.date(),
  job: z
    .object({
      costInCents: z.number(),
      llmThinking: z.string(),
      durationInSeconds: z.number().optional(),
      logs: z.string().optional(),
    })
    .optional(),
  comments: z.array(CommentSchema),
  summary: z.string(),
  grade: z.number(),
  documentVersion: z.object({
    version: z.number(),
  }),
});

export type EvaluationVersion = z.infer<typeof EvaluationVersionSchema>;

// Schema for evaluation
export const EvaluationSchema = z.object({
  agentId: z.string(),
  agent: z.object({
    id: z.string(),
    name: z.string(),
    version: z.string(),
    description: z.string(),
    iconName: z.string(),
    purpose: z.string(),
    genericInstructions: z.string().optional(),
    summaryInstructions: z.string().optional(),
    commentInstructions: z.string().optional(),
    gradeInstructions: z.string().optional(),
  }),
  createdAt: z.date(),
  costInCents: z.number(),
  comments: z.array(CommentSchema),
  thinking: z.string(),
  summary: z.string(),
  grade: z.number(),
  versions: z.array(EvaluationVersionSchema).optional(),
});

export type Evaluation = z.infer<typeof EvaluationSchema>;

// Schema for document version
export const DocumentVersionSchema = z.object({
  title: z.string(),
  content: z.string(),
  authors: z.array(z.string()),
  urls: z.array(z.string()),
  platforms: z.array(z.string()),
  intendedAgents: z.array(z.string()),
});

export type DocumentVersion = z.infer<typeof DocumentVersionSchema>;

// Schema for document
export const DocumentSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  content: z.string(),
  author: z.string(),
  publishedDate: z.string(),
  url: z.string(),
  platforms: z.array(z.string()),
  intendedAgents: z.array(z.string()),
  reviews: z.array(EvaluationSchema),
  submittedById: z.string().optional(),
  versions: z.array(DocumentVersionSchema).optional(),
});

export type Document = z.infer<typeof DocumentSchema>;

// Schema for document input (used in forms)
export const DocumentInputSchema = DocumentSchema.omit({
  id: true,
  slug: true,
  reviews: true,
});

export type DocumentInput = z.infer<typeof DocumentInputSchema>;

// Schema for document response
export const DocumentResponseSchema = z.object({
  success: z.boolean(),
  document: DocumentSchema.optional(),
  id: z.string().optional(),
  error: z.string().optional(),
});

export type DocumentResponse = z.infer<typeof DocumentResponseSchema>;

// Schema for analysis result (used during document analysis)
export const AnalysisResultSchema = z.object({
  agentId: z.string(),
  createdAt: z.date(),
  costInCents: z.number(),
  comments: z.array(CommentSchema),
  thinking: z.string(),
  summary: z.string(),
  grade: z.number(),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
