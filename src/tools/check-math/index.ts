import { z } from 'zod';
import { Tool, ToolContext } from '../base/Tool';
import { PluginLLMInteraction } from '@/types/llm';
import { llmInteractionSchema } from '@/types/llmSchema';
import { callClaudeWithTool } from '@/lib/claude/wrapper';

export interface MathError {
  lineStart: number;
  lineEnd: number;
  highlightedText: string;
  description: string;
  errorType: 'calculation' | 'logic' | 'unit' | 'notation' | 'conceptual';
  severity: 'critical' | 'major' | 'minor';
}

export interface CheckMathInput {
  text: string;
  context?: string;
  maxErrors?: number;
}

export interface CheckMathOutput {
  errors: MathError[];
  summary: {
    totalErrors: number;
    calculationErrors: number;
    logicErrors: number;
    unitErrors: number;
    notationErrors: number;
    conceptualErrors: number;
  };
  commonPatterns: Array<{
    type: string;
    count: number;
  }>;
  recommendations: string[];
  llmInteraction: PluginLLMInteraction;
}

// Input schema
const inputSchema = z.object({
  text: z.string().min(1).max(50000).describe('The text to check for mathematical errors'),
  context: z.string().max(1000).optional().describe('Additional context about the text'),
  maxErrors: z.number().min(1).max(100).optional().default(50).describe('Maximum number of errors to return')
}) satisfies z.ZodType<CheckMathInput>;

// Output schema
const outputSchema = z.object({
  errors: z.array(z.object({
    lineStart: z.number().describe('Starting line number where the error occurs'),
    lineEnd: z.number().describe('Ending line number where the error occurs'),
    highlightedText: z.string().describe('The mathematical expression or statement containing the error'),
    description: z.string().describe('Clear explanation of the mathematical error and the correct solution'),
    errorType: z.enum(['calculation', 'logic', 'unit', 'notation', 'conceptual']).describe('Type of mathematical error'),
    severity: z.enum(['critical', 'major', 'minor']).describe('Severity of the error')
  })).describe('List of mathematical errors found'),
  summary: z.object({
    totalErrors: z.number().describe('Total number of errors found'),
    calculationErrors: z.number().describe('Number of calculation errors'),
    logicErrors: z.number().describe('Number of logic errors'),
    unitErrors: z.number().describe('Number of unit errors'),
    notationErrors: z.number().describe('Number of notation errors'),
    conceptualErrors: z.number().describe('Number of conceptual errors')
  }).describe('Summary statistics of errors found'),
  commonPatterns: z.array(z.object({
    type: z.string().describe('Type of error pattern'),
    count: z.number().describe('Number of occurrences')
  })).describe('Common error patterns identified'),
  recommendations: z.array(z.string()).describe('Recommendations for improving the mathematical accuracy'),
  llmInteraction: llmInteractionSchema.describe('LLM interaction for monitoring and debugging')
}) satisfies z.ZodType<CheckMathOutput>;

export class CheckMathTool extends Tool<CheckMathInput, CheckMathOutput> {
  config = {
    id: 'check-math',
    name: 'Check Mathematical Accuracy',
    description: 'Analyze text for mathematical errors including calculations, logic, units, and notation using Claude',
    version: '1.0.0',
    category: 'analysis' as const,
    costEstimate: '~$0.02 per check (1 Claude call with longer analysis)'
  };
  
  inputSchema = inputSchema;
  outputSchema = outputSchema;
  
