import {
  equal,
  evaluate,
  format,
} from "mathjs";

import { Anthropic } from "@anthropic-ai/sdk";

import {
  callClaude,
  MODEL_CONFIG,
} from "../../claude/wrapper";
import { getCurrentHeliconeHeaders } from "../../helicone/simpleSessionManager";
import { createAnthropicClient } from "../../utils/anthropic";
import type { ToolContext } from "../base/Tool";
import { Tool } from "../base/Tool";
import { generateCacheSeed } from "../shared/cache-utils";
import { checkMathWithMathJsConfig } from "../configs";
// Import MathJS parser utilities
import {
  formatForMathJS,
  parseEqualityStatement,
} from "./mathjs-parser-utils";
// Import numeric comparison utilities
import {
  compareNumericValues,
  ComparisonResult,
  countDecimalPlaces,
  formatNumber,
} from "./numeric-comparison";
import {
  inputSchema,
  outputSchema,
} from "./schemas";
// Import types and schemas
import {
  CheckMathAgenticInput,
  CheckMathAgenticOutput,
} from "./types";

// Configuration constants
export const AGENT_TIMEOUT_MS = 60000; // 60 seconds timeout for agent-based verification

// Helper function to build prompt string for logging
function buildPromptString(
  system: string | undefined,
  messages: Array<{ role: string; content: string }>
): string {
  let prompt = "";
  if (system) {
    prompt += `SYSTEM: ${system}\n\n`;
  }

  messages.forEach((msg) => {
    prompt += `${msg.role.toUpperCase()}: ${msg.content}\n`;
  });

  return prompt.trim();
}

// Tool definitions for Claude - simplified to 2 tools
const MATH_AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "evaluate_expression",
    description:
      "Evaluate a mathematical expression using MathJS. Supports arithmetic, functions (sqrt, factorial, etc.), comparisons, and unit conversions.",
    input_schema: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description:
            'The MathJS expression to evaluate (e.g., "2 + 2", "sqrt(16)", "5! == 120", "5 km + 3000 m in km")',
        },
      },
      required: ["expression"],
    },
  },
  {
    name: "provide_verdict",
    description:
      "Provide the final verification result. IMPORTANT: Accept reasonable approximations - if the stated value matches the computed value when rounded to the same number of decimal places shown in the statement, mark as verified_true.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: [
            "verified_true",
            "verified_false",
            "verified_warning",
            "cannot_verify",
          ],
          description:
            "The verification status: true (exact/good), false (wrong), warning (rough approximation), or cannot verify",
        },
        explanation: {
          type: "string",
          description:
            "Clear explanation of why the statement is true, false, or cannot be verified",
        },
        mathjs_expression: {
          type: "string",
          description: "The MathJS expression that was evaluated (if any)",
        },
        computed_value: {
          type: "string",
          description: "The computed value from MathJS (if any)",
        },
        error_type: {
          type: "string",
          enum: ["calculation", "logic", "unit", "notation", "conceptual"],
          description: "Type of error (only if status is verified_false)",
        },
        severity: {
          type: "string",
          enum: ["critical", "major", "minor"],
          description: "Severity of error (only if status is verified_false)",
        },
        concise_correction: {
          type: "string",
          description:
            'Brief correction like "60 → 70" (only if status is verified_false)',
        },
        expected_value: {
          type: "string",
          description:
            "The expected/correct value (only if status is verified_false)",
        },
        actual_value: {
          type: "string",
          description:
            "The actual/incorrect value found in the statement (only if status is verified_false)",
        },
      },
      required: ["status", "explanation"],
    },
  },
];

export class CheckMathWithMathJsTool extends Tool<
  CheckMathAgenticInput,
  CheckMathAgenticOutput
