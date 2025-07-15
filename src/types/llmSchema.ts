/**
 * Zod schemas for LLM types
 * These schemas match the TypeScript interfaces in llm.ts
 */

import { z } from 'zod';

export const llmMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string()
});

export const llmUsageSchema = z.object({
  input_tokens: z.number(),
  output_tokens: z.number()
});

// Schema for the Plugin/Tool LLMInteraction format
export const pluginLLMInteractionSchema = z.object({
  model: z.string(),
  prompt: z.string(),
  response: z.string(),
  tokensUsed: z.object({
    prompt: z.number(),
    completion: z.number(),
    total: z.number()
  }),
  timestamp: z.date(),
  duration: z.number()
});

// Alias for backwards compatibility
export const llmInteractionSchema = pluginLLMInteractionSchema;

export const commentLLMInteractionSchema = llmInteractionSchema.extend({
  validCommentsCount: z.number(),
  failedCommentsCount: z.number()
});

// Type exports for convenience
export type LLMMessageZ = z.infer<typeof llmMessageSchema>;
export type LLMUsageZ = z.infer<typeof llmUsageSchema>;
export type LLMInteractionZ = z.infer<typeof llmInteractionSchema>;
export type CommentLLMInteractionZ = z.infer<typeof commentLLMInteractionSchema>;