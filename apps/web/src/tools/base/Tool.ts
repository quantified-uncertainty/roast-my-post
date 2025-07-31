import { z } from 'zod';
import { logger as defaultLogger } from '@/lib/logger';

export interface ToolConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  category: 'analysis' | 'research' | 'utility';
  costEstimate?: string;
  path?: string; // UI route path
  status?: 'stable' | 'experimental' | 'beta';
}

export interface ToolContext {
  userId?: string;
  apiKey?: string;
  logger: typeof defaultLogger;
}

export abstract class Tool<TInput = any, TOutput = any> {
  abstract config: ToolConfig;
  abstract inputSchema: z.ZodSchema<TInput>;
  abstract outputSchema: z.ZodSchema<TOutput>;
  
  // Core method that all tools implement
  abstract execute(input: TInput, context: ToolContext): Promise<TOutput>;
  
  // Optional hooks
  async validateAccess(context: ToolContext): Promise<boolean> {
    return true;
  }
  
  async beforeExecute(input: TInput, context: ToolContext): Promise<void> {}
  async afterExecute(output: TOutput, context: ToolContext): Promise<void> {}
  
  // Common functionality
  async run(input: unknown, context: ToolContext): Promise<TOutput> {
    // Validate input
    const validatedInput = this.inputSchema.parse(input);
    
    // Check access
    if (!await this.validateAccess(context)) {
      throw new Error('Access denied');
    }
    
    // Execute with hooks
    await this.beforeExecute(validatedInput, context);
    const output = await this.execute(validatedInput, context);
    await this.afterExecute(output, context);
    
    // Validate output
    return this.outputSchema.parse(output);
  }
}