> {
  config = {
    ...checkMathWithMathJsConfig,
    examples: [
      "2 + 2 = 4",
      'The binomial coefficient "10 choose 3" equals 120',
      "Converting 100 fahrenheit to celsius gives 37.78 degrees",
      "10% of 50 is 5",
      "sqrt(144) = 12",
      "log(1000, 10) = 3",
      "The derivative of x³ is 3x²",
      "5 km + 3000 m = 8 km",
      "The area of a circle with radius 5 is 25π",
      "sin(90 degrees) = 1",
    ],
  };

  inputSchema = inputSchema;
  outputSchema = outputSchema as any;

  async execute(
    input: CheckMathAgenticInput,
    context: ToolContext
  ): Promise<CheckMathAgenticOutput> {
    const startTime = Date.now();
    context.logger.info(
      `[CheckMathWithMathJsTool] Analyzing statement: "${input.statement}"`
    );

    // Check for global session manager
    const currentHeaders = getCurrentHeliconeHeaders();
    const sessionId =
      currentHeaders["Helicone-Session-Id"] || `math-standalone-${Date.now()}`;

    let currentPrompt = "";

    try {
      context.logger.info(
        `[CheckMathWithMathJsTool] Starting verification with session: ${sessionId}`
      );

      // Simplified system prompt
      const systemPrompt = `You are a mathematical verification agent. Verify if mathematical statements are true, false, or cannot be verified.

TOOLS:
- evaluate_expression: Use this to compute numerical expressions with MathJS
- provide_verdict: Use this to give your final answer

APPROACH:
1. ALWAYS start by calling evaluate_expression to check any numerical claims
2. For symbolic/theoretical statements: return 'cannot_verify' (MathJS only does numerical computation)
3. For unit mismatches: compute the correct value and note the error
4. IMPORTANT: Division by zero is UNDEFINED in mathematics, not infinity. Even though MathJS returns "Infinity", statements like "x/0 = infinity" should be marked as verified_false with a conceptual error

MATHJS SYNTAX EXAMPLES:
- Arithmetic: 2 + 2, 5 * 7, 10 / 2
- Functions: sqrt(16), factorial(5) or 5!, combinations(10, 3)
- Comparisons: 5 == 5, 10 > 8
- Units: 5 km + 3000 m, (5 km + 3000 m) in km
- Percentages: 30% * 150 or 0.3 * 150
- Constants: pi, e

APPROXIMATION RULES:
NOTE: The system uses deterministic code-level comparison for numeric values.
When you evaluate expressions that result in equality checks, the system will:
- Automatically handle reasonable approximations based on decimal precision
- Accept values that match when rounded to the same precision as stated
- Apply consistent rounding rules across all comparisons

When using evaluate_expression with comparisons:
- The tool will return true/false based on deterministic comparison logic
- Approximations are handled automatically (e.g., "10/3 == 3.33" will be true)
- You don't need to manually check approximations - just evaluate and trust the result

IMPORTANT:
- Keep explanations clear and concise 
- Always include mathjs_expression and computed_value when using MathJS
- Accept reasonable approximations based on the decimal precision shown in the statement
- For unit errors, provide the correct value with proper units`;

      const userPrompt = `Verify this mathematical statement: "${input.statement}"${input.context ? `\nContext: ${input.context}` : ""}`;
      currentPrompt = userPrompt;

      // Early detection of symbolic math and incomplete expressions to save tokens
      const symbolicKeywords = [
        "derivative",
        "integral",
        "limit",
        "lim",
        "d/dx",
        "∫",
        "∂",
        "prove",
        "theorem",
        "identity",
        "simplify",
        "expand",
        "factor",
      ];

      const statementLower = input.statement.toLowerCase();
      const isLikelySymbolic = symbolicKeywords.some((keyword) =>
        statementLower.includes(keyword)
      );

      // Check for incomplete expressions
      const isIncomplete =
        input.statement.trim().endsWith("...") ||
        input.statement.trim().endsWith("..") ||
        /\b(of|to|from|equals?|is)\s*\.{2,}/.test(input.statement) ||
        /\b(of|to|from|equals?|is)\s*$/.test(input.statement.trim());

      // Pre-written responses for common cases
      if (isLikelySymbolic) {
        return {
          statement: input.statement,
          status: "cannot_verify",
          explanation:
            "Cannot verify symbolic math. MathJS only handles numerical computations.",
          llmInteraction: {
            model: MODEL_CONFIG.analysis,
            prompt: userPrompt,
            response: "Detected symbolic mathematics - early return",
            tokensUsed: { prompt: 0, completion: 0, total: 0 },
            timestamp: new Date(),
            duration: Date.now() - startTime,
          },
        };
      }

      if (isIncomplete) {
        return {
          statement: input.statement,
          status: "cannot_verify",
          explanation:
            "Cannot verify incomplete expression. The statement appears to be missing information or cut off.",
          llmInteraction: {
            model: MODEL_CONFIG.analysis,
            prompt: userPrompt,
            response: "Detected incomplete expression - early return",
            tokensUsed: { prompt: 0, completion: 0, total: 0 },
            timestamp: new Date(),
            duration: Date.now() - startTime,
          },
        };
      }

      // Try direct evaluation first for simple equality statements
      const directResult = await this.tryDirectEvaluation(input, context);
      if (directResult) {
        context.logger.info(
          `[CheckMathWithMathJsTool] Direct evaluation successful, skipping LLM`
        );
        return directResult;
      }

      // Track tool calls for debugging
      const toolCalls: Array<{ tool: string; input: any; output: any }> = [];
      let finalResponse: any = null;
      let agentReasoning = "";

      // Build conversation messages
      const messages: Anthropic.MessageParam[] = [
        { role: "user", content: userPrompt },
      ];

      // Create Anthropic client (lazy - only when needed)
      let anthropic: Anthropic | null = null;

      // Allow up to 5 rounds of tool calls with configurable timeout
      let lastResponse: Anthropic.Message | null = null;
      let totalTokens = { prompt: 0, completion: 0, total: 0 };

      for (let round = 0; round < 5; round++) {
        // Check for timeout
        if (Date.now() - startTime > AGENT_TIMEOUT_MS) {
          throw new Error(
            `Tool execution timed out after ${AGENT_TIMEOUT_MS}ms`
          );
        }

        // Create client lazily if not yet created
        if (!anthropic) {
          anthropic = createAnthropicClient();
        }

        // Call Claude with tools using the Anthropic client directly
        const response = await anthropic.messages.create({
          model: MODEL_CONFIG.analysis,
          system: systemPrompt,
          messages,
          tools: MATH_AGENT_TOOLS,
          tool_choice: { type: "auto" },
          max_tokens: 2000,
          temperature: 0,
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
          (block: Anthropic.ContentBlock): block is Anthropic.TextBlock =>
            block.type === "text"
        );
        if (textBlocks.length > 0) {
          agentReasoning +=
            (agentReasoning ? "\n" : "") +
            textBlocks
              .map((block: Anthropic.TextBlock) => block.text)
              .join("\n");
        }

        // Process tool calls
        const toolUses = response.content.filter(
          (block: Anthropic.ContentBlock): block is Anthropic.ToolUseBlock =>
            block.type === "tool_use"
        );

        if (toolUses.length === 0) {
          // No more tool calls, we're done
          break;
        }

        // Add Claude's response to messages
        messages.push({ role: "assistant", content: response.content });

        // Process each tool call and collect results
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const toolUse of toolUses) {
          const toolResult = await this.executeToolCall(toolUse, context);
          toolCalls.push({
            tool: toolUse.name,
            input: toolUse.input,
            output: toolResult,
          });

          if (toolUse.name === "provide_verdict") {
            finalResponse = toolUse.input;
          }

          // Format tool result for Claude
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify(toolResult),
          });
        }

        // Add tool results to messages
        messages.push({ role: "user", content: toolResults });

        // If we got a final response, we can stop
        if (finalResponse) {
          break;
        }
      }

      // If no final response was provided, create a default one
      if (!finalResponse) {
        finalResponse = {
          status: "cannot_verify",
          explanation: "The agent did not provide a final response.",
        };
      }

      // Build the output
      const output: CheckMathAgenticOutput = {
        statement: input.statement,
        status: finalResponse.status,
        explanation: finalResponse.explanation,
        llmInteraction: {
          model: MODEL_CONFIG.analysis,
          prompt: buildPromptString(systemPrompt, [
            { role: "user", content: userPrompt },
          ]),
          response: lastResponse
            ? lastResponse.content
                .map((block) => {
                  if (block.type === "text") return block.text;
                  if (block.type === "tool_use")
                    return `[Tool call: ${block.name}]`;
                  return "";
                })
                .join("\n")
            : "",
          tokensUsed: totalTokens,
          timestamp: new Date(),
          duration: Date.now() - startTime,
        },
      };

      // Add verification details if available
      if (finalResponse.mathjs_expression || finalResponse.computed_value) {
        output.verificationDetails = {
          mathJsExpression: finalResponse.mathjs_expression || "",
          computedValue: finalResponse.computed_value || "",
          steps: [],
        };
      }

      // Add error details if status is false
      if (
        finalResponse.status === "verified_false" &&
        finalResponse.error_type
      ) {
        output.errorDetails = {
          errorType: finalResponse.error_type,
          severity: finalResponse.severity || "major",
          displayCorrection: finalResponse.concise_correction || "",
          expectedValue: finalResponse.expected_value,
          actualValue: finalResponse.actual_value,
        };
      }

      return output;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      // Log detailed error information
      context.logger.error(
        "[CheckMathWithMathJsTool] Error during execution:",
        {
          error: errorMessage,
          statement: input.statement,
          sessionId,
          duration,
          stack: error instanceof Error ? error.stack : undefined,
        }
      );

      // Determine error type and create appropriate explanation
      let explanation = "An error occurred during verification.";
      if (errorMessage.includes("timeout")) {
        explanation =
          "Verification timed out. The mathematical statement may be too complex for automated analysis.";
      } else if (
        errorMessage.includes("rate limit") ||
        errorMessage.includes("429")
      ) {
        explanation = "Rate limit exceeded. Please try again later.";
      } else if (
        errorMessage.includes("network") ||
        errorMessage.includes("ENOTFOUND")
      ) {
        explanation =
          "Network error occurred. Please check your connection and try again.";
      } else if (
        errorMessage.includes("API key") ||
        errorMessage.includes("authentication")
      ) {
        explanation = "Authentication error. Please check API configuration.";
      }

      return {
        statement: input.statement,
        status: "cannot_verify",
        explanation,
        error: errorMessage,
        llmInteraction: {
          model: MODEL_CONFIG.analysis,
          prompt: currentPrompt || `Statement: "${input.statement}"`,
          response: `Error: ${errorMessage}`,
          tokensUsed: { prompt: 0, completion: 0, total: 0 },
          timestamp: new Date(),
          duration,
        },
      };
    } finally {
      // Session cleanup is handled automatically by the global session manager
    }
  }

  private async executeToolCall(
    toolUse: Anthropic.ToolUseBlock,
    context: ToolContext
  ): Promise<any> {
    try {
      switch (toolUse.name) {
        case "evaluate_expression":
          return this.evaluateExpression(
            toolUse.input as { expression: string },
            context
          );

        case "provide_verdict":
          // Just return success for the verdict tool
          return { success: true };

        default:
          return { error: `Unknown tool: ${toolUse.name}` };
      }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Tool execution failed",
        details: String(error),
      };
    }
  }

  private async tryDirectEvaluation(
    input: CheckMathAgenticInput,
    context: ToolContext
  ): Promise<CheckMathAgenticOutput | null> {
    const startTime = Date.now();
    context.logger.info(
      `[CheckMathWithMathJsTool] Attempting direct MathJS evaluation for: "${input.statement}"`
    );

    try {
      // Step 1: Format and parse the statement
      const formattedStatement = formatForMathJS(input.statement);
      const equalityCheck = parseEqualityStatement(formattedStatement);

      if (!equalityCheck || !equalityCheck.isEquality) {
        // Not an equality expression, need LLM help
        return null;
      }

      if (
        equalityCheck.leftValue === undefined ||
        equalityCheck.rightValue === undefined
      ) {
        // Couldn't evaluate one or both sides
        return null;
      }

      // Step 2: Determine evaluation strategy based on value types
      const evaluationStrategy = this.determineEvaluationStrategy(
        equalityCheck.leftValue,
        equalityCheck.rightValue
      );

      // Step 3: Evaluate based on the strategy
      let isEqual: boolean;
      let comparisonDetails: any = {};

      switch (evaluationStrategy) {
        case "units":
          // For units: Use MathJS's built-in equality check
          // MathJS handles unit conversions correctly (e.g., 5 km + 3000 m == 8 km)
          if (equalityCheck.evaluationResult !== undefined) {
            isEqual = equalityCheck.evaluationResult;
            comparisonDetails = {
              method: "MathJS unit comparison",
              reason: isEqual
                ? "Unit values are equal"
                : "Unit values are not equal",
            };
          } else {
            // Fallback: try using MathJS equal function
            try {
              const equalResult = equal(
                equalityCheck.leftValue,
                equalityCheck.rightValue
              );
              isEqual = Boolean(equalResult);
              comparisonDetails = {
                method: "MathJS equal() function",
                reason: isEqual
                  ? "Unit values are equal"
                  : "Unit values are not equal",
              };
            } catch {
              return null; // Can't compare, need LLM
            }
          }
          break;

        case "numbers":
          // For numbers: Use our approximation logic
          const comparison = this.compareNumericValuesWithApproximation(
            equalityCheck.leftValue,
            equalityCheck.rightValue,
            input.statement
          );
          isEqual = comparison.isEqual;
          comparisonDetails = comparison;

          // Check if this should be a warning
          if (comparison.shouldWarn) {
            // Return warning status for rough approximations
            const leftExpression =
              equalityCheck.leftExpression || String(equalityCheck.leftValue);
            const rightExpression =
              equalityCheck.rightExpression || String(equalityCheck.rightValue);
            const leftFormatted = this.formatValue(equalityCheck.leftValue);
            const rightFormatted = this.formatValue(equalityCheck.rightValue);

            return {
              statement: input.statement,
              status: "verified_warning",
              explanation:
                `The statement uses a rough approximation. ${leftExpression} equals ${leftFormatted}, which rounds to ${rightFormatted} at the stated precision, but consider using more decimal places for accuracy. ${comparison.reason || ""}`.trim(),
              verificationDetails: {
                mathJsExpression: formattedStatement,
                computedValue: leftFormatted,
                steps: [
                  { expression: leftExpression, result: leftFormatted },
                  { expression: rightExpression, result: rightFormatted },
                ],
              },
              errorDetails: {
                errorType: "calculation",
                severity: "minor",
                displayCorrection: `Consider using ${leftFormatted.substring(0, rightFormatted.length + 2)}`,
                expectedValue: leftFormatted,
                actualValue: rightFormatted,
              },
              llmInteraction: {
                model: "direct-evaluation",
                prompt: input.statement,
                response: `Direct evaluation: rough approximation warning`,
                tokensUsed: { prompt: 0, completion: 0, total: 0 },
                timestamp: new Date(),
                duration: Date.now() - startTime,
              },
            };
          }
          break;

        case "mixed":
        default:
          // Mixed types or unknown: need LLM help
          return null;
      }

      // Step 4: Build the response
      const leftExpression =
        equalityCheck.leftExpression || String(equalityCheck.leftValue);
      const rightExpression =
        equalityCheck.rightExpression || String(equalityCheck.rightValue);
      const leftFormatted = this.formatValue(equalityCheck.leftValue);
      const rightFormatted = this.formatValue(equalityCheck.rightValue);

      if (isEqual) {
        return {
          statement: input.statement,
          status: "verified_true",
          explanation:
            `The statement is correct. ${leftExpression} equals ${rightFormatted}. ${comparisonDetails.reason || ""}`.trim(),
          verificationDetails: {
            mathJsExpression: formattedStatement,
            computedValue: leftFormatted,
            steps: [
              { expression: leftExpression, result: leftFormatted },
              { expression: rightExpression, result: rightFormatted },
            ],
          },
          llmInteraction: {
            model: "direct-evaluation",
            prompt: input.statement,
            response: `Direct evaluation: ${comparisonDetails.method || "comparison"}`,
            tokensUsed: { prompt: 0, completion: 0, total: 0 },
            timestamp: new Date(),
            duration: Date.now() - startTime,
          },
        };
      } else {
        // Determine the expected value for the correction
        const expectedValue =
          comparisonDetails.roundedComputedValue !== undefined
            ? formatNumber(comparisonDetails.roundedComputedValue)
            : leftFormatted;

        return {
          statement: input.statement,
          status: "verified_false",
          explanation:
            `The statement is incorrect. ${leftExpression} equals ${leftFormatted}, not ${rightFormatted}. ${comparisonDetails.reason || ""}`.trim(),
          verificationDetails: {
            mathJsExpression: formattedStatement,
            computedValue: leftFormatted,
            steps: [
              { expression: leftExpression, result: leftFormatted },
              { expression: rightExpression, result: rightFormatted },
            ],
          },
          errorDetails: {
            errorType: "calculation",
            severity: comparisonDetails.severity || "major",
            displayCorrection: `${rightFormatted} → ${expectedValue}`,
            expectedValue: expectedValue,
            actualValue: rightFormatted,
          },
          llmInteraction: {
            model: "direct-evaluation",
            prompt: input.statement,
            response: `Direct evaluation found error: ${comparisonDetails.method || "comparison"}`,
            tokensUsed: { prompt: 0, completion: 0, total: 0 },
            timestamp: new Date(),
            duration: Date.now() - startTime,
          },
        };
      }
    } catch (error) {
      context.logger.debug(
        `[CheckMathWithMathJsTool] Direct evaluation failed: ${error}`
      );
      return null;
    }
  }

  private convertToMathJs(expression: string): string | null {
    // Try some common conversions
    let converted = expression;

    // Convert mathematical symbols
    converted = converted.replace(/π/g, "pi");
    converted = converted.replace(/×/g, "*");
    converted = converted.replace(/÷/g, "/");
    converted = converted.replace(/−/g, "-"); // en dash
    converted = converted.replace(/–/g, "-"); // em dash

    // Convert word numbers to digits
    const wordNumbers: Record<string, string> = {
      zero: "0",
      one: "1",
      two: "2",
      three: "3",
      four: "4",
      five: "5",
      six: "6",
      seven: "7",
      eight: "8",
      nine: "9",
      ten: "10",
      eleven: "11",
      twelve: "12",
      thirteen: "13",
      fourteen: "14",
      fifteen: "15",
      sixteen: "16",
      seventeen: "17",
      eighteen: "18",
      nineteen: "19",
      twenty: "20",
      thirty: "30",
      forty: "40",
      fifty: "50",
      sixty: "60",
      seventy: "70",
      eighty: "80",
      ninety: "90",
      hundred: "100",
      thousand: "1000",
      million: "1000000",
      billion: "1000000000",
    };

    for (const [word, num] of Object.entries(wordNumbers)) {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      converted = converted.replace(regex, num);
    }

    // Convert common unit words
    converted = converted.replace(/\bkilometer(s)?\b/gi, "km");
    converted = converted.replace(/\bmeter(s)?\b/gi, "m");
    converted = converted.replace(/\bcentimeter(s)?\b/gi, "cm");
    converted = converted.replace(/\bmillimeter(s)?\b/gi, "mm");
    converted = converted.replace(/\bkilogram(s)?\b/gi, "kg");
    converted = converted.replace(/\bgram(s)?\b/gi, "g");
    converted = converted.replace(/\bliter(s)?\b/gi, "L");
    converted = converted.replace(/\bmilliliter(s)?\b/gi, "mL");

    // Convert "of" to multiplication for percentages
    converted = converted.replace(/(\d+\.?\d*%?)\s+of\s+/gi, "$1 * ");

    // Convert common operations
    converted = converted.replace(/\bplus\b/gi, "+");
    converted = converted.replace(/\bminus\b/gi, "-");
    converted = converted.replace(/\btimes\b/gi, "*");
    converted = converted.replace(/\bmultiplied by\b/gi, "*");
    converted = converted.replace(/\bdivided by\b/gi, "/");
    converted = converted.replace(/\bover\b/gi, "/");
    converted = converted.replace(/\bsquared\b/gi, "^2");
    converted = converted.replace(/\bcubed\b/gi, "^3");
    converted = converted.replace(/\bto the power of\b/gi, "^");
    converted = converted.replace(/\braised to\b/gi, "^");

    // Try to evaluate the converted expression
    try {
      evaluate(converted);
      return converted;
    } catch {
      return null;
    }
  }

  private async llmAssistedVerification(
    input: CheckMathAgenticInput,
    context: ToolContext
  ): Promise<CheckMathAgenticOutput> {
    const startTime = Date.now();
    context.logger.info(
      `[CheckMathWithMathJsTool] Falling back to LLM-assisted verification`
    );

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
  - displayCorrection: Brief correction like "60 → 70" or "5 → 4"
  - expectedValue: The correct value (optional)
  - actualValue: The incorrect value from the statement (optional)`;

    const userPrompt = `Verify this mathematical statement: "${input.statement}"${input.context ? `\nContext: ${input.context}` : ""}`;

    // Generate cache seed
    const cacheSeed = generateCacheSeed("math-check-mathjs-llm", [
      input.statement,
      input.context || "",
    ]);

    try {
      const result = await callClaude({
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        max_tokens: 1000,
        temperature: 0,
        model: MODEL_CONFIG.analysis,
        enablePromptCaching: true,
        cacheSeed,
      });

      // Parse the response
      let parsed: any;
      try {
        // Extract JSON from the response
        const firstContent = result.response.content[0];
        if (firstContent.type === "text") {
          const jsonMatch = firstContent.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("No JSON found in response");
          }
        } else {
          throw new Error("Expected text content in response");
        }
      } catch (e) {
        // If parsing fails, return cannot_verify
        return {
          statement: input.statement,
          status: "cannot_verify",
          explanation: "Could not parse the verification result.",
          llmInteraction: {
            model: MODEL_CONFIG.analysis,
            prompt: userPrompt,
            response: "Failed to parse JSON response",
            tokensUsed: { prompt: 0, completion: 0, total: 0 },
            timestamp: new Date(),
            duration: Date.now() - startTime,
          },
        };
      }

      // Build the output
      const output: CheckMathAgenticOutput = {
        statement: input.statement,
        status: parsed.status || "cannot_verify",
        explanation: parsed.explanation || "No explanation provided.",
        llmInteraction: {
          model: result.interaction.model,
          prompt: result.interaction.prompt,
          response: result.interaction.response,
          tokensUsed: result.interaction.tokensUsed,
          timestamp: new Date(),
          duration: Date.now() - startTime,
        },
      };

      // Add verification details if present
      if (parsed.mathJsExpression || parsed.computedValue) {
        output.verificationDetails = {
          mathJsExpression: String(parsed.mathJsExpression || ""),
          computedValue: String(parsed.computedValue || ""),
          steps: parsed.steps || [],
        };
      }

      // Add error details if present
      if (parsed.errorDetails) {
        // Map any invalid error types to valid ones
        const validErrorTypes = [
          "calculation",
          "logic",
          "unit",
          "notation",
          "conceptual",
        ];
        const errorType = parsed.errorDetails.errorType;
        if (!validErrorTypes.includes(errorType)) {
          // Map common variations to valid types
          if (errorType === "rounding_error" || errorType === "rounding") {
            parsed.errorDetails.errorType = "calculation";
          } else {
            parsed.errorDetails.errorType = "calculation"; // Default to calculation
          }
        }
        // Ensure all string fields are actually strings
        if (parsed.errorDetails.expectedValue !== undefined) {
          parsed.errorDetails.expectedValue = String(
            parsed.errorDetails.expectedValue
          );
        }
        if (parsed.errorDetails.actualValue !== undefined) {
          parsed.errorDetails.actualValue = String(
            parsed.errorDetails.actualValue
          );
        }
        if (parsed.errorDetails.displayCorrection !== undefined) {
          parsed.errorDetails.displayCorrection = String(
            parsed.errorDetails.displayCorrection
          );
        }
        output.errorDetails = parsed.errorDetails;
      }

      return output;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      context.logger.error(
        "[CheckMathWithMathJsTool] LLM verification failed:",
        {
          error: errorMessage,
          statement: input.statement,
          stack: error instanceof Error ? error.stack : undefined,
        }
      );

      return {
        statement: input.statement,
        status: "cannot_verify",
        explanation: `LLM verification failed: ${errorMessage}`,
        llmInteraction: {
          model: MODEL_CONFIG.analysis,
          prompt: userPrompt,
          response: `Error: ${errorMessage}`,
          tokensUsed: { prompt: 0, completion: 0, total: 0 },
          timestamp: new Date(),
          duration: Date.now() - startTime,
        },
      };
    }
  }

  private evaluateExpression(
    input: { expression: string },
    context: ToolContext
  ): any {
    try {
      // Try equality comparison first
      const equalityResult = this.tryEvaluateEquality(
        input.expression,
        context
      );
      if (equalityResult) {
        return equalityResult;
      }

      // Fall back to standard evaluation
      return this.evaluateStandard(input.expression);
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        type: "error",
      };
    }
  }

  private tryEvaluateEquality(
    expression: string,
    context: ToolContext
  ): any | null {
    // Use the parser-based approach to check for equality
    const equalityCheck = parseEqualityStatement(expression);

    if (!equalityCheck || !equalityCheck.isEquality) {
      return null;
    }

    // If we couldn't evaluate the sides (e.g., symbolic math), return null
    if (
      equalityCheck.leftValue === undefined ||
      equalityCheck.rightValue === undefined
    ) {
      context.logger.debug(
        `Equality detected but couldn't evaluate sides: ${expression}`
      );
      return null;
    }

    try {
      const comparison = this.compareEqualityValues(
        equalityCheck.leftValue,
        equalityCheck.rightValue
      );

      return {
        success: true,
        result: comparison.isEqual ? "true" : "false",
        type: "boolean",
        raw: comparison.isEqual,
        comparisonDetails: {
          left: formatNumber(equalityCheck.leftValue),
          right: formatNumber(equalityCheck.rightValue),
          isEqual: comparison.isEqual,
          reason: comparison.reason,
          operator: equalityCheck.operator,
          leftExpression: equalityCheck.leftExpression,
          rightExpression: equalityCheck.rightExpression,
        },
      };
    } catch (evalError) {
      // If comparison fails, return null to try standard evaluation
      context.logger.debug(`Failed to compare equality values: ${evalError}`);
      return null;
    }
  }

  private compareEqualityValues(
    leftValue: any,
    rightValue: any
  ): ComparisonResult {
    // Check if both values are Units (MathJS Unit objects)
    if (
      typeof leftValue === "object" &&
      typeof rightValue === "object" &&
      leftValue !== null &&
      rightValue !== null
    ) {
      // Use MathJS equal function for unit comparison
      try {
        const equalResult = equal(leftValue, rightValue);
        const isEqual = Boolean(equalResult);
        return {
          isEqual,
          reason: isEqual
            ? "Unit values are equal"
            : "Unit values are not equal",
          statedValue: this.formatValue(rightValue),
          computedValue: leftValue, // Keep as object for now
        };
      } catch (e) {
        // If equal() fails, fall through to numeric comparison
      }
    }

    // Convert values to numbers for comparison
    const leftNumber =
      typeof leftValue === "number" ? leftValue : parseFloat(String(leftValue));
    const rightNumber =
      typeof rightValue === "number"
        ? rightValue
        : parseFloat(String(rightValue));

    // Use deterministic comparison with standard options
    return compareNumericValues(formatNumber(rightNumber), leftNumber, {
      allowApproximation: true,
      useRelativeTolerance: false,
      absoluteTolerance: 1e-10,
    });
  }

  private evaluateStandard(expression: string): any {
    const result = evaluate(expression);

    return {
      success: true,
      result: this.formatResult(result),
      type: typeof result,
      raw: result,
    };
  }

  private formatResult(result: any): string {
    if (typeof result === "boolean") {
      return result.toString();
    } else if (typeof result === "number") {
      return formatNumber(result);
    } else {
      return format(result);
    }
  }

  /**
   * Format a value for display, handling both numbers and MathJS Unit objects
   * @param value - The value to format (number, Unit, or other)
   * @returns Formatted string representation
   */
  private formatValue(value: any): string {
    if (value === undefined || value === null) {
      return String(value);
    }

    // Check if it's a number
    if (typeof value === "number") {
      return formatNumber(value);
    }

    // Check if it's a MathJS Unit or other object with toString
    if (typeof value === "object") {
      // Use MathJS format if available, otherwise toString
      try {
        return format(value);
      } catch {
        // Fall back to toString if format fails
        if (typeof value.toString === "function") {
          return value.toString();
        }
      }
    }

    // Default: convert to string
    return String(value);
  }

  /**
   * Determine the evaluation strategy based on value types
   * @param leftValue - Left side value
   * @param rightValue - Right side value
   * @returns Strategy: 'units', 'numbers', or 'mixed'
   */
  private determineEvaluationStrategy(
    leftValue: any,
    rightValue: any
  ): "units" | "numbers" | "mixed" {
    const leftIsNumber = typeof leftValue === "number";
    const rightIsNumber = typeof rightValue === "number";
    const leftIsUnit =
      typeof leftValue === "object" &&
      leftValue !== null &&
      leftValue.constructor?.name === "Unit";
    const rightIsUnit =
      typeof rightValue === "object" &&
      rightValue !== null &&
      rightValue.constructor?.name === "Unit";

    if (leftIsUnit || rightIsUnit) {
      return "units";
    }

    if (leftIsNumber && rightIsNumber) {
      return "numbers";
    }

    return "mixed";
  }

  /**
   * Compare numeric values with approximation and severity levels
   * @param leftValue - Computed value (left side of equation)
   * @param rightValue - Stated value (right side of equation)
   * @param originalStatement - Original statement for context
   * @returns Comparison result with severity and approximation quality
   */
  private compareNumericValuesWithApproximation(
    leftValue: number,
    rightValue: number,
    originalStatement: string
  ): ComparisonResult & {
    severity?: "minor" | "major" | "critical";
    approximationQuality?: "exact" | "good" | "acceptable" | "poor" | "warning";
    shouldWarn?: boolean;
  } {
    // Extract the right side's original text for precision detection
    const rightSideOriginal =
      originalStatement.split(/[=≈≅]/)[1]?.trim() || String(rightValue);

    // Use our existing comparison logic
    const comparison = compareNumericValues(rightSideOriginal, leftValue, {
      allowApproximation: true,
      useRelativeTolerance: false,
      absoluteTolerance: 1e-10,
    });

    // Calculate difference metrics
    const absoluteDiff = Math.abs(leftValue - rightValue);
    const relativeDiff =
      leftValue !== 0 ? absoluteDiff / Math.abs(leftValue) : absoluteDiff;

    // Special handling for mathematical constants
    const isConstant =
      originalStatement.toLowerCase().includes("pi") ||
      originalStatement.includes("π") ||
      originalStatement.toLowerCase().includes("e");

    // Determine approximation quality and warning status
    let approximationQuality:
      | "exact"
      | "good"
      | "acceptable"
      | "poor"
      | "warning" = "exact";
    let shouldWarn = false;

    if (absoluteDiff === 0) {
      approximationQuality = "exact";
    } else if (comparison.isEqual) {
      // It matched with approximation rules, but check if it's too rough

      // Special handling for constants with very low precision
      const decimalPlaces = countDecimalPlaces(rightSideOriginal);
      const isVeryLowPrecision = decimalPlaces <= 1;

      if (relativeDiff < 0.0001) {
        approximationQuality = "exact"; // Less than 0.01% difference
      } else if (relativeDiff < 0.001) {
        approximationQuality = "good"; // Less than 0.1% difference
      } else if (relativeDiff < 0.005) {
        approximationQuality = "acceptable"; // Less than 0.5% difference
      } else if (decimalPlaces === 0) {
        // When explicitly using 0 decimal places (integers), accept it
        approximationQuality = "acceptable";
      } else if (decimalPlaces === 1) {
        // Single decimal place approximations should warn if >0.5% off
        approximationQuality = "warning";
        shouldWarn = true;
      } else if (relativeDiff > 0.01) {
        // For any calculation with >1% error, warn
        approximationQuality = "warning";
        shouldWarn = true;
      } else {
        approximationQuality = "acceptable";
      }
    }

    // Enhanced severity detection for errors
    if (!comparison.isEqual) {
      let severity: "minor" | "major" | "critical" = "major";

      // Special cases for common approximations that should be warnings
      if (isConstant) {
        // For mathematical constants, be more lenient
        if (relativeDiff < 0.05) {
          // Less than 5% for constants
          severity = "minor"; // This would make π = 3.1 a warning
        } else if (relativeDiff < 0.15) {
          // Less than 15%
          severity = "major";
        } else {
          severity = "critical"; // π = 3.0 would be critical (>15% off)
        }
      } else {
        // For regular calculations
        if (relativeDiff < 0.001) {
          // Less than 0.1% difference - probably a rounding issue
          severity = "minor";
        } else if (relativeDiff < 0.05) {
          // Less than 5% difference
          severity = "major";
        } else {
          // 5% or more difference
          severity = "critical";
        }
      }

      // Adjust reason to include approximation context
      const enhancedReason =
        comparison.reason +
        (severity === "minor"
          ? " (close approximation)"
          : severity === "major"
            ? " (significant difference)"
            : " (large error)");

      return {
        ...comparison,
        reason: enhancedReason,
        severity,
        approximationQuality: "poor",
      };
    }

    // For equal cases, enhance the reason with approximation quality
    if (approximationQuality !== "exact" && comparison.isEqual) {
      const enhancedReason =
        comparison.reason +
        (approximationQuality === "good"
          ? " (good approximation)"
          : approximationQuality === "warning"
            ? " (rough approximation - consider using more precision)"
            : " (acceptable approximation)");

      return {
        ...comparison,
        reason: enhancedReason,
        approximationQuality,
        shouldWarn,
      };
    }

    return {
      ...comparison,
      approximationQuality,
      shouldWarn,
    };
  }
}

// Export singleton instance
export const checkMathWithMathJsTool = new CheckMathWithMathJsTool();
export default checkMathWithMathJsTool;
