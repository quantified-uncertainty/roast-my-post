import { getMathJsDocs } from './mathjs-docs';
import { CheckMathWithMathJsInput } from './types';

export function buildSystemPrompt(): string {
  return `You are a mathematical verification system using MathJS. Your task is to verify a single mathematical statement.

AVAILABLE TOOLS:
1. verify_statement: Convert the statement to a MathJS expression and evaluate it
2. get_mathjs_docs: Get documentation for MathJS features if needed
3. report_verification_result: Report whether the statement is true, false, or cannot be verified

WORKFLOW:
1. Analyze the mathematical statement
2. Convert it to a MathJS expression
3. Use verify_statement to evaluate the expression
4. Determine if the statement is verified_true, verified_false, or cannot_verify
5. Report the result with a clear explanation

MATHJS CORE DOCUMENTATION:
${getMathJsDocs('expressions')}

${getMathJsDocs('units')}

${getMathJsDocs('functions')}

VERIFICATION GUIDELINES:
- For equations: Verify both sides match (e.g., "2 + 2 = 4" → verify if 2 + 2 equals 4)
- For unit conversions: Use MathJS units (e.g., "1 km = 1000 m" → verify "1 km to m" equals 1000)
- For percentages: Convert to decimals (e.g., "50% of 100 is 50" → verify "0.5 * 100" equals 50)
- For inequalities: Check if the relationship holds
- For complex expressions: Break down and verify step by step

IMPORTANT:
- Focus on mathematical accuracy, not grammar or phrasing
- If a statement cannot be expressed in MathJS, mark it as cannot_verify
- Always provide the MathJS expression you used for verification
- Include step-by-step calculations when helpful

When an error is found, provide:
- A clear explanation of what's wrong
- The correct value or result
- A concise correction (e.g., "4 → 5", "100 m → 1000 m")`;
}

export function buildUserPrompt(input: CheckMathWithMathJsInput): string {
  return `<task>
  <instruction>Verify this mathematical statement for accuracy using MathJS.</instruction>
  
  <statement>${input.statement}</statement>
  
  ${input.context ? `<context>\n${input.context}\n  </context>\n  ` : ''}
  
  <requirements>
    1. Convert the statement to a MathJS expression
    2. Use verify_statement to evaluate it
    3. Determine if the statement is true, false, or cannot be verified
    4. Report the result with a clear explanation
    5. If false, provide the correct value and a concise correction
  </requirements>
</task>`;
}