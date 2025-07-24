import { z } from 'zod';
import { Tool, ToolContext } from '../base/Tool';
import { RichLLMInteraction } from '@/types/llm';
import { llmInteractionSchema } from '@/types/llmSchema';
import { callClaudeWithTool } from '@/lib/claude/wrapper';
import { sessionContext } from '@/lib/helicone/sessionContext';
import { createHeliconeHeaders } from '@/lib/helicone/sessions';

export interface ExtractedMathExpression {
  originalText: string;
  hasError: boolean;
  errorType?: string;
  errorExplanation?: string;
  correctedVersion?: string;
  complexityScore: number; // 0-100
  contextImportanceScore: number; // 0-100
  errorSeverityScore: number; // 0-100
  simplifiedExplanation?: string;
  verificationStatus: 'verified' | 'unverified' | 'unverifiable';
}

export interface ExtractMathExpressionsInput {
  text: string;
  verifyCalculations?: boolean;
  includeContext?: boolean;
}

export interface ExtractMathExpressionsOutput {
  expressions: ExtractedMathExpression[];
  llmInteraction: RichLLMInteraction;
}

// Input schema
const inputSchema = z.object({
  text: z.string().min(1).max(50000).describe('The text to extract mathematical expressions from'),
  verifyCalculations: z.boolean().optional().default(true).describe('Whether to verify calculations for errors'),
  includeContext: z.boolean().optional().default(true).describe('Whether to include contextual information')
}) satisfies z.ZodType<ExtractMathExpressionsInput>;

// Output schema
const outputSchema = z.object({
  expressions: z.array(z.object({
    originalText: z.string().describe('The exact mathematical expression as it appears in the text'),
    hasError: z.boolean().describe('Whether the expression contains an error'),
    errorType: z.string().optional().describe('Type of error if present (e.g., "Calculation Error", "Unit Mismatch", "Logic Error")'),
    errorExplanation: z.string().optional().describe('Explanation of the error'),
    correctedVersion: z.string().optional().describe('Corrected version of the expression'),
    complexityScore: z.number().min(0).max(100).describe('How complex the mathematical expression is (0-100)'),
    contextImportanceScore: z.number().min(0).max(100).describe('How important this expression is to the document context (0-100)'),
    errorSeverityScore: z.number().min(0).max(100).describe('How severe the error is if present (0-100)'),
    simplifiedExplanation: z.string().optional().describe('Simplified explanation of complex expressions'),
    verificationStatus: z.enum(['verified', 'unverified', 'unverifiable']).describe('Whether the calculation was verified')
  })).describe('List of extracted mathematical expressions'),
  llmInteraction: llmInteractionSchema.describe('LLM interaction for monitoring and debugging')
}) satisfies z.ZodType<ExtractMathExpressionsOutput>;

export class ExtractMathExpressionsTool extends Tool<ExtractMathExpressionsInput, ExtractMathExpressionsOutput> {
  config = {
    id: 'extract-math-expressions',
    name: 'Extract Mathematical Expressions',
    description: 'Extract and analyze mathematical expressions from text, including error detection and complexity assessment',
    version: '1.0.0',
    category: 'analysis' as const,
    costEstimate: '~$0.02 per extraction (1 Claude call)',
    path: '/tools/extract-math-expressions',
    status: 'stable' as const
  };
  
  inputSchema = inputSchema;
  outputSchema = outputSchema;
  
  async execute(input: ExtractMathExpressionsInput, context: ToolContext): Promise<ExtractMathExpressionsOutput> {
    context.logger.info(`[ExtractMathExpressionsTool] Extracting math expressions from ${input.text.length} chars`);
    
    try {
      const result = await this.extractExpressions(input);
      
      return {
        expressions: result.expressions,
        llmInteraction: result.llmInteraction
      };
    } catch (error) {
      context.logger.error('[ExtractMathExpressionsTool] Error extracting expressions:', error);
      throw error;
    }
  }
  
  private async extractExpressions(input: ExtractMathExpressionsInput): Promise<{
    expressions: ExtractedMathExpression[];
    llmInteraction: RichLLMInteraction;
  }> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(input);

    // Get session context if available
    const currentSession = sessionContext.getSession();
    let sessionConfig = currentSession ? 
      sessionContext.withPath('/plugins/math/extract-math-expressions') : 
      undefined;
    
    // Add properties if we have a session config
    if (sessionConfig) {
      sessionConfig = sessionContext.withProperties({
        plugin: 'math',
        operation: 'extract-expressions',
        tool: 'extract-math-expressions'
      });
    }
    
    const heliconeHeaders = sessionConfig ? 
      createHeliconeHeaders(sessionConfig) : 
      undefined;

