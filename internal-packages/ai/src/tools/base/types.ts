import { z } from 'zod';

// ============================================================================
// Tool Metadata Types (client-safe, no runtime dependencies)
// ============================================================================

/**
 * Tool configuration metadata
 */
export interface ToolConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  category: 'extraction' | 'checker' | 'research' | 'utility';
  costEstimate?: string;
  path?: string; // UI route path
  status?: 'stable' | 'experimental' | 'beta';
}

/**
 * Logger interface that tools use for structured logging
 */
export interface Logger {
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
}

/**
 * Context provided to tools during execution
 */
export interface ToolContext {
  userId?: string;
  apiKey?: string;
  logger: Logger;
}

// ============================================================================
// Common Response Types
// ============================================================================

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