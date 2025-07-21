/**
 * Math analysis utilities
 */

import { ErrorPatternAnalyzer } from "../../../analyzers/ErrorPatternAnalyzer";
import type {
  LocatedFinding,
  PotentialFinding,
} from "../../MathPlugin.types";

export interface MathAnalysisResult {
  summary: string;
  analysisSummary: string;
}

/**
 * Analyze math findings and generate summary
 */
export function analyzeMathFindings(
  potential: PotentialFinding[],
  located: LocatedFinding[]
): MathAnalysisResult {
  // Count correct and incorrect equations
  const correctEquations = potential.filter((f) => f.type === "math_correct");
  const errorEquations = potential.filter((f) => f.type === "math_error");
  const totalEquations = correctEquations.length + errorEquations.length;
  const errorCount = errorEquations.length;
  const errorRate =
    totalEquations > 0 ? (errorCount / totalEquations) * 100 : 0;

  // Prepare errors for pattern analysis
  const errorsForAnalysis = errorEquations.map((finding) => {
    const data = finding.data as {
      equation: string;
      error: string;
      context: string;
    };
    return {
      text: data.equation,
      description: data.error,
      equation: data.equation,
      error: data.error,
      context: data.context,
    };
  });

  // Use ErrorPatternAnalyzer
  const analyzer = ErrorPatternAnalyzer.forMath();
  const analysis = analyzer.analyze(errorsForAnalysis);

  const summary = `Found ${totalEquations} mathematical expressions with ${errorCount} errors (${errorRate.toFixed(1)}% error rate). ${analysis.summary}`;

  // Build analysis summary markdown
  const analysisSummary = buildAnalysisSummary({
    totalEquations,
    correctEquations: correctEquations.length,
    errorCount,
    errorRate,
    errorEquations,
    analysis,
    locatedCount: located.length,
    investigatedCount: errorCount, // We only investigate errors
  });

  return { summary, analysisSummary };
}

/**
 * Build detailed analysis summary in markdown
 */
function buildAnalysisSummary(params: {
  totalEquations: number;
  correctEquations: number;
  errorCount: number;
  errorRate: number;
  errorEquations: PotentialFinding[];
  analysis: any;
  locatedCount: number;
  investigatedCount: number;
}): string {
  let summary = `## Mathematical Analysis\n\n`;

  if (params.totalEquations === 0) {
    return summary + `No mathematical expressions found in the document.\n`;
  }

  summary += `### Expression Summary\n`;
  summary += `- Total expressions analyzed: ${params.totalEquations}\n`;
  summary += `- Correct expressions: ${params.correctEquations}\n`;
  summary += `- Errors found: ${params.errorCount}\n`;
  summary += `- Error rate: ${params.errorRate.toFixed(1)}%\n\n`;

  if (params.errorCount > 0) {
    summary += `### Error Breakdown\n`;

    // Group errors by type
    const errorsByType = groupErrorsByType(params.errorEquations);

    errorsByType.forEach((errors, type) => {
      summary += `\n#### ${type} (${errors.length} errors)\n`;
      errors.slice(0, 3).forEach((error) => {
        summary += `- \`${error.equation}\` - ${error.error}\n`;
      });
      if (errors.length > 3) {
        summary += `- ...and ${errors.length - 3} more\n`;
      }
    });
  }

  // Add pattern analysis
  if (params.analysis.patterns.size > 0) {
    summary += `\n### Pattern Analysis\n`;
    params.analysis.patterns.forEach((pattern: any, type: string) => {
      summary += `- **${type}**: ${pattern.count} instances\n`;
    });
  }

  // Add location success rate
  if (params.investigatedCount > 0) {
    const locationRate = (params.locatedCount / params.investigatedCount) * 100;
    summary += `\n### Location Tracking\n`;
    summary += `- Successfully located: ${params.locatedCount}/${params.investigatedCount} (${locationRate.toFixed(1)}%)\n`;
  }

  return summary;
}

/**
 * Group errors by category
 */
function groupErrorsByType(
  errorFindings: PotentialFinding[]
): Map<string, Array<{ equation: string; error: string }>> {
  const errorsByType = new Map<
    string,
    Array<{ equation: string; error: string }>
  >();

  errorFindings.forEach((finding) => {
    const data = finding.data as { equation: string; error: string };
    const errorType = categorizeError(data.error);

    if (!errorsByType.has(errorType)) {
      errorsByType.set(errorType, []);
    }
    errorsByType.get(errorType)!.push({
      equation: data.equation,
      error: data.error,
    });
  });

  return errorsByType;
}

/**
 * Categorize error type
 */
export function categorizeError(errorMessage: string): string {
  const lower = errorMessage.toLowerCase();

  if (lower.includes("arithmetic") || lower.includes("calculation")) {
    return "Arithmetic Errors";
  } else if (lower.includes("percentage") || lower.includes("percent")) {
    return "Percentage Errors";
  } else if (lower.includes("unit") || lower.includes("conversion")) {
    return "Unit Conversion Errors";
  } else if (lower.includes("formula") || lower.includes("equation")) {
    return "Formula Errors";
  } else {
    return "General Math Errors";
  }
}
