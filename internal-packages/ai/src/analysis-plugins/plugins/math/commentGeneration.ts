import type {
  ExtractedMathExpression,
} from "../../../tools/extract-math-expressions";
import type { ExtractedMathExpression as ExtractedMathExpressionClass } from "./index";
import { styleHeader, CommentSeverity, importanceToSeverity, formatDiff, formatConciseCorrection, formatSmartDiff, SEVERITY_STYLES, errorScoreToSeverity } from "../../utils/comment-styles";

/**
 * Generate a comment for a single math expression
 */
export function generateMathComment(
  expression: ExtractedMathExpression
): string {
  if (expression.hasError) {
    return generateErrorComment(expression);
  }
  
  // For non-error expressions, generate informative comments
  return generateInformativeComment(expression);
}

/**
 * Generate comment for math expression with error
 */
function generateErrorComment(expression: ExtractedMathExpression): string {
  // Determine severity based on error score
  const severity = errorScoreToSeverity(expression.errorSeverityScore);
  
  // Build header with emoji
  let headerContent = '';
  
  // Priority 1: Use conciseCorrection if available
  if (expression.conciseCorrection) {
    headerContent = formatConciseCorrection(expression.conciseCorrection);
  } 
  // Priority 2: Try to extract concise diff from full versions
  else if (expression.correctedVersion) {
    headerContent = extractConciseDiff(expression.originalText, expression.correctedVersion);
  } 
  // Priority 3: Fall back to error type
  else {
    headerContent = expression.errorType || 'Calculation Error';
  }
  
  // Use different emoji based on severity
  const emoji = severity === CommentSeverity.CRITICAL ? '🚨' :
                severity === CommentSeverity.HIGH ? '⚠️' :
                '📝';
  
  const style = SEVERITY_STYLES[severity];
  const styledHeader = `${emoji} [Math] <span style="color: ${style.color}">${headerContent}</span>`;
  
  // Build content sections
  let content = styledHeader;
  
  // Add explanation if available
  if (expression.errorExplanation) {
    content += `  \n${expression.errorExplanation}`;
  }
  
  // Add score table for errors
  content += '\n\n';
  content += '| Metric | Score |\n';
  content += '|--------|-------|\n';
  content += `| Complexity | ${expression.complexityScore}/100 |\n`;
  content += `| Context Importance | ${expression.contextImportanceScore}/100 |\n`;
  content += `| Error Severity | ${expression.errorSeverityScore}/100 |\n`;
  content += `| Verification | ${expression.verificationStatus} |\n`;
  
  return content;
}

/**
 * Extract a concise diff between original and corrected expressions
 * Tries multiple strategies to create the most readable diff
 */
function extractConciseDiff(original: string, corrected: string): string {
  // Strategy 1: If it's a simple calculation with result (e.g., "2+2=5" -> "2+2=4")
  const originalResult = extractResult(original);
  const correctedResult = extractResult(corrected);
  
  if (originalResult && correctedResult && originalResult !== correctedResult) {
    // Just show the result difference
    return formatDiff(originalResult, correctedResult);
  }
  
  // Strategy 2: Find the minimal differing part
  const minimalDiff = findMinimalDiff(original, corrected);
  if (minimalDiff) {
    return formatDiff(minimalDiff.original, minimalDiff.corrected);
  }
  
  // Strategy 3: If expressions are short enough, show full diff
  if (original.length <= 20 && corrected.length <= 20) {
    return formatDiff(original, corrected);
  }
  
  // Strategy 4: Try to extract key terms/numbers that differ
  const keyDiff = extractKeyDifference(original, corrected);
  if (keyDiff) {
    return formatDiff(keyDiff.original, keyDiff.corrected);
  }
  
  // Fallback: Show truncated versions
  const maxLength = 15;
  const truncatedOriginal = original.length > maxLength ? original.substring(0, maxLength) + '...' : original;
  const truncatedCorrected = corrected.length > maxLength ? corrected.substring(0, maxLength) + '...' : corrected;
  return formatDiff(truncatedOriginal, truncatedCorrected);
}

