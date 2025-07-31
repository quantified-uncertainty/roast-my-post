import { z } from 'zod';

// Common response wrapper
export const toolResponseSchema = z.object({
  success: z.boolean(),
  toolId: z.string(),
  result: z.any().optional(),
  error: z.string().optional(),
  details: z.any().optional()
});

export type ToolResponse<T = any> = {
  success: boolean;
  toolId: string;
  result?: T;
  error?: string;
  details?: any;
};

// Common error types
export class ToolExecutionError extends Error {
  constructor(message: string, public details?: any) {
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