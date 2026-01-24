import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { getGlobalSessionManager } from '../../helicone/simpleSessionManager';
import type { ToolConfig, ToolContext } from './types';

// Re-export types for backwards compatibility
export type { ToolConfig, ToolContext } from './types';

export abstract class Tool<TInput = unknown, TOutput = unknown> {
  abstract config: ToolConfig;
  abstract inputSchema: z.ZodSchema<TInput>;
  abstract outputSchema: z.ZodSchema<TOutput>;
  
  // Core method that all tools implement
  abstract execute(input: TInput, context: ToolContext): Promise<TOutput>;
  
  // Optional hooks (subclasses can override as async if needed)
  validateAccess(_context: ToolContext): Promise<boolean> {
    return Promise.resolve(true);
  }

  beforeExecute(_input: TInput, _context: ToolContext): Promise<void> { return Promise.resolve(); }
  afterExecute(_output: TOutput, _context: ToolContext): Promise<void> { return Promise.resolve(); }
  
  // Schema conversion methods
  getInputJsonSchema() {
    return zodToJsonSchema(this.inputSchema, {
      $refStrategy: 'none',
      errorMessages: false,
      markdownDescription: false,
    });
  }
  
  getOutputJsonSchema() {
    return zodToJsonSchema(this.outputSchema, {
      $refStrategy: 'none',
      errorMessages: false,
      markdownDescription: false,
    });
  }
  
  // Common functionality
  async run(input: unknown, context: ToolContext): Promise<TOutput> {
    // Validate input
    const validatedInput = this.inputSchema.parse(input);
    
    // Check access
    if (!await this.validateAccess(context)) {
      throw new Error('Access denied');
    }
    
    // Get global session manager for tracking
    const sessionManager = getGlobalSessionManager();
    
    // Wrap execution in session tracking if available
    const executeWithTracking = async () => {
      await this.beforeExecute(validatedInput, context);
      const output = await this.execute(validatedInput, context);
      await this.afterExecute(output, context);
      return output;
    };
    
    let output: TOutput;
    if (sessionManager) {
      // Track tool execution in session tracking if available
      output = await sessionManager.trackTool(this.config.id, executeWithTracking);
    } else {
      // Execute without tracking
      output = await executeWithTracking();
    }
    
    // Validate output
    return this.outputSchema.parse(output);
  }
}