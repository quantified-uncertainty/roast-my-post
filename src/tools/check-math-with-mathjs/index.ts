import { evaluate, format, parse } from 'mathjs';
import { Tool } from '../base/Tool';
import { logger } from '@/lib/logger';
import type { ToolContext } from '../base/Tool';
import { callClaude, MODEL_CONFIG } from '@/lib/claude/wrapper';
import type { 
  MathVerificationStatus, 
  MathErrorDetails, 
  MathVerificationDetails 
} from '@/tools/shared/math-schemas';

// Import types and schemas
import { CheckMathWithMathJsInput, CheckMathWithMathJsOutput } from './types';
import { inputSchema, outputSchema } from './schemas';
import { buildSystemPrompt, buildUserPrompt } from './prompts';

export class CheckMathWithMathJsTool extends Tool<CheckMathWithMathJsInput, CheckMathWithMathJsOutput> {
  config = {
    id: 'check-math-with-mathjs',
    name: 'Check Mathematical Accuracy with MathJS',
    description: 'Verify a single mathematical statement using MathJS computation',
    version: '1.0.0',
    category: 'analysis' as const,
    costEstimate: 'Free for simple math, ~$0.01 for complex statements requiring LLM',
    path: '/tools/check-math-with-mathjs',
    status: 'stable' as const
  };
  
  inputSchema = inputSchema;
  outputSchema = outputSchema as any;
  
