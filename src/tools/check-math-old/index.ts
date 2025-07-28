import { evaluate, format, parse } from 'mathjs';
import { Tool } from '../base/Tool';
import { logger } from '@/lib/logger';
import type { ToolContext } from '../base/Tool';
import { callClaude, MODEL_CONFIG } from '@/lib/claude/wrapper';
import type { RichLLMInteraction } from '@/types/llm';
import type { 
  MathVerificationStatus, 
  MathErrorDetails, 
  MathVerificationDetails 
} from '@/tools/shared/math-schemas';
import { generateCacheSeed } from '@/tools/shared/cache-utils';
import { sessionContext } from '@/lib/helicone/sessionContext';
import { createHeliconeHeaders } from '@/lib/helicone/sessions';

// Import types and schemas
import { CheckMathWithMathJsInput, CheckMathWithMathJsOutput } from './types';
import { inputSchema, outputSchema } from './schemas';
import { buildSystemPrompt, buildUserPrompt } from './prompts';

export class CheckMathOldTool extends Tool<CheckMathWithMathJsInput, CheckMathWithMathJsOutput> {
  config = {
    id: 'check-math-old',
    name: 'Check Math Old',
    description: 'Legacy math verification tool (deprecated)',
    version: '1.0.0',
    category: 'analysis' as const,
    costEstimate: 'Free for simple math, ~$0.01 for complex statements requiring LLM',
    path: '/tools/check-math-old',
    status: 'deprecated' as const
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
          llmInteraction: {
            model: 'none',
            prompt: 'Direct MathJS evaluation',
            response: 'Success',
            tokensUsed: { prompt: 0, completion: 0, total: 0 },
            timestamp: new Date(),
            duration: 0
          }
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
          llmInteraction: {
            model: 'none',
            prompt: 'Direct MathJS evaluation',
            response: 'Success',
            tokensUsed: { prompt: 0, completion: 0, total: 0 },
            timestamp: new Date(),
            duration: 0
          }
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
  
  private async extractMathJsExpression(statement: string, context: ToolContext): Promise<string | null> {
    const systemPrompt = `Extract the mathematical relationship from the statement as a MathJS expression. Return ONLY the expression.

IMPORTANT: 
- Focus on extracting the COMPLETE mathematical relationship or claim being made
- For statements with "so", "therefore", "thus", extract the conclusion as an equality
- If a value is stated without comparison, just return the value
- For contextual statements like "X ... so Y", focus on Y as the main claim

MathJS Syntax Reference:
- Equality/comparison: == != < > <= >= (chained: 5 < x < 10)
- Arithmetic: + - * / ^ % mod
- Percentages: 30% → 0.3 (automatic)
- Scientific notation: 1e-7, 3.14e5
- Functions: sqrt() sin() cos() tan() log() exp() abs() floor() ceil() round()
- Logarithms: log(x) for ln, log(x, base) for other bases
- Constants: pi, e, tau, phi
- Units: 5 km, 100 cm to m, 60 mph, 32 degF
- Factorial: 5! or factorial(5)
- Combinations: combinations(n, k) for "n choose k"
- Matrices: [[1,2],[3,4]], det(), transpose()
- Vectors: [1,2,3], dot()
- Complex: 3+4i, abs(3+4i)
- Implicit multiplication: 2 pi, (1+2)(3+4)
- Number formats: 0b11, 0o77, 0xff

Common patterns:
"X is Y" → "X == Y"
"X equals Y" → "X == Y"
"X gives Y" → "X == Y"
"X% of Y is Z" → "X% * Y == Z"
"increase X by Y%" → "X * (1 + Y%) == result"
"X per Y" → often just extract the value X/Y
"the relationship between X and Y" → try to find the equation

Examples:
"2 + 2 = 4" → "2 + 2 == 4"
"30% of 150 is 45" → "30% * 150 == 45"
"Log base 2 of 8 equals 3" → "log(8, 2) == 3"
"5 factorial is 120" → "5! == 120"
"The determinant of [[1,2],[3,4]] is -2" → "det([[1,2],[3,4]]) == -2"`;

    // Get session context for Helicone tracking
    const currentSession = sessionContext.getSession();
    const sessionConfig = currentSession ? 
      sessionContext.withPath('/plugins/math/check-math-extract-expression') : 
      undefined;
    const heliconeHeaders = sessionConfig ? 
      createHeliconeHeaders(sessionConfig) : 
      undefined;

    const maxAttempts = 3;
    const attemptHistory: Array<{expression: string, error: string}> = [];
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Build messages with history of previous attempts
        const messages: Array<{role: "user" | "assistant", content: string}> = [
          { role: 'user', content: statement }
        ];
        
        // Add history of previous failed attempts
        for (const prevAttempt of attemptHistory) {
          messages.push({ role: 'assistant', content: prevAttempt.expression });
          messages.push({ role: 'user', content: `Error: ${prevAttempt.error}. Try again with valid MathJS syntax.` });
        }
        
        const result = await callClaude({
          system: systemPrompt,
          messages,
          max_tokens: 100,
          temperature: 0,
          model: MODEL_CONFIG.analysis, // Use Sonnet for accuracy
          enablePromptCaching: true, // Enable caching since prompt is long
          heliconeHeaders
        });

        const firstContent = result.response.content[0];
        if (firstContent.type === 'text') {
          const expression = firstContent.text.trim();
          // Try to evaluate it
          try {
            evaluate(expression);
            context.logger.info(`[CheckMathWithMathJsTool] Extracted valid expression: ${expression}`);
            return expression;
          } catch (evalError: any) {
            const errorMsg = evalError.message || 'Invalid expression';
            context.logger.debug(`[CheckMathWithMathJsTool] Expression invalid on attempt ${attempt}: ${expression} - ${errorMsg}`);
            attemptHistory.push({ expression, error: errorMsg });
          }
        }
      } catch (error) {
        context.logger.debug(`[CheckMathWithMathJsTool] Extraction attempt ${attempt} failed: ${error}`);
      }
    }
    return null;
  }

  private async llmAssistedVerification(input: CheckMathWithMathJsInput, context: ToolContext): Promise<CheckMathWithMathJsOutput> {
    context.logger.info(`[CheckMathWithMathJsTool] Falling back to LLM-assisted verification`);
    
    // First, try to extract just the MathJS expression
    const extractedExpression = await this.extractMathJsExpression(input.statement, context);
    
    if (extractedExpression) {
      // We successfully extracted an expression, try to evaluate it directly
      try {
        const result = evaluate(extractedExpression);
        const isTrue = result === true || (typeof result === 'number' && Math.abs(result) < 0.0001);
        
        // If false, try to extract the values to provide a correction
        let errorDetails = undefined;
        if (!isTrue && extractedExpression.includes('==')) {
          try {
            const [leftSide, rightSide] = extractedExpression.split('==').map(s => s.trim());
            const leftValue = evaluate(leftSide);
            const rightValue = evaluate(rightSide);
            errorDetails = {
              errorType: 'calculation' as const,
              severity: 'major' as const,
              conciseCorrection: `${rightValue} → ${leftValue}`,
              expectedValue: String(leftValue),
              actualValue: String(rightValue)
            };
          } catch (e) {
            // Ignore errors in extracting values
          }
        }
        
        return {
          statement: input.statement,
          status: isTrue ? 'verified_true' : 'verified_false',
          explanation: isTrue 
            ? `The statement is correct. ${extractedExpression} evaluates to true.`
            : `The statement is incorrect. ${extractedExpression} evaluates to ${result}.`,
          verificationDetails: {
            mathJsExpression: extractedExpression,
            computedValue: String(result),
            steps: [{
              expression: extractedExpression,
              result: String(result)
            }]
          },
          errorDetails,
          llmInteraction: {
            model: MODEL_CONFIG.routing,
            prompt: 'Expression extraction only',
            response: extractedExpression,
            tokensUsed: { prompt: 50, completion: 20, total: 70 }, // Approximate
            timestamp: new Date(),
            duration: 100
          }
        };
      } catch (evalError) {
        context.logger.debug(`[CheckMathWithMathJsTool] Failed to evaluate extracted expression: ${evalError}`);
        // Continue to full LLM verification
      }
    }
    
    // If extraction failed or evaluation failed, fall back to full LLM verification
    const systemPrompt = `Convert mathematical statements to MathJS syntax and verify. Be extremely concise.

Respond with JSON only:
{"status":"verified_true|verified_false|cannot_verify","explanation":"brief","mathJsExpression":"expr","computedValue":"val","errorDetails":{"errorType":"calculation|logic|unit|notation|conceptual","severity":"critical|major|minor","conciseCorrection":"old→new"}}`;

    const userPrompt = `Verify this mathematical statement: "${input.statement}"${input.context ? `\nContext: ${input.context}` : ''}`;
    
    // Get session context if available
    const currentSession = sessionContext.getSession();
    const sessionConfig = currentSession ? 
      sessionContext.withPath('/plugins/math/check-math-with-mathjs-llm') : 
      undefined;
    const heliconeHeaders = sessionConfig ? 
      createHeliconeHeaders(sessionConfig) : 
      undefined;
    
    // Generate cache seed
    const cacheSeed = generateCacheSeed('math-check-mathjs-llm', [
      input.statement,
      input.context || ''
    ]);
    
    try {
      const result = await callClaude({
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        max_tokens: 300,
        temperature: 0,
        model: MODEL_CONFIG.analysis, // Use Sonnet for accuracy in full verification too
        enablePromptCaching: true,
        heliconeHeaders,
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
          llmInteraction: result.interaction
        };
      }
      
      // Build the output
      const output: CheckMathWithMathJsOutput = {
        statement: input.statement,
        status: parsed.status || 'cannot_verify',
        explanation: parsed.explanation || 'No explanation provided.',
        llmInteraction: result.interaction
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
        llmInteraction: {
          model: MODEL_CONFIG.analysis,
          prompt: userPrompt,
          response: '',
          tokensUsed: { prompt: 0, completion: 0, total: 0 },
          timestamp: new Date(),
          duration: 0
        }
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
export const checkMathOldTool = new CheckMathOldTool();
export default checkMathOldTool;