/**
 * Helper to extract result from math expression (e.g., "2+2=5" -> "5")
 */
function extractResult(expr: string): string | null {
  const match = expr.match(/=\s*([^=]+)$/);
  return match ? match[1].trim() : null;
}

/**
 * Find the minimal differing part between two expressions
 */
function findMinimalDiff(original: string, corrected: string): { original: string; corrected: string } | null {
  // Find common prefix
  let prefixEnd = 0;
  for (let i = 0; i < Math.min(original.length, corrected.length); i++) {
    if (original[i] === corrected[i]) {
      prefixEnd = i + 1;
    } else {
      break;
    }
  }
  
  // Find common suffix
  let suffixStart = 0;
  for (let i = 0; i < Math.min(original.length - prefixEnd, corrected.length - prefixEnd); i++) {
    const origIdx = original.length - 1 - i;
    const corrIdx = corrected.length - 1 - i;
    if (original[origIdx] === corrected[corrIdx] && origIdx >= prefixEnd && corrIdx >= prefixEnd) {
      suffixStart = i + 1;
    } else {
      break;
    }
  }
  
  // Extract the differing parts
  const origDiff = original.substring(prefixEnd, original.length - suffixStart);
  const corrDiff = corrected.substring(prefixEnd, corrected.length - suffixStart);
  
  // Only return if the diff is meaningful and not too long
  if (origDiff && corrDiff && origDiff.length <= 10 && corrDiff.length <= 10) {
    return { original: origDiff, corrected: corrDiff };
  }
  
  return null;
}

/**
 * Extract key differences between expressions (numbers, variables, operators)
 */
function extractKeyDifference(original: string, corrected: string): { original: string; corrected: string } | null {
  // Tokenize both expressions
  const originalTokens = tokenizeMathExpression(original);
  const correctedTokens = tokenizeMathExpression(corrected);
  
  // Find the first significant difference
  for (let i = 0; i < Math.min(originalTokens.length, correctedTokens.length); i++) {
    if (originalTokens[i] !== correctedTokens[i]) {
      // Check if this is a meaningful difference (not just whitespace or similar)
      if (isSignificantToken(originalTokens[i]) && isSignificantToken(correctedTokens[i])) {
        return { original: originalTokens[i], corrected: correctedTokens[i] };
      }
    }
  }
  
  // Check for length differences (missing terms)
  if (originalTokens.length !== correctedTokens.length) {
    if (originalTokens.length > correctedTokens.length) {
      const extraTokens = originalTokens.slice(correctedTokens.length).filter(isSignificantToken);
      if (extraTokens.length > 0) {
        return { original: extraTokens[0], corrected: '∅' };
      }
    } else {
      const extraTokens = correctedTokens.slice(originalTokens.length).filter(isSignificantToken);
      if (extraTokens.length > 0) {
        return { original: '∅', corrected: extraTokens[0] };
      }
    }
  }
  
  return null;
}

/**
 * Tokenize a math expression into meaningful parts
 */
function tokenizeMathExpression(expr: string): string[] {
  // Split on operators and spaces while keeping the operators
  return expr.match(/\d+\.?\d*|[a-zA-Z]+|\S/g) || [];
}

/**
 * Check if a token is significant (not just punctuation or whitespace)
 */
function isSignificantToken(token: string): boolean {
  return /^[\d.]+$/.test(token) || /^[a-zA-Z]+$/.test(token) || /^[+\-*/=<>]$/.test(token);
}

/**
 * Generate informative comment for complex or important math
 */
