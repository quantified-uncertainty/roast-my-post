import { z } from 'zod';
import { Tool, ToolContext } from '../base/Tool';
import { RichLLMInteraction } from '@/types/llm';
import { llmInteractionSchema } from '@/types/llmSchema';
import { callClaudeWithTool, MODEL_CONFIG } from '@/lib/claude/wrapper';
import { categorizeErrorAdvanced, determineSeverityAdvanced } from './errorCategories';
import { sessionContext } from '@/lib/helicone/sessionContext';
import { createHeliconeHeaders } from '@/lib/helicone/sessions';
import { 
  mathStatusSchema, 
  mathExplanationSchema, 
  mathReasoningSchema,
  mathErrorDetailsSchema,
  MathVerificationStatus,
  MathErrorDetails
} from '@/tools/shared/math-schemas';

export interface CheckMathInput {
  statement: string;
  context?: string;
}

export interface CheckMathOutput {
  statement: string;
  status: MathVerificationStatus;
  explanation: string;
  reasoning: string;
  errorDetails?: MathErrorDetails;
  llmInteraction: RichLLMInteraction;
}

// Input schema
const inputSchema = z.object({
  statement: z.string().min(1).max(1000).describe('A single mathematical statement to analyze (e.g., "2 + 2 = 4" or "The square root of 16 is 4")'),
  context: z.string().max(500).optional().describe('Additional context about the statement')
}) satisfies z.ZodType<CheckMathInput>;

// Output schema
const outputSchema = z.object({
  statement: z.string().describe('The original statement that was analyzed'),
  status: z.enum(['verified_true', 'verified_false', 'cannot_verify']).describe('Analysis result'),
  explanation: z.string().describe('Clear explanation of why the statement is true, false, or cannot be verified'),
  reasoning: z.string().describe('Detailed reasoning behind the analysis'),
  errorDetails: z.object({
    errorType: z.enum(['calculation', 'logic', 'unit', 'notation', 'conceptual']).describe('Type of mathematical error'),
    severity: z.enum(['critical', 'major', 'minor']).describe('Severity of the error'),
    conciseCorrection: z.string().describe('Concise summary of the correction (e.g., "45 → 234", "4x → 5x")'),
    expectedValue: z.string().optional().describe('The expected/correct value'),
    actualValue: z.string().optional().describe('The actual/incorrect value found in the statement')
  }).optional().describe('Details about the error (only present when status is verified_false)'),
  llmInteraction: llmInteractionSchema.describe('LLM interaction for monitoring and debugging')
}) satisfies z.ZodType<CheckMathOutput>;

export class CheckMathTool extends Tool<CheckMathInput, CheckMathOutput> {
  config = {
    id: 'check-math',
    name: 'Check Mathematical Accuracy',
    description: 'Analyze text for mathematical errors including calculations, logic, units, and notation using Claude',
    version: '1.0.0',
    category: 'analysis' as const,
    costEstimate: '~$0.02 per check (1 Claude call with longer analysis)',
    path: '/tools/check-math',
    status: 'stable' as const
  };
  
  inputSchema = inputSchema;
  outputSchema = outputSchema;
  
  async execute(input: CheckMathInput, context: ToolContext): Promise<CheckMathOutput> {
    context.logger.info(`[CheckMathTool] Analyzing mathematical statement: "${input.statement}"`);
    
    try {
      const result = await this.analyzeMathStatement(input, context);
      return result;
    } catch (error) {
      context.logger.error('[CheckMathTool] Error analyzing statement:', error);
      return {
        statement: input.statement,
        status: 'cannot_verify',
        explanation: 'Failed to analyze the mathematical statement due to a technical error.',
        reasoning: `Technical error occurred during analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
        llmInteraction: {
          model: 'error',
          prompt: '',
          response: '',
          tokensUsed: { prompt: 0, completion: 0, total: 0 },
          timestamp: new Date(),
          duration: 0
        }
      };
    }
  }

  private async analyzeMathStatement(input: CheckMathInput, context: ToolContext): Promise<CheckMathOutput> {
    // Get session context if available
    const currentSession = sessionContext.getSession();
    const sessionConfig = currentSession ? 
      sessionContext.withPath('/plugins/math/check-math-statement') : 
      undefined;
    const heliconeHeaders = sessionConfig ? 
      createHeliconeHeaders(sessionConfig) : 
      undefined;

    // Generate cache seed for consistent responses
    const { generateCacheSeed } = await import('@/tools/shared/cache-utils');
    const cacheSeed = generateCacheSeed('math-statement-check', [
      input.statement,
      input.context || ''
    ]);

    // Use Claude with tool output for structured response
    const systemPrompt = `You are a mathematical analyzer. Analyze mathematical statements and determine if they are true, false, or cannot be verified.`;
    
    const result = await callClaudeWithTool<{
      status: MathVerificationStatus;
      explanation: string;
      reasoning: string;
      errorDetails?: MathErrorDetails;
    }>({
      system: systemPrompt,
      messages: [{
        role: "user",
        content: `Analyze this mathematical statement for accuracy: "${input.statement}"${input.context ? `\nContext: ${input.context}` : ''}`
      }],
      model: MODEL_CONFIG.analysis,
      max_tokens: 2000,
      temperature: 0.1,
      toolName: 'analyze_math_statement',
      toolDescription: 'Report the analysis of a mathematical statement',
      toolSchema: {
        type: "object" as const,
        properties: {
          status: mathStatusSchema,
          explanation: mathExplanationSchema,
          reasoning: mathReasoningSchema,
          errorDetails: mathErrorDetailsSchema
        },
        required: ["status", "explanation", "reasoning"]
      },
      enablePromptCaching: true,
      heliconeHeaders,
      cacheSeed
    });

    const toolResult = result.toolResult;

    return {
      statement: input.statement,
      status: toolResult.status,
      explanation: toolResult.explanation,
      reasoning: toolResult.reasoning,
      errorDetails: toolResult.errorDetails,
      llmInteraction: result.interaction
    };
  }

}

// Export singleton instance
export const checkMathTool = new CheckMathTool();
export default checkMathTool;