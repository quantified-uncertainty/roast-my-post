import type {
  ExtractedMathExpression,
} from "@/tools/extract-math-expressions";
import type { ExtractedMathExpression as ExtractedMathExpressionClass } from "./index";

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
  const parts: string[] = [];
  
  // Start with error type
  if (expression.errorType) {
    parts.push(`**${expression.errorType}**:`);
  } else {
    parts.push(`**Math Error**:`);
  }
  
  // Add error explanation
  if (expression.errorExplanation) {
    parts.push(expression.errorExplanation);
  }
  
  // Add corrected version if available
  if (expression.correctedVersion) {
    parts.push(`\n\nCorrect: \`${expression.correctedVersion}\``);
  }
  
  // Add severity indicator
  if (expression.errorSeverityScore >= 80) {
    parts.push("\n\n⚠️ This is a significant error that affects the conclusions.");
  } else if (expression.errorSeverityScore >= 50) {
    parts.push("\n\n⚠️ This error may impact understanding.");
  }
  
  return parts.join(" ");
}

/**
 * Generate informative comment for complex or important math
 */
function generateInformativeComment(expression: ExtractedMathExpression): string {
  const parts: string[] = [];
  
  // For highly complex expressions
  if (expression.complexityScore >= 80) {
    parts.push("**Complex Calculation**:");
    
    if (expression.simplifiedExplanation) {
      parts.push(expression.simplifiedExplanation);
    } else {
      parts.push("This is a complex mathematical expression.");
    }
  }
  
  // For contextually important expressions
  else if (expression.contextImportanceScore >= 80) {
    parts.push("**Key Result**:");
    parts.push("This calculation is central to the document's argument.");
  }
  
  // Add verification note if relevant
  if (expression.verificationStatus === "verified") {
    parts.push("\n\n✓ Calculation verified");
  } else if (expression.verificationStatus === "unverifiable") {
    parts.push("\n\n⚠️ Unable to verify without additional context");
  }
  
  return parts.join(" ");
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