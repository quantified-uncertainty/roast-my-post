import { z } from 'zod';
import { Tool, ToolContext } from '../base/Tool';
import { RichLLMInteraction } from '@/types/llm';
import { llmInteractionSchema } from '@/types/llmSchema';
import { callClaudeWithTool } from '@/lib/claude/wrapper';
import { sessionContext } from '@/lib/helicone/sessionContext';
import { createHeliconeHeaders, type HeliconeSessionConfig } from '@/lib/helicone/sessions';

export interface SpellingGrammarError {
  text: string;
  correction: string;
  type: 'spelling' | 'grammar';
  context?: string;
  importance: number; // 0-100
}

export interface CheckSpellingGrammarInput {
  text: string;
  context?: string;
  maxErrors?: number;
}

export interface CheckSpellingGrammarOutput {
  errors: SpellingGrammarError[];
  llmInteractions: RichLLMInteraction[];
}

// Input schema
const inputSchema = z.object({
  text: z.string().min(1).max(10000).describe('The text to check for spelling and grammar errors'),
  context: z.string().max(1000).optional().describe('Additional context about the text'),
  maxErrors: z.number().min(1).max(100).optional().default(50).describe('Maximum number of errors to return')
}) satisfies z.ZodType<CheckSpellingGrammarInput>;

// Output schema
const outputSchema = z.object({
  errors: z.array(z.object({
    text: z.string().describe('The incorrect text'),
    correction: z.string().describe('Suggested correction'),
    type: z.enum(['spelling', 'grammar']).describe('Type of error'),
    context: z.string().optional().describe('Context around the error'),
    importance: z.number().min(0).max(100).describe('Importance score (0-100)')
  })).describe('List of spelling and grammar errors found'),
  llmInteractions: z.array(llmInteractionSchema).describe('LLM interactions for monitoring and debugging')
});

export class CheckSpellingGrammarTool extends Tool<CheckSpellingGrammarInput, CheckSpellingGrammarOutput> {
  config = {
    id: 'check-spelling-grammar',
    name: 'Check Spelling & Grammar',
    description: 'Analyze text for spelling and grammar errors using Claude',
    version: '1.0.0',
    category: 'analysis' as const,
    costEstimate: '~$0.01 per check (1 Claude call)',
    path: '/tools/check-spelling-grammar',
    status: 'stable' as const
  };
  
  inputSchema = inputSchema;
  outputSchema = outputSchema as any;
  
  async execute(input: CheckSpellingGrammarInput, context: ToolContext): Promise<CheckSpellingGrammarOutput> {
    context.logger.info(`[CheckSpellingGrammarTool] Checking text (${input.text.length} chars)`);
    
    const llmInteractions: RichLLMInteraction[] = [];
    
    try {
      const { errors, interaction } = await this.checkSpellingGrammar(input);
      llmInteractions.push(interaction);
      
      return {
        errors,
        llmInteractions
      };
    } catch (error) {
      context.logger.error('[CheckSpellingGrammarTool] Error checking spelling/grammar:', error);
      throw error;
    }
  }
  