    const result = await callClaudeWithTool<{ expressions: ExtractedMathExpression[] }>({
      system: systemPrompt,
      messages: [{
        role: "user",
        content: userPrompt
      }],
      max_tokens: 4000,
      temperature: 0,
      toolName: "extract_math_expressions",
      toolDescription: "Extract and analyze mathematical expressions from the text",
      toolSchema: this.getMathExtractionToolSchema(),
      heliconeHeaders
    });

    const expressions = result.toolResult?.expressions || [];

    return { expressions, llmInteraction: result.interaction };
  }
  
  private buildSystemPrompt(): string {
    return `You are a mathematical analysis expert. Your task is to extract all mathematical expressions from text and analyze them for correctness, complexity, and importance.

CRITICAL: You MUST use the extract_math_expressions tool to provide your analysis.

Extract ALL mathematical content including:
- Equations and formulas (2+2=4, E=mc², etc.)
- Statistical calculations or percentages
- Numerical comparisons (X is 3x larger than Y)
- Unit conversions
- Mathematical reasoning or proofs
- Back-of-the-envelope calculations

For each expression:
1. Extract the EXACT text as it appears
2. Verify if calculations are correct
3. Assess complexity (0-100):
   - 0-30: Simple arithmetic
   - 30-60: Moderate calculations (percentages, basic algebra)
   - 60-80: Complex formulas or multi-step calculations
   - 80-100: Advanced mathematics (calculus, statistics, proofs)

4. Assess contextual importance (0-100):
   - How central is this to the document's argument?
   - Does the conclusion depend on this calculation?

5. For errors, assess severity (0-100):
   - 0-30: Minor errors that don't affect conclusions
   - 30-60: Moderate errors that might mislead
   - 60-80: Significant errors affecting understanding
   - 80-100: Critical errors that invalidate conclusions

Provide simplified explanations for complex expressions when helpful.`;
  }
  
  private buildUserPrompt(input: ExtractMathExpressionsInput): string {
    return `Extract and analyze all mathematical expressions from this text:

${input.text}

${input.verifyCalculations ? 'Verify all calculations for correctness.' : ''}
${input.includeContext ? 'Consider the context when assessing importance.' : ''}

Extract ALL mathematical content, no matter how simple or complex.`;
  }
  
  private getMathExtractionToolSchema() {
    return {
      type: "object" as const,
      properties: {
        expressions: {
          type: "array",
          description: "List of extracted mathematical expressions",
          items: {
            type: "object",
            properties: {
              originalText: {
                type: "string",
                description: "The exact mathematical expression as it appears in the text",
              },
              hasError: {
                type: "boolean",
                description: "Whether the expression contains an error",
              },
              errorType: {
                type: "string",
                description: "Type of error if present (e.g., 'Calculation Error', 'Unit Mismatch', 'Logic Error')",
              },
              errorExplanation: {
                type: "string",
                description: "Explanation of the error",
              },
              correctedVersion: {
                type: "string",
                description: "Corrected version of the expression",
              },
              complexityScore: {
                type: "number",
                description: "How complex the mathematical expression is (0-100)",
              },
              contextImportanceScore: {
                type: "number",
                description: "How important this expression is to the document context (0-100)",
              },
              errorSeverityScore: {
                type: "number",
                description: "How severe the error is if present (0-100)",
              },
              simplifiedExplanation: {
                type: "string",
                description: "Simplified explanation of complex expressions",
              },
              verificationStatus: {
                type: "string",
                enum: ["verified", "unverified", "unverifiable"],
                description: "Whether the calculation was verified",
              },
            },
            required: ["originalText", "hasError", "complexityScore", "contextImportanceScore", "errorSeverityScore", "verificationStatus"],
          },
        },
      },
      required: ["expressions"],
    };
  }
  
  override async beforeExecute(input: ExtractMathExpressionsInput, context: ToolContext): Promise<void> {
    context.logger.info(`[ExtractMathExpressionsTool] Starting extraction for ${input.text.length} characters`);
  }
  
  override async afterExecute(output: ExtractMathExpressionsOutput, context: ToolContext): Promise<void> {
    context.logger.info(`[ExtractMathExpressionsTool] Extracted ${output.expressions.length} expressions`);
    const withErrors = output.expressions.filter(e => e.hasError).length;
    if (withErrors > 0) {
      context.logger.info(`[ExtractMathExpressionsTool] Found ${withErrors} expressions with errors`);
    }
  }
}

// Export singleton instance
export const extractMathExpressionsTool = new ExtractMathExpressionsTool();
export default extractMathExpressionsTool;