  async execute(input: CheckMathInput, context: ToolContext): Promise<CheckMathOutput> {
    context.logger.info(`[CheckMathTool] Checking text for math errors (${input.text.length} chars)`);
    
    try {
      const result = await this.checkMathAccuracy(input);
      
      // Limit errors to maxErrors
      const limitedErrors = result.errors.slice(0, input.maxErrors || 50);
      
      // Generate summary statistics
      const summary = {
        totalErrors: limitedErrors.length,
        calculationErrors: limitedErrors.filter(e => e.errorType === 'calculation').length,
        logicErrors: limitedErrors.filter(e => e.errorType === 'logic').length,
        unitErrors: limitedErrors.filter(e => e.errorType === 'unit').length,
        notationErrors: limitedErrors.filter(e => e.errorType === 'notation').length,
        conceptualErrors: limitedErrors.filter(e => e.errorType === 'conceptual').length
      };
      
      // Identify common patterns
      const patternCounts = new Map<string, number>();
      limitedErrors.forEach(error => {
        const count = patternCounts.get(error.errorType) || 0;
        patternCounts.set(error.errorType, count + 1);
      });
      
      const commonPatterns = Array.from(patternCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(limitedErrors, summary);
      
      return {
        errors: limitedErrors,
        summary,
        commonPatterns,
        recommendations,
        llmInteraction: result.llmInteraction
      };
    } catch (error) {
      context.logger.error('[CheckMathTool] Error checking mathematical accuracy:', error);
      throw error;
    }
  }
  
  private async checkMathAccuracy(input: CheckMathInput): Promise<{
    errors: MathError[];
    llmInteraction: PluginLLMInteraction;
  }> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(input);

    const result = await callClaudeWithTool<{ errors: any[] }>({
      system: systemPrompt,
      messages: [{
        role: "user",
        content: userPrompt
      }],
      max_tokens: 4000,
      temperature: 0,
      toolName: "report_math_errors",
      toolDescription: "Report mathematical errors found in the text",
      toolSchema: this.getMathErrorReportingToolSchema(input.maxErrors || 50)
    });

    const errors = this.parseErrors(result.toolResult?.errors);

    return { errors, llmInteraction: result.interaction };
  }
  
  private buildSystemPrompt(): string {
    return `You are a mathematical reviewer specializing in detecting mathematical errors in text. Your task is to identify calculation errors, logical fallacies, unit mismatches, incorrect mathematical notation, and conceptual misunderstandings.

CRITICAL: You MUST use the report_math_errors tool to provide your analysis. Do NOT provide explanatory text responses.

ANALYSIS INSTRUCTIONS:
For each mathematical error found:
1. Use the EXACT line number(s) from the text
2. For highlightedText, include ONLY the problematic mathematical expression or statement
3. Provide a clear explanation of the error and the correct calculation/reasoning

Types of errors to look for:
- Arithmetic errors (e.g., "2 + 2 = 5")
- Unit conversion errors (e.g., "1 km = 100 meters")
- Percentage calculations (e.g., "50% of 100 is 60")
- Statistical misinterpretations
- Logical fallacies in mathematical reasoning
- Incorrect formulas or equations
- Misuse of mathematical notation
- Order of operations errors
- Rounding or approximation errors that significantly affect conclusions

Important guidelines:
- Focus on objective mathematical errors, not stylistic choices
- Consider the context - approximations may be intentional
- Flag errors that would lead to incorrect conclusions
- Be precise about what the error is and how to fix it
- For calculations, show the correct work when relevant
- Consider significant figures and precision appropriately

REMINDER: Use the report_math_errors tool to report your findings.`;
  }
  
  private buildUserPrompt(input: CheckMathInput): string {
    // Add line numbers to content
    const lines = input.text.split('\n');
    const numberedContent = lines.map((line, index) => 
      `${index + 1}: ${line}`
    ).join('\n');

    return `Consider this text. Is the math correct? Think through the details and analyze for any mathematical errors:

${numberedContent}

${input.context ? `\nContext: ${input.context}` : ''}

Report any mathematical errors found with detailed explanations and corrections.`;
  }
  
  private getMathErrorReportingToolSchema(maxErrors: number) {
    return {
      type: "object" as const,
      properties: {
        errors: {
          type: "array",
          description: `List of mathematical errors found (limit to ${maxErrors} most important)`,
          items: {
            type: "object",
            properties: {
              lineStart: {
                type: "number",
                description: "Starting line number where the error occurs",
              },
              lineEnd: {
                type: "number",
                description: "Ending line number where the error occurs",
              },
              highlightedText: {
                type: "string",
                description: "The mathematical expression or statement containing the error",
              },
              description: {
                type: "string",
                description: "Clear explanation of the mathematical error and the correct solution",
              },
            },
            required: ["lineStart", "lineEnd", "highlightedText", "description"],
          },
        },
      },
      required: ["errors"],
    };
  }
  
  private parseErrors(errors: any[]): MathError[] {
    if (!errors || !Array.isArray(errors)) {
      return [];
    }
    
    return errors.map(error => {
      const errorType = this.categorizeError(error.description);
      const severity = this.determineSeverity(errorType, error.description);

      return {
        lineStart: error.lineStart,
        lineEnd: error.lineEnd,
        highlightedText: error.highlightedText,
        description: error.description,
        errorType,
        severity
      };
    });
  }
  