  private async checkSpellingGrammar(input: CheckSpellingGrammarInput): Promise<{
    errors: SpellingGrammarError[];
    interaction: RichLLMInteraction;
  }> {
    const systemPrompt = `You are a proofreading assistant. Identify spelling and grammar errors in text.

CRITICAL REQUIREMENTS:
1. The "text" field MUST contain EXACT text from the input, character-for-character
2. DO NOT paraphrase, summarize, or modify the error text in any way
3. If an error spans multiple words, include the complete exact phrase
4. DO NOT include errors that don't exist in the provided text

Focus on:
- Clear spelling errors
- Grammar mistakes that affect clarity

For each error, provide an importance score (0-100):
- 0-25: Minor typos that don't affect comprehension (e.g., "teh" → "the", "recieve" → "receive")
- 26-50: Noticeable errors that may distract readers (e.g., their/there confusion, missing articles)
- 51-75: Errors affecting clarity or credibility (e.g., technical term misspellings, verb tense errors)
- 76-100: Critical errors that change meaning (e.g., missing "not", wrong numbers, ambiguous pronouns)

Limit to ${input.maxErrors} most important errors.`;

    const userPrompt = `<task>
  <instruction>Check this text for spelling and grammar issues</instruction>
  
  <content>
${input.text}
  </content>
  
  ${input.context ? `<context>\n${input.context}\n  </context>\n  ` : ''}
  <parameters>
    <max_errors>${input.maxErrors || 50}</max_errors>
  </parameters>
  
  <requirements>
    Report any errors found with suggested corrections and importance scores.
  </requirements>
</task>`;

    // Get session context if available
    const currentSession = sessionContext.getSession();
    let sessionConfig: HeliconeSessionConfig | undefined = undefined;
    
    if (currentSession) {
      // First create a new config with the updated path
      sessionConfig = sessionContext.withPath('/plugins/spelling/check-spelling-grammar');
      
      // Then add properties to the new config (not the original context)
      if (sessionConfig) {
        sessionConfig = {
          ...sessionConfig,
          customProperties: {
            ...sessionConfig.customProperties,
            plugin: 'spelling',
            operation: 'check-errors',
            tool: 'check-spelling-grammar'
          }
        };
      }
    }
    
    const heliconeHeaders = sessionConfig ? 
      createHeliconeHeaders(sessionConfig) : 
      undefined;
    
    // Generate cache seed based on content for consistent caching
    const { generateCacheSeed } = await import('@/tools/shared/cache-utils');
    const cacheSeed = generateCacheSeed('spelling', [
      input.text,
      input.context || '',
      input.maxErrors || 50
    ]);
    
    const result = await callClaudeWithTool<{ errors: SpellingGrammarError[] }>({
      system: systemPrompt,
      messages: [{
        role: "user",
        content: userPrompt
      }],
      max_tokens: 1500,
      temperature: 0,
      toolName: "report_errors",
      toolDescription: "Report spelling and grammar errors",
      toolSchema: {
        type: "object",
        properties: {
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string", description: "The incorrect text" },
                correction: { type: "string", description: "Suggested correction" },
                type: {
                  type: "string",
                  enum: ["spelling", "grammar"],
                  description: "Type of error"
                },
                context: { type: "string", description: "Context around the error (optional)" },
                importance: { 
                  type: "number", 
                  description: "Importance score (0-100) - how important/impactful this error is",
                  minimum: 0,
                  maximum: 100
                }
              },
              required: ["text", "correction", "type", "importance"]
            }
          }
        },
        required: ["errors"]
      },
      enablePromptCaching: true,
      heliconeHeaders,
      cacheSeed
    });

    const rawErrors = result.toolResult.errors || [];
    
    // Validate that each error text actually exists in the input
    const errors = rawErrors.filter(error => {
      if (!error.text || typeof error.text !== 'string') {
        return false;
      }
      
      // Check if the error text exists in the input
      const exists = input.text.includes(error.text);
      
      if (!exists) {
        // Log this as a warning - LLM hallucinated an error
        console.warn(`[CheckSpellingGrammarTool] LLM returned error text that doesn't exist in input: "${error.text.slice(0, 50)}..."`);
      }
      
      return exists;
    });

    return { errors, interaction: result.interaction };
  }
  
  
  override async beforeExecute(input: CheckSpellingGrammarInput, context: ToolContext): Promise<void> {
    context.logger.info(`[CheckSpellingGrammarTool] Starting check for ${input.text.length} characters`);
  }
  
  override async afterExecute(output: CheckSpellingGrammarOutput, context: ToolContext): Promise<void> {
    context.logger.info(`[CheckSpellingGrammarTool] Found ${output.errors.length} total errors`);
  }
}

// Export singleton instance
export const checkSpellingGrammarTool = new CheckSpellingGrammarTool();
export default checkSpellingGrammarTool;