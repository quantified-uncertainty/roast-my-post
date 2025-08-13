/**
 * MathJS parser utilities for analyzing mathematical expressions
 * Uses MathJS's AST (Abstract Syntax Tree) for robust expression analysis
 */

import { parse, evaluate } from 'mathjs';
import type { MathNode } from 'mathjs';

/**
 * Check if a MathJS node represents an equality comparison
 */
function isEqualityNode(node: MathNode): boolean {
  // Check if it's an operator node with equality functions
  if (node.type === 'OperatorNode') {
    const op = (node as any).fn;
    // MathJS equality operators
    return op === 'equal' ||      // ==
           op === 'unequal' ||    // !=
           op === 'larger' ||     // >
           op === 'smaller' ||    // <
           op === 'largerEq' ||   // >=
           op === 'smallerEq';   // <=
  }
  return false;
}

/**
 * Check if a MathJS node represents a simple equality (==)
 */
function isSimpleEqualityNode(node: MathNode): boolean {
  if (node.type === 'OperatorNode') {
    const op = (node as any).fn;
    return op === 'equal';
  }
  return false;
}

/**
 * Parse and analyze a mathematical expression using MathJS's AST
 * @param expression - The mathematical expression to parse
 * @returns Parsed expression info or null if not valid
 */
export interface ParsedExpression {
  node: MathNode;
  isEquality: boolean;
  isSimpleEquality: boolean;
  leftNode?: MathNode;
  rightNode?: MathNode;
  operator?: string;
}

export function parseMathExpression(expression: string): ParsedExpression | null {
  try {
    // Parse the expression into an AST
    const node = parse(expression);
    
    const isEquality = isEqualityNode(node);
    const isSimpleEquality = isSimpleEqualityNode(node);
    
    let leftNode: MathNode | undefined;
    let rightNode: MathNode | undefined;
    let operator: string | undefined;
    
    if (isEquality && node.type === 'OperatorNode') {
      const opNode = node as any;
      leftNode = opNode.args?.[0];
      rightNode = opNode.args?.[1];
      operator = opNode.fn;
    }
    
    return {
      node,
      isEquality,
      isSimpleEquality,
      leftNode,
      rightNode,
      operator
    };
  } catch (error) {
    // Failed to parse - not a valid mathematical expression
    return null;
  }
}

/**
 * Evaluate both sides of an equality expression
 * @param parsed - Parsed expression from parseMathExpression
 * @returns Values of left and right sides, or null if not an equality
 */
export interface EqualityValues {
  leftValue: any;
  rightValue: any;
  leftString: string;
  rightString: string;
  operator: string;
}

export function evaluateEquality(parsed: ParsedExpression): EqualityValues | null {
  if (!parsed.isEquality || !parsed.leftNode || !parsed.rightNode) {
    return null;
  }
  
  try {
    // Evaluate each side of the equality
    const leftValue = parsed.leftNode.evaluate();
    const rightValue = parsed.rightNode.evaluate();
    
    // Get string representations
    const leftString = parsed.leftNode.toString();
    const rightString = parsed.rightNode.toString();
    
    return {
      leftValue,
      rightValue,
      leftString,
      rightString,
      operator: parsed.operator || 'equal'
    };
  } catch (error) {
    // Failed to evaluate one or both sides
    return null;
  }
}

/**
 * Check if an expression contains equality and evaluate it properly
 * This is the main function to use for equality checking
 * @param expression - The mathematical expression to check
 * @returns Evaluation result or null if not an equality expression
 */
export interface EqualityCheckResult {
  isEquality: boolean;
  leftValue?: any;
  rightValue?: any;
  leftExpression?: string;
  rightExpression?: string;
  operator?: string;
  evaluationResult?: boolean;
}

export function checkEqualityExpression(expression: string): EqualityCheckResult {
  const parsed = parseMathExpression(expression);
  
  if (!parsed) {
    return { isEquality: false };
  }
  
  if (!parsed.isEquality) {
    return { isEquality: false };
  }
  
  const values = evaluateEquality(parsed);
  
  if (!values) {
    return { 
      isEquality: true,
      operator: parsed.operator
    };
  }
  
  // For simple equality, we can also evaluate the entire expression
  let evaluationResult: boolean | undefined;
  try {
    const fullResult = evaluate(expression);
    if (typeof fullResult === 'boolean') {
      evaluationResult = fullResult;
    }
  } catch {
    // Couldn't evaluate as a whole - that's okay
  }
  
  return {
    isEquality: true,
    leftValue: values.leftValue,
    rightValue: values.rightValue,
    leftExpression: values.leftString,
    rightExpression: values.rightString,
    operator: values.operator,
    evaluationResult
  };
}

/**
 * Format a mathematical expression for comparison
 * Handles special symbols and normalizations
 * @param expression - The expression to format
 * @returns Formatted expression ready for MathJS
 */
export function formatForMathJS(expression: string): string {
  let formatted = expression;
  
  // Convert special mathematical symbols to MathJS equivalents
  formatted = formatted.replace(/π/g, 'pi');
  formatted = formatted.replace(/×/g, '*');
  formatted = formatted.replace(/÷/g, '/');
  formatted = formatted.replace(/−/g, '-');  // en dash
  formatted = formatted.replace(/–/g, '-');  // em dash
  formatted = formatted.replace(/√/g, 'sqrt');
  formatted = formatted.replace(/∞/g, 'Infinity');
  
  // Convert single = to == for equality (MathJS uses == for comparison)
  // But be careful not to convert == to ===
  formatted = formatted.replace(/(?<![=!<>])=(?!=)/g, '==');
  
  // Handle approximation symbols
  formatted = formatted.replace(/≈/g, '==');  // Treat approximation as equality for evaluation
  formatted = formatted.replace(/≅/g, '==');  // Congruent symbol
  
  return formatted;
}

/**
 * Try to parse a statement as an equality using various formats
 * This is more forgiving than strict parsing and tries multiple approaches
 * @param statement - The statement to parse
 * @returns Parsed equality or null
 */
export function parseEqualityStatement(statement: string): EqualityCheckResult | null {
  // First try the statement as-is
  let result = checkEqualityExpression(statement);
  if (result.isEquality) {
    return result;
  }
  
  // Try formatting it for MathJS
  const formatted = formatForMathJS(statement);
  result = checkEqualityExpression(formatted);
  if (result.isEquality) {
    return result;
  }
  
  // As a last resort, try the old string-based approach for edge cases
  // (like natural language statements: "The result is 5")
  // But return null for now to keep it clean
  return null;
}