  private categorizeError(description: string): MathError['errorType'] {
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('calculation') || lowerDesc.includes('arithmetic') || 
        lowerDesc.includes('sum') || lowerDesc.includes('product')) {
      return 'calculation';
    }
    if (lowerDesc.includes('unit') || lowerDesc.includes('conversion')) {
      return 'unit';
    }
    if (lowerDesc.includes('logic') || lowerDesc.includes('reasoning') || 
        lowerDesc.includes('fallacy')) {
      return 'logic';
    }
    if (lowerDesc.includes('notation') || lowerDesc.includes('symbol') || 
        lowerDesc.includes('formula')) {
      return 'notation';
    }
    return 'conceptual';
  }
  
  private determineSeverity(errorType: MathError['errorType'], description: string): MathError['severity'] {
    const lowerDesc = description.toLowerCase();
    
    // Critical: Errors that completely invalidate conclusions
    if (lowerDesc.includes('completely wrong') || lowerDesc.includes('fundamental') ||
        lowerDesc.includes('invalidates')) {
      return 'critical';
    }
    
    // Major: Significant errors that affect understanding
    if (errorType === 'calculation' || errorType === 'unit' || 
        lowerDesc.includes('incorrect') || lowerDesc.includes('significant')) {
      return 'major';
    }
    
    // Minor: Small errors or notation issues
    return 'minor';
  }
  
  private generateRecommendations(errors: MathError[], summary: CheckMathOutput['summary']): string[] {
    const recommendations: string[] = [];
    
    if (summary.totalErrors === 0) {
      recommendations.push('No mathematical errors found in the text.');
      return recommendations;
    }
    
    if (summary.totalErrors > 10) {
      recommendations.push('Consider having a mathematician or subject matter expert review the content');
    } else if (summary.totalErrors > 5) {
      recommendations.push('Use calculation verification tools and double-check mathematical work');
    }
    
    if (summary.calculationErrors > 3) {
      recommendations.push('Use a calculator or computer algebra system to verify arithmetic operations');
    }
    
    if (summary.unitErrors > 2) {
      recommendations.push('Pay careful attention to unit conversions and dimensional analysis');
    }
    
    if (summary.logicErrors > 2) {
      recommendations.push('Review logical reasoning and mathematical proof techniques');
    }
    
    if (summary.notationErrors > 3) {
      recommendations.push('Follow standard mathematical notation conventions');
    }
    
    // Check for critical errors
    const criticalErrors = errors.filter(e => e.severity === 'critical');
    if (criticalErrors.length > 0) {
      recommendations.unshift(`Critical errors found that may invalidate conclusions - immediate review required`);
    }
    
    // Find most common error type
    const errorTypeCounts = [
      { type: 'calculation', count: summary.calculationErrors },
      { type: 'logic', count: summary.logicErrors },
      { type: 'unit', count: summary.unitErrors },
      { type: 'notation', count: summary.notationErrors },
      { type: 'conceptual', count: summary.conceptualErrors }
    ].sort((a, b) => b.count - a.count);
    
    if (errorTypeCounts[0].count > 3) {
      recommendations.push(`Focus on improving ${errorTypeCounts[0].type} accuracy (most common error type)`);
    }
    
    return recommendations;
  }
  
  override async beforeExecute(input: CheckMathInput, context: ToolContext): Promise<void> {
    context.logger.info(`[CheckMathTool] Starting mathematical accuracy check for ${input.text.length} characters`);
  }
  
  override async afterExecute(output: CheckMathOutput, context: ToolContext): Promise<void> {
    context.logger.info(`[CheckMathTool] Found ${output.summary.totalErrors} mathematical errors`);
    if (output.summary.totalErrors > 0) {
      const criticalCount = output.errors.filter(e => e.severity === 'critical').length;
      const majorCount = output.errors.filter(e => e.severity === 'major').length;
      context.logger.info(`[CheckMathTool] Severity breakdown: ${criticalCount} critical, ${majorCount} major, ${output.summary.totalErrors - criticalCount - majorCount} minor`);
    }
  }
}

// Export singleton instance
export default new CheckMathTool();