  async execute(input: CheckMathWithMathJsInput, context: ToolContext): Promise<CheckMathWithMathJsOutput> {
    try {
      // First, try direct MathJS evaluation
      const directResult = await this.tryDirectEvaluation(input, context);
      if (directResult) {
        return directResult;
      }
      
      // If direct evaluation failed, fall back to LLM-assisted verification
      return await this.llmAssistedVerification(input, context);
    } catch (error) {
      // Return a graceful error response
      return {
        statement: input.statement,
        status: 'cannot_verify',
        explanation: `A technical error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
  
  private async tryDirectEvaluation(input: CheckMathWithMathJsInput, context: ToolContext): Promise<CheckMathWithMathJsOutput | null> {
    context.logger.info(`[CheckMathWithMathJsTool] Attempting direct MathJS evaluation for: "${input.statement}"`);
    
    try {
      // First, try to handle special mathematical symbols
      let normalizedStatement = input.statement;
      normalizedStatement = normalizedStatement.replace(/π/g, 'pi');
      normalizedStatement = normalizedStatement.replace(/×/g, '*');
      normalizedStatement = normalizedStatement.replace(/÷/g, '/');
      normalizedStatement = normalizedStatement.replace(/−/g, '-');
      normalizedStatement = normalizedStatement.replace(/–/g, '-');
      
      // Parse the statement to find equals sign
      const parts = normalizedStatement.split('=');
      if (parts.length !== 2) {
        // Not a simple equation, need LLM help
        return null;
      }
      
      const leftSide = parts[0].trim();
      const rightSide = parts[1].trim();
      
      // Try to evaluate both sides
      let leftValue: any;
      let rightValue: any;
      let leftExpression = leftSide;
      let rightExpression = rightSide;
      
      try {
        leftValue = evaluate(leftSide);
        leftExpression = leftSide;
      } catch (e) {
        // Try some common conversions
        const converted = this.convertToMathJs(leftSide);
        if (!converted) return null;
        leftExpression = converted;
        leftValue = evaluate(leftExpression);
      }
      
      try {
        rightValue = evaluate(rightSide);
        rightExpression = rightSide;
      } catch (e) {
        // Try some common conversions
        const converted = this.convertToMathJs(rightSide);
        if (!converted) return null;
        rightExpression = converted;
        rightValue = evaluate(rightExpression);
      }
      
      // Format the values for comparison
      const leftFormatted = format(leftValue, { precision: 14 });
      const rightFormatted = format(rightValue, { precision: 14 });
      
      // Compare values (handle floating point precision)
      const isEqual = Math.abs(leftValue - rightValue) < 1e-10;
      
      if (isEqual) {
        return {
          statement: input.statement,
          status: 'verified_true',
          explanation: `The statement is correct. ${leftExpression} equals ${leftFormatted}.`,
          verificationDetails: {
            mathJsExpression: leftExpression,
            computedValue: leftFormatted,
            steps: [
              { expression: leftExpression, result: leftFormatted },
              { expression: rightExpression, result: rightFormatted }
            ]
          },
        };
      } else {
        return {
          statement: input.statement,
          status: 'verified_false',
          explanation: `The statement is incorrect. ${leftExpression} equals ${leftFormatted}, not ${rightFormatted}.`,
          verificationDetails: {
            mathJsExpression: leftExpression,
            computedValue: leftFormatted,
            steps: [
              { expression: leftExpression, result: leftFormatted },
              { expression: rightExpression, result: rightFormatted }
            ]
          },
          errorDetails: {
            errorType: 'calculation',
            severity: 'major',
            conciseCorrection: `${rightFormatted} → ${leftFormatted}`,
            expectedValue: leftFormatted,
            actualValue: rightFormatted
          },
        };
      }
    } catch (error) {
      context.logger.debug(`[CheckMathWithMathJsTool] Direct evaluation failed: ${error}`);
      return null;
    }
  }
  
  private convertToMathJs(expression: string): string | null {
    // Try some common conversions
    let converted = expression;
    
    // Convert mathematical symbols
    converted = converted.replace(/π/g, 'pi');
    converted = converted.replace(/×/g, '*');
    converted = converted.replace(/÷/g, '/');
    converted = converted.replace(/−/g, '-');  // en dash
    converted = converted.replace(/–/g, '-');  // em dash
    
    // Convert word numbers to digits
    const wordNumbers: Record<string, string> = {
      'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
      'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
      'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
      'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
      'eighteen': '18', 'nineteen': '19', 'twenty': '20', 'thirty': '30',
      'forty': '40', 'fifty': '50', 'sixty': '60', 'seventy': '70',
      'eighty': '80', 'ninety': '90', 'hundred': '100', 'thousand': '1000',
      'million': '1000000', 'billion': '1000000000'
    };
    
    for (const [word, num] of Object.entries(wordNumbers)) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      converted = converted.replace(regex, num);
    }
    
    // Convert common unit words
    converted = converted.replace(/\bkilometer(s)?\b/gi, 'km');
    converted = converted.replace(/\bmeter(s)?\b/gi, 'm');
    converted = converted.replace(/\bcentimeter(s)?\b/gi, 'cm');
    converted = converted.replace(/\bmillimeter(s)?\b/gi, 'mm');
    converted = converted.replace(/\bkilogram(s)?\b/gi, 'kg');
    converted = converted.replace(/\bgram(s)?\b/gi, 'g');
    converted = converted.replace(/\bliter(s)?\b/gi, 'L');
    converted = converted.replace(/\bmilliliter(s)?\b/gi, 'mL');
    
    // Convert "of" to multiplication for percentages
    converted = converted.replace(/(\d+\.?\d*%?)\s+of\s+/gi, '$1 * ');
    
    // Convert common operations
    converted = converted.replace(/\bplus\b/gi, '+');
    converted = converted.replace(/\bminus\b/gi, '-');
    converted = converted.replace(/\btimes\b/gi, '*');
    converted = converted.replace(/\bmultiplied by\b/gi, '*');
    converted = converted.replace(/\bdivided by\b/gi, '/');
    converted = converted.replace(/\bover\b/gi, '/');
    converted = converted.replace(/\bsquared\b/gi, '^2');
    converted = converted.replace(/\bcubed\b/gi, '^3');
    converted = converted.replace(/\bto the power of\b/gi, '^');
    converted = converted.replace(/\braised to\b/gi, '^');
    
    // Try to evaluate the converted expression
    try {
      evaluate(converted);
      return converted;
    } catch {
      return null;
    }
  }
  
  private async llmAssistedVerification(input: CheckMathWithMathJsInput, context: ToolContext): Promise<CheckMathWithMathJsOutput> {
    context.logger.info(`[CheckMathWithMathJsTool] Falling back to LLM-assisted verification`);
    
    const systemPrompt = `You are a mathematical verification assistant. Your task is to verify mathematical statements using MathJS syntax.

Given a mathematical statement, you should:
1. Convert it to a MathJS expression that can be evaluated
2. Determine if the statement is true, false, or cannot be verified
3. Provide a clear explanation

Important MathJS syntax:
- Percentages: Use % directly (e.g., 30% evaluates to 0.3)
- Units: Use unit syntax (e.g., 5 km to m, 1 kg + 500 g)
- Functions: sqrt(), sin(), cos(), log(), etc.
- Constants: pi, e, tau

Respond with a JSON object containing:
- status: "verified_true", "verified_false", or "cannot_verify"
- explanation: Clear explanation of the verification
- mathJsExpression: The MathJS expression used (if applicable)
- computedValue: The computed value (if applicable)
- errorDetails: (only if verified_false) Object with:
  - errorType: Must be one of: "calculation", "logic", "unit", "notation", or "conceptual"
  - severity: Must be one of: "critical", "major", or "minor"
  - conciseCorrection: Brief correction like "60 → 70" or "5 → 4"
  - expectedValue: The correct value (optional)
  - actualValue: The incorrect value from the statement (optional)`;

    const userPrompt = `Verify this mathematical statement: "${input.statement}"${input.context ? `\nContext: ${input.context}` : ''}`;
    
    // Generate cache seed
    const { generateCacheSeed } = await import('@/tools/shared/cache-utils');
    const cacheSeed = generateCacheSeed('math-check-mathjs-llm', [
      input.statement,
      input.context || ''
    ]);
    
    try {
      const result = await callClaude({
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        max_tokens: 1000,
        temperature: 0,
        model: MODEL_CONFIG.analysis,
        enablePromptCaching: true,
        cacheSeed
      });
      
      // Parse the response
      let parsed: any;
      try {
        // Extract JSON from the response
        const firstContent = result.response.content[0];
        if (firstContent.type === 'text') {
          const jsonMatch = firstContent.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON found in response');
          }
        } else {
          throw new Error('Expected text content in response');
        }
      } catch (e) {
        // If parsing fails, return cannot_verify
        return {
          statement: input.statement,
          status: 'cannot_verify',
          explanation: 'Could not parse the verification result.',
        };
      }
      
      // Build the output
      const output: CheckMathWithMathJsOutput = {
        statement: input.statement,
        status: parsed.status || 'cannot_verify',
        explanation: parsed.explanation || 'No explanation provided.',
      };
      
      // Add verification details if present
      if (parsed.mathJsExpression || parsed.computedValue) {
        output.verificationDetails = {
          mathJsExpression: String(parsed.mathJsExpression || ''),
          computedValue: String(parsed.computedValue || ''),
          steps: parsed.steps || []
        };
      }
      
      // Add error details if present
      if (parsed.errorDetails) {
        // Map any invalid error types to valid ones
        const validErrorTypes = ['calculation', 'logic', 'unit', 'notation', 'conceptual'];
        const errorType = parsed.errorDetails.errorType;
        if (!validErrorTypes.includes(errorType)) {
          // Map common variations to valid types
          if (errorType === 'rounding_error' || errorType === 'rounding') {
            parsed.errorDetails.errorType = 'calculation';
          } else {
            parsed.errorDetails.errorType = 'calculation'; // Default to calculation
          }
        }
        // Ensure all string fields are actually strings
        if (parsed.errorDetails.expectedValue !== undefined) {
          parsed.errorDetails.expectedValue = String(parsed.errorDetails.expectedValue);
        }
        if (parsed.errorDetails.actualValue !== undefined) {
          parsed.errorDetails.actualValue = String(parsed.errorDetails.actualValue);
        }
        if (parsed.errorDetails.conciseCorrection !== undefined) {
          parsed.errorDetails.conciseCorrection = String(parsed.errorDetails.conciseCorrection);
        }
        output.errorDetails = parsed.errorDetails;
      }
      
      return output;
    } catch (error) {
      return {
        statement: input.statement,
        status: 'cannot_verify',
        explanation: `LLM verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
  
  override async beforeExecute(input: CheckMathWithMathJsInput, context: ToolContext): Promise<void> {
    context.logger.info(`[CheckMathWithMathJsTool] Starting MathJS verification for statement: "${input.statement}"`);
  }
  
  override async afterExecute(output: CheckMathWithMathJsOutput, context: ToolContext): Promise<void> {
    context.logger.info(`[CheckMathWithMathJsTool] Verification result: ${output.status}`);
  }
}

// Export singleton instance
export const checkMathWithMathJsTool = new CheckMathWithMathJsTool();
export default checkMathWithMathJsTool;