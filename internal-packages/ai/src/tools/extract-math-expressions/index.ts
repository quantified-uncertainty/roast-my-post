import { z } from 'zod';
import { Tool, ToolContext } from '../base/Tool';
import { callClaudeWithTool } from '@roast/ai';
import { sessionContext } from '@roast/ai';
import { createHeliconeHeaders, type HeliconeSessionConfig } from '@roast/ai';
import { generateCacheSeed } from '@/tools/shared/cache-utils';
import type { MathErrorType, MathSeverity } from '@/tools/shared/math-schemas';

export interface ExtractedMathExpression {
  originalText: string;
  hasError: boolean;
  errorType?: MathErrorType;
  errorExplanation?: string;
  correctedVersion?: string;
  conciseCorrection?: string; // e.g., "45 → 234", "4x → 5x", "×0.15 → ×1.15"
  complexityScore: number; // 0-100
  contextImportanceScore: number; // 0-100
  errorSeverityScore: number; // 0-100
  simplifiedExplanation?: string;
  verificationStatus: 'verified' | 'unverified' | 'unverifiable';
  severity?: MathSeverity;
}

export interface ExtractMathExpressionsInput {
  text: string;
  verifyCalculations?: boolean;
  includeContext?: boolean;
}

export interface ExtractMathExpressionsOutput {
  expressions: ExtractedMathExpression[];
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
    errorType: z.enum(['calculation', 'logic', 'unit', 'notation', 'conceptual']).optional().describe('Type of mathematical error'),
    severity: z.enum(['critical', 'major', 'minor']).optional().describe('Severity of the error'),
    errorExplanation: z.string().optional().describe('Explanation of the error'),
    correctedVersion: z.string().optional().describe('Corrected version of the expression'),
    conciseCorrection: z.string().optional().describe('Concise summary of the correction (e.g., "45 → 234", "4x → 5x", "×0.15 → ×1.15")'),
    complexityScore: z.number().min(0).max(100).describe('How complex the mathematical expression is (0-100)'),
    contextImportanceScore: z.number().min(0).max(100).describe('How important this expression is to the document context (0-100)'),
    errorSeverityScore: z.number().min(0).max(100).describe('How severe the error is if present (0-100)'),
    simplifiedExplanation: z.string().optional().describe('Simplified explanation of complex expressions'),
    verificationStatus: z.enum(['verified', 'unverified', 'unverifiable']).describe('Whether the calculation was verified')
  })).describe('List of extracted mathematical expressions')
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
        expressions: result.expressions
      };
    } catch (error) {
      context.logger.error('[ExtractMathExpressionsTool] Error extracting expressions:', error);
      throw error;
    }
  }
  
  private async extractExpressions(input: ExtractMathExpressionsInput): Promise<{
    expressions: ExtractedMathExpression[];
  }> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(input);

    // Get session context if available
    const currentSession = sessionContext.getSession();
    let sessionConfig: HeliconeSessionConfig | undefined = undefined;
    
    if (currentSession) {
      // First create a new config with the updated path
      sessionConfig = sessionContext.withPath('/plugins/math/extract-math-expressions');
      
      // Then add properties to the new config (not the original context)
      if (sessionConfig) {
        sessionConfig = {
          ...sessionConfig,
          customProperties: {
            ...sessionConfig.customProperties,
            plugin: 'math',
            operation: 'extract-expressions',
            tool: 'extract-math-expressions'
          }
        };
      }
    }
    
    const heliconeHeaders = sessionConfig ? 
      createHeliconeHeaders(sessionConfig) : 
      undefined;

    // Generate cache seed based on content for consistent caching
    const cacheSeed = generateCacheSeed('math-extract', [
      input.text,
      input.verifyCalculations ?? true,
      input.includeContext ?? true
    ]);

    const result = await callClaudeWithTool<{ expressions: ExtractedMathExpression[] }>({
      system: systemPrompt,
      messages: [{
        role: "user",
        content: userPrompt
      }],
      max_tokens: 4000,
      temperature: 0,
      toolName: "extract_math_expressions",
      toolDescription: "Extract ONLY mathematical expressions that appear to contain errors",
      toolSchema: this.getMathExtractionToolSchema(),
      enablePromptCaching: true,
      heliconeHeaders,
      cacheSeed
    });

    const expressions = result.toolResult?.expressions || [];

    return { expressions };
  }
  
  private buildSystemPrompt(): string {
    return `You are a mathematical analysis expert. Your task is to identify ONLY mathematical expressions that are likely INCORRECT (20%+ chance of being wrong).

CRITICAL: You MUST use the extract_math_expressions tool to provide your analysis.

CRITICAL: You work alongside Fact-Check and Forecast extractors. Stay in your lane!

IMPORTANT FILTERING RULES:
1. ONLY extract expressions you suspect are mathematically incorrect (20%+ chance)
2. DO NOT extract:
   - Simple correct percentages like "54%" or "increased by 30%"
   - Trivial arithmetic that is correct
   - Factual claims (handled by fact-checking plugin)
   - Forecasting/predictions (handled by forecasting plugin)
   - Statistical claims without calculations shown
   - Correct unit conversions
   
3. DO extract:
   - Clear arithmetic errors (2+2=5, 45% of 400 = 125)
   - Unit mismatch errors (comparing km to km/h)
   - Order of magnitude errors
   - Formula application errors (F=ma used incorrectly)
   - Percentage calculation errors
   - Compound interest/growth miscalculations

CRITICALLY IMPORTANT - DO NOT EXTRACT (Other tools handle these):
- FACTUAL CLAIMS: "GDP was $21T in 2023" (Fact-check plugin verifies the number)
- FUTURE PREDICTIONS: "Revenue will grow 50% next year" (Forecast plugin)
- HISTORICAL FACTS: "Stock price was $150 in January" (Fact-check plugin)
- RESEARCH FINDINGS: "Study shows 75% improvement" (Fact-check plugin)
- PROBABILITY FORECASTS: "70% chance of success" (Forecast plugin)

EDGE CASES - How to decide:
- "Revenue grew 3x from $10M to $25M" → EXTRACT (math error: should be $30M)
- "Revenue grew from $10M to $30M" → DON'T EXTRACT (no calculation shown)
- "15% of 1000 users is 125" → EXTRACT (math error: should be 150)
- "We have 15% market share" → DON'T EXTRACT (just a statistic)
- "Efficiency improved by 150%" → DON'T EXTRACT (unless calculation shown)

For each SUSPECTED ERROR:
1. Extract the EXACT text as it appears
2. Verify the calculation - only include if likely wrong
3. Set hasError = true for all extracted expressions
4. Assess complexity (0-100) based on the calculation type
5. Assess contextual importance (0-100) - how much does this error matter?
6. Assess error severity (0-100):
   - 0-30: Minor errors that don't affect conclusions
   - 30-60: Moderate errors that might mislead
   - 60-80: Significant errors affecting understanding
   - 80-100: Critical errors that invalidate conclusions

7. For errors, provide a conciseCorrection that shows ONLY the key change:
   - Arithmetic: "125 → 100"
   - Coefficients: "4x → 5x"
   - Operations: "×0.15 → ×1.15"
   - Order of magnitude: "50,000 → 5,000,000"
   - Units: "km → km/h"
   
Keep conciseCorrection under 15 characters when possible.

Remember: If you're not reasonably confident it's a MATH ERROR, don't include it.`;
  }
  
  private buildUserPrompt(input: ExtractMathExpressionsInput): string {
    const requirements = [];
    if (input.verifyCalculations) requirements.push('Verify calculations and ONLY include those likely to be incorrect.');
    if (input.includeContext) requirements.push('Consider the context when assessing error importance.');
    requirements.push('ONLY extract mathematical expressions that appear to have errors (20%+ chance of being wrong).');
    requirements.push('DO NOT include trivial percentages, correct calculations, or non-mathematical claims.');
    requirements.push('DO NOT extract factual statistics or future predictions - other plugins handle those.');
    
    return `<task>
  <instruction>Identify and extract ONLY mathematical expressions that are likely INCORRECT</instruction>
  
  <content>
${input.text}
  </content>
  
  <parameters>
    <verify_calculations>${input.verifyCalculations ?? true}</verify_calculations>
    <include_context>${input.includeContext ?? true}</include_context>
  </parameters>
  
  <requirements>
    ${requirements.join('\n    ')}
  </requirements>
  
  <critical_reminders>
    - Only include expressions with CALCULATION ERRORS (wrong math)
    - Skip factual claims like "GDP was $21T" (fact-checker handles)
    - Skip predictions like "will grow 50%" (forecaster handles)
    - Skip statistics without shown calculations
    - If the math looks correct, DON'T include it
    - Focus ONLY on computational/arithmetic mistakes
  </critical_reminders>
</task>`;
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
                enum: ["calculation", "logic", "unit", "notation", "conceptual"],
                description: "Type of mathematical error",
              },
              severity: {
                type: "string",
                enum: ["critical", "major", "minor"],
                description: "Severity of the error",
              },
              errorExplanation: {
                type: "string",
                description: "Explanation of the error",
              },
              correctedVersion: {
                type: "string",
                description: "Corrected version of the expression",
              },
              conciseCorrection: {
                type: "string",
                description: "Concise summary of the correction showing only the key change (e.g., '45 → 234', '4x → 5x', '×0.15 → ×1.15')",
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