import { z } from 'zod';
import { Tool, ToolContext } from '../base/Tool';
import { PluginLLMInteraction } from '@/types/llm';
import { llmInteractionSchema } from '@/types/llmSchema';
import { callClaudeWithTool } from '@/lib/claude/wrapper';

export interface SpellingGrammarError {
  text: string;
  correction: string;
  type: 'spelling' | 'grammar' | 'style';
  context?: string;
}

export interface CheckSpellingGrammarInput {
  text: string;
  context?: string;
  includeStyle?: boolean;
  maxErrors?: number;
}

export interface CheckSpellingGrammarOutput {
  errors: SpellingGrammarError[];
  summary: {
    totalErrors: number;
    spellingErrors: number;
    grammarErrors: number;
    styleErrors: number;
  };
  commonPatterns: Array<{
    type: string;
    count: number;
  }>;
  recommendations: string[];
  llmInteractions: PluginLLMInteraction[];
}

// Input schema
const inputSchema = z.object({
  text: z.string().min(1).max(10000).describe('The text to check for spelling and grammar errors'),
  context: z.string().max(1000).optional().describe('Additional context about the text'),
  includeStyle: z.boolean().optional().default(true).describe('Whether to include style suggestions'),
  maxErrors: z.number().min(1).max(100).optional().default(50).describe('Maximum number of errors to return')
}) satisfies z.ZodType<CheckSpellingGrammarInput>;

// Output schema
const outputSchema = z.object({
  errors: z.array(z.object({
    text: z.string().describe('The incorrect text'),
    correction: z.string().describe('Suggested correction'),
    type: z.enum(['spelling', 'grammar', 'style']).describe('Type of error'),
    context: z.string().optional().describe('Context around the error')
  })).describe('List of spelling, grammar, and style errors found'),
  summary: z.object({
    totalErrors: z.number().describe('Total number of errors found'),
    spellingErrors: z.number().describe('Number of spelling errors'),
    grammarErrors: z.number().describe('Number of grammar errors'),
    styleErrors: z.number().describe('Number of style errors')
  }).describe('Summary statistics of errors found'),
  commonPatterns: z.array(z.object({
    type: z.string().describe('Type of error pattern'),
    count: z.number().describe('Number of occurrences')
  })).describe('Common error patterns identified'),
  recommendations: z.array(z.string()).describe('Recommendations for improving the text'),
  llmInteractions: z.array(llmInteractionSchema).describe('LLM interactions for monitoring and debugging')
});

export class CheckSpellingGrammarTool extends Tool<CheckSpellingGrammarInput, CheckSpellingGrammarOutput> {
  config = {
    id: 'check-spelling-grammar',
    name: 'Check Spelling & Grammar',
    description: 'Analyze text for spelling, grammar, and style issues using Claude',
    version: '1.0.0',
    category: 'analysis' as const,
    costEstimate: '~$0.01 per check (1 Claude call)'
  };
  
  inputSchema = inputSchema;
  outputSchema = outputSchema as any;
  
  async execute(input: CheckSpellingGrammarInput, context: ToolContext): Promise<CheckSpellingGrammarOutput> {
    context.logger.info(`[CheckSpellingGrammarTool] Checking text (${input.text.length} chars)`);
    
    const llmInteractions: PluginLLMInteraction[] = [];
    
    try {
      const { errors, interaction } = await this.checkSpellingGrammar(input);
      llmInteractions.push(interaction);
      
      // Generate summary statistics
      const summary = {
        totalErrors: errors.length,
        spellingErrors: errors.filter(e => e.type === 'spelling').length,
        grammarErrors: errors.filter(e => e.type === 'grammar').length,
        styleErrors: errors.filter(e => e.type === 'style').length
      };
      
      // Identify common patterns
      const patternCounts = new Map<string, number>();
      errors.forEach(error => {
        const count = patternCounts.get(error.type) || 0;
        patternCounts.set(error.type, count + 1);
      });
      
      const commonPatterns = Array.from(patternCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(errors, summary);
      
      return {
        errors,
        summary,
        commonPatterns,
        recommendations,
        llmInteractions
      };
    } catch (error) {
      context.logger.error('[CheckSpellingGrammarTool] Error checking spelling/grammar:', error);
      throw error;
    }
  }
  
  private async checkSpellingGrammar(input: CheckSpellingGrammarInput): Promise<{
    errors: SpellingGrammarError[];
    interaction: PluginLLMInteraction;
  }> {
    const systemPrompt = `You are a proofreading assistant. Identify spelling, grammar, and${input.includeStyle ? ' major style' : ''} issues in text.

Focus on:
- Clear spelling errors
- Grammar mistakes that affect clarity
- ${input.includeStyle ? 'Major style issues (avoid minor stylistic preferences)' : 'Do not include style suggestions'}

Limit to ${input.maxErrors} most important errors.`;

    const userPrompt = `Check this text for spelling, grammar,${input.includeStyle ? ' and style' : ''} issues:

${input.text}

${input.context ? `\nContext: ${input.context}` : ''}

Report any errors found with suggested corrections.`;

    const result = await callClaudeWithTool<{ errors: SpellingGrammarError[] }>({
      system: systemPrompt,
      messages: [{
        role: "user",
        content: userPrompt
      }],
      max_tokens: 1500,
      temperature: 0,
      toolName: "report_errors",
      toolDescription: "Report spelling, grammar, and style errors",
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
                  enum: input.includeStyle ? ["spelling", "grammar", "style"] : ["spelling", "grammar"],
                  description: "Type of error"
                },
                context: { type: "string", description: "Context around the error (optional)" }
              },
              required: ["text", "correction", "type"]
            }
          }
        },
        required: ["errors"]
      }
    });

    const errors = result.toolResult.errors || [];

    return { errors, interaction: result.interaction };
  }
  
  private generateRecommendations(errors: SpellingGrammarError[], summary: CheckSpellingGrammarOutput['summary']): string[] {
    const recommendations: string[] = [];
    
    if (summary.totalErrors > 50) {
      recommendations.push('Consider using a professional proofreading service');
    } else if (summary.totalErrors > 20) {
      recommendations.push('Run document through additional grammar checking tools');
    }
    
    if (summary.grammarErrors > 10) {
      recommendations.push('Review sentence structure and grammar rules');
    }
    
    if (summary.spellingErrors > 15) {
      recommendations.push('Use spell-check tools and consider a dictionary review');
    }
    
    // Find repeated errors
    const errorCounts = new Map<string, number>();
    errors.forEach(error => {
      const key = error.text.toLowerCase();
      errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
    });
    
    const repeatedErrors = Array.from(errorCounts.entries())
      .filter(([_, count]) => count > 2)
      .sort((a, b) => b[1] - a[1]);
    
    if (repeatedErrors.length > 0) {
      const mostCommon = repeatedErrors[0];
      recommendations.push(`Use find-and-replace for repeated error: "${mostCommon[0]}" (appears ${mostCommon[1]} times)`);
    }
    
    return recommendations;
  }
  
  override async beforeExecute(input: CheckSpellingGrammarInput, context: ToolContext): Promise<void> {
    context.logger.info(`[CheckSpellingGrammarTool] Starting check for ${input.text.length} characters`);
  }
  
  override async afterExecute(output: CheckSpellingGrammarOutput, context: ToolContext): Promise<void> {
    context.logger.info(`[CheckSpellingGrammarTool] Found ${output.summary.totalErrors} total errors`);
  }
}

// Export singleton instance
export default new CheckSpellingGrammarTool();