function generateInformativeComment(expression: ExtractedMathExpression): string {
  // Only generate comments for truly noteworthy expressions
  
  // For highly complex expressions with explanations
  if (expression.complexityScore >= 90 && expression.simplifiedExplanation) {
    const style = SEVERITY_STYLES[CommentSeverity.INFO];
    const header = `🧮 [Math] <span style="color: ${style.color}">Complex Calculation</span>`;
    
    let content = header;
    content += `\n${expression.simplifiedExplanation}`;
    
    // Add score table
    content += '\n\n';
    content += '| Metric | Score |\n';
    content += '|--------|-------|\n';
    content += `| Complexity | ${expression.complexityScore}/100 |\n`;
    content += `| Context Importance | ${expression.contextImportanceScore}/100 |\n`;
    content += `| Verification | ${expression.verificationStatus} |\n`;
    
    return content;
  }
  
  // Don't create comments for:
  // - Simple verified calculations
  // - Unverifiable calculations (too noisy)
  // - Expressions without errors or specific insights
  
  return '';
}

/**
 * Generate a summary of all math expressions in the document
 */
export function generateDocumentSummary(
  expressions: ExtractedMathExpressionClass[]
): string {
  if (expressions.length === 0) {
    return "No mathematical expressions were found in this document.";
  }
  
  const sections: string[] = [];
  
  // Overview
  const totalCount = expressions.length;
  const errorCount = expressions.filter(e => e.expression.hasError).length;
  const complexCount = expressions.filter(e => e.expression.complexityScore > 70).length;
  
  sections.push(`## Mathematical Content Analysis\n`);
  sections.push(`Found ${totalCount} mathematical expressions in this document.`);
  
  // Errors section
  if (errorCount > 0) {
    sections.push(`\n### Errors Found (${errorCount})\n`);
    
    const errors = expressions
      .filter(e => e.expression.hasError)
      .sort((a, b) => b.expression.errorSeverityScore - a.expression.errorSeverityScore)
      .slice(0, 5);
    
    for (const error of errors) {
      const expr = error.expression;
      sections.push(`- **${expr.errorType || "Math Error"}**: "${expr.originalText}"`);
      if (expr.errorExplanation) {
        sections.push(`  - ${expr.errorExplanation}`);
      }
      if (expr.correctedVersion) {
        sections.push(`  - Correct: \`${expr.correctedVersion}\``);
      }
    }
    
    if (errorCount > 5) {
      sections.push(`\n...and ${errorCount - 5} more errors.`);
    }
  }
  
  // Complex calculations section
  if (complexCount > 0) {
    sections.push(`\n### Complex Calculations (${complexCount})\n`);
    
    const complex = expressions
      .filter(e => e.expression.complexityScore > 70 && !e.expression.hasError)
      .sort((a, b) => b.expression.complexityScore - a.expression.complexityScore)
      .slice(0, 3);
    
    for (const item of complex) {
      const expr = item.expression;
      sections.push(`- "${expr.originalText}"`);
      if (expr.simplifiedExplanation) {
        sections.push(`  - ${expr.simplifiedExplanation}`);
      }
    }
  }
  
  // Summary insights
  sections.push(`\n### Summary\n`);
  
  if (errorCount === 0) {
    sections.push("✓ All mathematical expressions appear to be correct.");
  } else {
    const errorRate = (errorCount / totalCount * 100).toFixed(0);
    sections.push(`⚠️ ${errorRate}% of mathematical expressions contain errors.`);
    
    const severeErrors = expressions.filter(
      e => e.expression.hasError && e.expression.errorSeverityScore >= 80
    ).length;
    
    if (severeErrors > 0) {
      sections.push(`\n**${severeErrors} severe error${severeErrors > 1 ? 's' : ''} found that significantly impact the document's conclusions.**`);
    }
  }
  
  // Mathematical rigor assessment
  const avgComplexity = expressions.reduce(
    (sum, e) => sum + e.expression.complexityScore, 0
  ) / totalCount;
  
  if (avgComplexity > 60) {
    sections.push("\nThis document contains sophisticated mathematical analysis.");
  } else if (avgComplexity < 30) {
    sections.push("\nThe mathematical content is relatively straightforward.");
  }
  
  return sections.join("\n");
}