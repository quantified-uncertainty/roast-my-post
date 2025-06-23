import { z } from "zod";

export const AgentReviewSchema = z.object({
  evaluatedAgentId: z.string(),
  grade: z.number().min(0).max(100).optional(),
  summary: z.string(),
  author: z.string(),
  createdAt: z.date(),
});

export type AgentReview = z.infer<typeof AgentReviewSchema>;

// Schema for evaluation version
export const EvaluationVersionSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  grade: z.number().min(0).max(100).optional(),
  summary: z.string(),
  analysis: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type EvaluationVersion = z.infer<typeof EvaluationVersionSchema>;
