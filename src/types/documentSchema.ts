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
  description: z.string(),
  title: z.string().optional(),
  observation: z.string().optional(),
  significance: z.string().optional(),
  importance: z.number().optional(),
  grade: z.number().optional(),
  highlight: HighlightSchema,
  isValid: z.boolean(),
  error: z.string().optional(),
});

export type Comment = z.infer<typeof CommentSchema>;

// Schema for task
export const TaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  modelName: z.string(),
  priceInCents: z.number(),
  timeInSeconds: z.number().nullable(),
  log: z.string().nullable(),
  llmInteractions: z.any().nullable(), // JSON field storing LLMInteraction[]
  createdAt: z.date(),
});

export type Task = z.infer<typeof TaskSchema>;

// Schema for evaluation version
export const EvaluationVersionSchema = z.object({
  version: z.number().nullable().optional(),
  createdAt: z.date(),
  job: z
    .object({
      costInCents: z.number(),
      llmThinking: z.string(),
      durationInSeconds: z.number().optional(),
      logs: z.string().optional(),
      tasks: z.array(TaskSchema).optional(),
    })
    .optional(),
  comments: z.array(CommentSchema),
  summary: z.string(),
  analysis: z.string().optional(),
  grade: z.number().optional(),
  selfCritique: z.string().optional(),
  documentVersion: z.object({
    version: z.number(),
  }),
  isStale: z.boolean().optional(),
});

export type EvaluationVersion = z.infer<typeof EvaluationVersionSchema>;

// Schema for evaluation
export const EvaluationSchema = z.object({
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
  costInCents: z.number(),
  comments: z.array(CommentSchema),
  thinking: z.string(),
  summary: z.string(),
  analysis: z.string().optional(),
  grade: z.number().optional(),
  selfCritique: z.string().optional(),
  versions: z.array(EvaluationVersionSchema).optional(),
  jobs: z
    .array(
      z.object({
        id: z.string(),
        status: z.string(),
        createdAt: z.date(),
      })
    )
    .optional(),
  isStale: z.boolean().optional(),
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
  importUrl: z.string().optional(),
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
  importUrl: z.string().optional(),
  platforms: z.array(z.string()),
  intendedAgents: z.array(z.string()),
  reviews: z.array(EvaluationSchema),
  submittedById: z.string().optional(),
  submittedBy: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable(),
      image: z.string().nullable(),
    })
    .optional(),
  versions: z.array(DocumentVersionSchema).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
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
  analysis: z.string(),
  grade: z.number().optional(),
  selfCritique: z.string().optional(),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
