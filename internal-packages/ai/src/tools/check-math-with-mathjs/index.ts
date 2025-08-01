import { evaluate, format, parse } from 'mathjs';
import { Tool } from '../base/Tool';
import { logger } from '../../shared/logger';
import type { ToolContext } from '../base/Tool';
import { callClaude, MODEL_CONFIG } from '@roast/ai';
import { createAnthropicClient } from "@roast/ai";
import type { RichLLMInteraction } from '@roast/ai';
import type { 
  MathVerificationStatus, 
  MathErrorDetails, 
  MathVerificationDetails 
} from '../shared/math-schemas';
import { generateCacheSeed } from '../shared/cache-utils';
import { sessionContext } from '@roast/ai';
import { createHeliconeHeaders } from '@roast/ai';
import { Anthropic } from '@anthropic-ai/sdk';

// Import types and schemas
import { CheckMathAgenticInput, CheckMathAgenticOutput } from './types';
import { inputSchema, outputSchema } from './schemas';

// Helper function to build prompt string for logging
function buildPromptString(
  system: string | undefined,
  messages: Array<{ role: string; content: string }>
): string {
  let prompt = '';
  if (system) {
    prompt += `SYSTEM: ${system}\n\n`;
  }
  
  messages.forEach(msg => {
    prompt += `${msg.role.toUpperCase()}: ${msg.content}\n`;
  });
  
  return prompt.trim();
}

// Tool definitions for Claude - simplified to 2 tools
const MATH_AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'evaluate_expression',
    description: 'Evaluate a mathematical expression using MathJS. Supports arithmetic, functions (sqrt, factorial, etc.), comparisons, and unit conversions.',
    input_schema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'The MathJS expression to evaluate (e.g., "2 + 2", "sqrt(16)", "5! == 120", "5 km + 3000 m in km")'
        }
      },
      required: ['expression']
    }
  },
  {
    name: 'provide_verdict',
    description: 'Provide the final verification result',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['verified_true', 'verified_false', 'cannot_verify'],
          description: 'The verification status'
        },
        explanation: {
          type: 'string',
          description: 'Clear explanation of why the statement is true, false, or cannot be verified'
        },
        mathjs_expression: {
          type: 'string',
          description: 'The MathJS expression that was evaluated (if any)'
        },
        computed_value: {
          type: 'string',
          description: 'The computed value from MathJS (if any)'
        },
        error_type: {
          type: 'string',
          enum: ['calculation', 'logic', 'unit', 'notation', 'conceptual'],
          description: 'Type of error (only if status is verified_false)'
        },
        severity: {
          type: 'string',
          enum: ['critical', 'major', 'minor'],
          description: 'Severity of error (only if status is verified_false)'
        },
        concise_correction: {
          type: 'string',
          description: 'Brief correction like "60 → 70" (only if status is verified_false)'
        },
        expected_value: {
          type: 'string',
          description: 'The expected/correct value (only if status is verified_false)'
        },
        actual_value: {
          type: 'string',
          description: 'The actual/incorrect value found in the statement (only if status is verified_false)'
        }
      },
      required: ['status', 'explanation']
    }
  }
];


export class CheckMathWithMathJsTool extends Tool<CheckMathAgenticInput, CheckMathAgenticOutput> {
  config = {
    id: 'check-math-with-mathjs',
    name: 'Check Math with MathJS',
    description: 'Verify mathematical statements using an agentic approach with Claude and MathJS',
    version: '2.0.0',
    category: 'analysis' as const,
    costEstimate: '~$0.02-0.05 per statement (uses Claude with multiple tool calls)',
    path: '/tools/check-math-with-mathjs',
    status: 'stable' as const
  };
  
  inputSchema = inputSchema;
  outputSchema = outputSchema as any;
  
