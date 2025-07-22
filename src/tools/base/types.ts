import { z } from 'zod';

// Common response wrapper
export const toolResponseSchema = z.object({
  success: z.boolean(),
  toolId: z.string(),
  result: z.unknown().optional(),
  error: z.string().optional(),
  details: z.unknown().optional()
});

export type ToolResponse<T = unknown> = {
  success: boolean;
  toolId: string;
  result?: T;
  error?: string;
  details?: unknown;
};

// Common error types
export class ToolExecutionError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = 'ToolExecutionError';
  }
}

export class ToolAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolAccessError';
  }
}