import type {
  ExtractedMathExpression,
} from "../../../tools/math-expressions-extractor";
import type { ExtractedMathExpression as ExtractedMathExpressionClass } from "./index";
import { CommentSeverity, SEVERITY_STYLES } from "../../utils/comment-styles";

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
  // Build content sections
  let content = '';
  
  // Add explanation if available (this is the main content now)
  if (expression.errorExplanation) {
    content = expression.errorExplanation;
  } else {
    // Fallback if no explanation provided
    content = 'Mathematical expression contains an error.';
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
 * Generate informative comment for complex or important math
 */
function generateInformativeComment(expression: ExtractedMathExpression): string {
  // Only generate comments for truly noteworthy expressions
  
  // For highly complex expressions with explanations
  if (expression.complexityScore >= 90 && expression.simplifiedExplanation) {
    let content = expression.simplifiedExplanation;
    
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