  async execute(input: CheckMathAgenticInput, context: ToolContext): Promise<CheckMathAgenticOutput> {
    const startTime = Date.now();
    context.logger.info(`[CheckMathWithMathJsTool] Analyzing statement: "${input.statement}"`);
    
    // Store the previous session to restore later
    const previousSession = sessionContext.getSession();
    let sessionId = '';
    let currentPrompt = '';
    
    try {
      // Always create a new session for each tool execution
      sessionId = `math-agentic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newSession = {
        sessionId,
        sessionName: `Math Agentic Tool - ${input.statement.substring(0, 50)}${input.statement.length > 50 ? '...' : ''}`,
        sessionPath: '/tools/check-math-with-mathjs'
      };
      
      // Set our new session
      sessionContext.setSession(newSession);
      context.logger.info(`[CheckMathWithMathJsTool] Created new session: ${sessionId}`);
      
      const sessionConfig = sessionContext.withPath('/tools/check-math-with-mathjs');
      const heliconeHeaders = sessionConfig ? createHeliconeHeaders(sessionConfig) : undefined;
      
      // Simplified system prompt
      const systemPrompt = `You are a mathematical verification agent. Verify if mathematical statements are true, false, or cannot be verified.

TOOLS:
- evaluate_expression: Use this to compute numerical expressions with MathJS
- provide_verdict: Use this to give your final answer

APPROACH:
1. ALWAYS start by calling evaluate_expression to check any numerical claims
2. For symbolic/theoretical statements: return 'cannot_verify' (MathJS only does numerical computation)
3. For unit mismatches: compute the correct value and note the error

MATHJS SYNTAX EXAMPLES:
- Arithmetic: 2 + 2, 5 * 7, 10 / 2
- Functions: sqrt(16), factorial(5) or 5!, combinations(10, 3)
- Comparisons: 5 == 5, 10 > 8
- Units: 5 km + 3000 m, (5 km + 3000 m) in km
- Percentages: 30% * 150 or 0.3 * 150
- Constants: pi, e

IMPORTANT:
- Keep explanations clear and concise 
- Always include mathjs_expression and computed_value when using MathJS
- For rounding (e.g., π ≈ 3.14), accept if reasonable
- For unit errors, provide the correct value with proper units`;

      const userPrompt = `Verify this mathematical statement: "${input.statement}"${input.context ? `\nContext: ${input.context}` : ''}`;
      currentPrompt = userPrompt;
      
      // Early detection of symbolic math and incomplete expressions to save tokens
      const symbolicKeywords = [
        'derivative', 'integral', 'limit', 'lim', 'd/dx', '∫', '∂',
        'prove', 'theorem', 'identity', 'simplify', 'expand', 'factor'
      ];
      
      const statementLower = input.statement.toLowerCase();
      const isLikelySymbolic = symbolicKeywords.some(keyword => 
        statementLower.includes(keyword)
      );
      
      // Check for incomplete expressions
      const isIncomplete = input.statement.trim().endsWith('...') || 
                          input.statement.trim().endsWith('..') ||
                          /\b(of|to|from|equals?|is)\s*\.{2,}/.test(input.statement) ||
                          /\b(of|to|from|equals?|is)\s*$/.test(input.statement.trim());
      
      // Pre-written responses for common cases
      if (isLikelySymbolic) {
        return {
          statement: input.statement,
          status: 'cannot_verify',
          explanation: 'Cannot verify symbolic math. MathJS only handles numerical computations.',
          llmInteraction: {
            model: MODEL_CONFIG.analysis,
            prompt: userPrompt,
            response: 'Detected symbolic mathematics - early return',
            tokensUsed: { prompt: 0, completion: 0, total: 0 },
            timestamp: new Date(),
            duration: Date.now() - startTime
          }
        };
      }
      
      if (isIncomplete) {
        return {
          statement: input.statement,
          status: 'cannot_verify',
          explanation: 'Cannot verify incomplete expression. The statement appears to be missing information or cut off.',
          llmInteraction: {
            model: MODEL_CONFIG.analysis,
            prompt: userPrompt,
            response: 'Detected incomplete expression - early return',
            tokensUsed: { prompt: 0, completion: 0, total: 0 },
            timestamp: new Date(),
            duration: Date.now() - startTime
          }
        };
      }
      
      // Track tool calls for debugging
      const toolCalls: Array<{ tool: string; input: any; output: any }> = [];
      let finalResponse: any = null;
      let agentReasoning = '';
      
      // Build conversation messages
      const messages: Anthropic.MessageParam[] = [
        { role: 'user', content: userPrompt }
      ];
      
      // Create Anthropic client
      const anthropic = createAnthropicClient();
      
      // Allow up to 5 rounds of tool calls with 60 second timeout
      let lastResponse: Anthropic.Message | null = null;
      let totalTokens = { prompt: 0, completion: 0, total: 0 };
      const TIMEOUT_MS = 60000; // 60 seconds
      
      for (let round = 0; round < 5; round++) {
        const roundStartTime = Date.now();
        
        // Check for timeout
        if (Date.now() - startTime > TIMEOUT_MS) {
          throw new Error(`Tool execution timed out after ${TIMEOUT_MS}ms`);
        }
        
        // Call Claude with tools using the Anthropic client directly
        const response = await anthropic.messages.create({
          model: MODEL_CONFIG.analysis,
          system: systemPrompt,
          messages,
          tools: MATH_AGENT_TOOLS,
          tool_choice: { type: 'auto' },
          max_tokens: 2000,
          temperature: 0
        }, {
          headers: heliconeHeaders
        });
        
        lastResponse = response;
        
        // Update token count
        if (response.usage) {
          totalTokens.prompt += response.usage.input_tokens;
          totalTokens.completion += response.usage.output_tokens;
          totalTokens.total = totalTokens.prompt + totalTokens.completion;
        }
        
        // Extract text reasoning
        const textBlocks = response.content.filter(
          (block: Anthropic.ContentBlock): block is Anthropic.TextBlock => block.type === 'text'
        );
        if (textBlocks.length > 0) {
          agentReasoning += (agentReasoning ? '\n' : '') + textBlocks.map((block: Anthropic.TextBlock) => block.text).join('\n');
        }
        
        // Process tool calls
        const toolUses = response.content.filter(
          (block: Anthropic.ContentBlock): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
        );
        
        if (toolUses.length === 0) {
          // No more tool calls, we're done
          break;
        }
        
        // Add Claude's response to messages
        messages.push({ role: 'assistant', content: response.content });
        
        // Process each tool call and collect results
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        
        for (const toolUse of toolUses) {
          const toolResult = await this.executeToolCall(toolUse, context);
          toolCalls.push({
            tool: toolUse.name,
            input: toolUse.input,
            output: toolResult
          });
          
          if (toolUse.name === 'provide_verdict') {
            finalResponse = toolUse.input;
          }
          
          // Format tool result for Claude
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(toolResult)
          });
        }
        
        // Add tool results to messages
        messages.push({ role: 'user', content: toolResults });
        
        // If we got a final response, we can stop
        if (finalResponse) {
          break;
        }
      }
      
      // If no final response was provided, create a default one
      if (!finalResponse) {
        finalResponse = {
          status: 'cannot_verify',
          explanation: 'The agent did not provide a final response.'
        };
      }
      
      // Build the output
      const output: CheckMathAgenticOutput = {
        statement: input.statement,
        status: finalResponse.status,
        explanation: finalResponse.explanation,
        llmInteraction: {
          model: MODEL_CONFIG.analysis,
          prompt: buildPromptString(systemPrompt, [{ role: 'user', content: userPrompt }]),
          response: lastResponse ? lastResponse.content.map(block => {
            if (block.type === 'text') return block.text;
            if (block.type === 'tool_use') return `[Tool call: ${block.name}]`;
            return '';
          }).join('\n') : '',
          tokensUsed: totalTokens,
          timestamp: new Date(),
          duration: Date.now() - startTime
        }
      };
      
      // Add verification details if available
      if (finalResponse.mathjs_expression || finalResponse.computed_value) {
        output.verificationDetails = {
          mathJsExpression: finalResponse.mathjs_expression || '',
          computedValue: finalResponse.computed_value || '',
          steps: []
        };
      }
      
      // Add error details if status is false
      if (finalResponse.status === 'verified_false' && finalResponse.error_type) {
        output.errorDetails = {
          errorType: finalResponse.error_type,
          severity: finalResponse.severity || 'major',
          conciseCorrection: finalResponse.concise_correction || '',
          expectedValue: finalResponse.expected_value,
          actualValue: finalResponse.actual_value
        };
      }
      
      return output;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Log detailed error information
      context.logger.error('[CheckMathWithMathJsTool] Error during execution:', {
        error: errorMessage,
        statement: input.statement,
        sessionId,
        duration,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Determine error type and create appropriate explanation
      let explanation = 'An error occurred during verification.';
      if (errorMessage.includes('timeout')) {
        explanation = 'Verification timed out. The mathematical statement may be too complex for automated analysis.';
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        explanation = 'Rate limit exceeded. Please try again later.';
      } else if (errorMessage.includes('network') || errorMessage.includes('ENOTFOUND')) {
        explanation = 'Network error occurred. Please check your connection and try again.';
      } else if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
        explanation = 'Authentication error. Please check API configuration.';
      }
      
      return {
        statement: input.statement,
        status: 'cannot_verify',
        explanation,
        error: errorMessage,
        llmInteraction: {
          model: MODEL_CONFIG.analysis,
          prompt: currentPrompt || `Statement: "${input.statement}"`,
          response: `Error: ${errorMessage}`,
          tokensUsed: { prompt: 0, completion: 0, total: 0 },
          timestamp: new Date(),
          duration
        }
      };
    } finally {
      // Safely restore the previous session context
      try {
        if (previousSession) {
          sessionContext.setSession(previousSession);
        } else {
          // Clear the session if there was no previous one
          sessionContext.setSession(undefined);
        }
      } catch (sessionError) {
        // Log session restoration error but don't throw
        context.logger.warn('[CheckMathWithMathJsTool] Failed to restore session context:', { error: sessionError });
      }
    }
  }
  
  private async executeToolCall(toolUse: Anthropic.ToolUseBlock, context: ToolContext): Promise<any> {
    try {
      switch (toolUse.name) {
        case 'evaluate_expression':
          return this.evaluateExpression(toolUse.input as { expression: string }, context);
          
        case 'provide_verdict':
          // Just return success for the verdict tool
          return { success: true };
          
        default:
          return { error: `Unknown tool: ${toolUse.name}` };
      }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Tool execution failed',
        details: String(error)
      };
    }
  }
  
  private async tryDirectEvaluation(input: CheckMathAgenticInput, context: ToolContext): Promise<CheckMathAgenticOutput | null> {
    const startTime = Date.now();
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
            model: 'direct-evaluation',
            prompt: input.statement,
            response: `Direct MathJS evaluation: ${leftExpression} = ${leftFormatted}`,
            tokensUsed: { prompt: 0, completion: 0, total: 0 },
            timestamp: new Date(),
            duration: Date.now() - startTime
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
            model: 'direct-evaluation',
            prompt: input.statement,
            response: `Direct MathJS evaluation found error: ${leftExpression} = ${leftFormatted}, not ${rightFormatted}`,
            tokensUsed: { prompt: 0, completion: 0, total: 0 },
            timestamp: new Date(),
            duration: Date.now() - startTime
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
  
  private async llmAssistedVerification(input: CheckMathAgenticInput, context: ToolContext): Promise<CheckMathAgenticOutput> {
    const startTime = Date.now();
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
          llmInteraction: {
            model: MODEL_CONFIG.analysis,
            prompt: userPrompt,
            response: 'Failed to parse JSON response',
            tokensUsed: { prompt: 0, completion: 0, total: 0 },
            timestamp: new Date(),
            duration: Date.now() - startTime
          }
        };
      }
      
      // Build the output
      const output: CheckMathAgenticOutput = {
        statement: input.statement,
        status: parsed.status || 'cannot_verify',
        explanation: parsed.explanation || 'No explanation provided.',
        llmInteraction: {
          model: result.interaction.model,
          prompt: result.interaction.prompt,
          response: result.interaction.response,
          tokensUsed: result.interaction.tokensUsed,
          timestamp: new Date(),
          duration: Date.now() - startTime
        }
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      context.logger.error('[CheckMathWithMathJsTool] LLM verification failed:', {
        error: errorMessage,
        statement: input.statement,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return {
        statement: input.statement,
        status: 'cannot_verify',
        explanation: `LLM verification failed: ${errorMessage}`,
        llmInteraction: {
          model: MODEL_CONFIG.analysis,
          prompt: userPrompt,
          response: `Error: ${errorMessage}`,
          tokensUsed: { prompt: 0, completion: 0, total: 0 },
          timestamp: new Date(),
          duration: Date.now() - startTime
        }
      };
    }
  }
  
  private evaluateExpression(input: { expression: string }, context: ToolContext): any {
    try {
      const result = evaluate(input.expression);
      
      // Format the result nicely
      let formatted: string;
      if (typeof result === 'boolean') {
        formatted = result.toString();
      } else if (typeof result === 'number') {
        formatted = result.toString();
      } else {
        formatted = format(result);
      }
      
      return {
        success: true,
        result: formatted,
        type: typeof result,
        raw: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        type: 'error'
      };
    }
  }
}

// Export singleton instance
export const checkMathWithMathJsTool = new CheckMathWithMathJsTool();
export default checkMathWithMathJsTool;