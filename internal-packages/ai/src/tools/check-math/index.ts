import { z } from 'zod';
import { Tool, ToolContext } from '../base/Tool';
import { callClaudeWithTool, MODEL_CONFIG } from '../../claude/wrapper';
import { categorizeErrorAdvanced, determineSeverityAdvanced } from './errorCategories';
// Session management is now automatic through the global session manager
import { generateCacheSeed } from '../shared/cache-utils';
import { 
  mathStatusSchema, 
  mathExplanationSchema, 
  mathReasoningSchema,
  mathErrorDetailsSchema,
  MathVerificationStatus,
  MathErrorDetails
} from '../shared/math-schemas';

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
    displayCorrection: z.string().describe('XML markup for displaying correction (e.g., "<r:replace from=\"45\" to=\"234\"/>")'),
    expectedValue: z.string().optional().describe('The expected/correct value'),
    actualValue: z.string().optional().describe('The actual/incorrect value found in the statement')
  }).optional().describe('Details about the error (only present when status is verified_false)'),
}) satisfies z.ZodType<CheckMathOutput>;

export class CheckMathTool extends Tool<CheckMathInput, CheckMathOutput> {
  config = {
    id: 'check-math',
    name: 'Check Mathematical Accuracy',
    description: 'Analyze text for mathematical errors including calculations, logic, units, and notation using Claude',
    version: '1.0.0',
    category: 'checker' as const,
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
      };
    }
  }

  private async analyzeMathStatement(input: CheckMathInput, context: ToolContext): Promise<CheckMathOutput> {
    // Generate cache seed for consistent responses
    const cacheSeed = generateCacheSeed('math-statement-check', [
      input.statement,
      input.context || ''
    ]);

    // Use Claude with tool output for structured response
    const systemPrompt = `Verify math statements concisely. Focus on the calculation/logic error if any.`;
    
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
      model: MODEL_CONFIG.analysis, // Use Sonnet for accuracy
      max_tokens: 500,
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
      // Session headers are now added automatically by the wrapper
      cacheSeed
    });

    const toolResult = result.toolResult;

    return {
      statement: input.statement,
      status: toolResult.status,
      explanation: toolResult.explanation,
      reasoning: toolResult.reasoning,
      errorDetails: toolResult.errorDetails,
    };
  }

}

// Export singleton instance
export const checkMathTool = new CheckMathTool();
export default checkMathTool;