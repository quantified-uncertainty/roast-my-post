/**
 * Shared utilities for plugin development
 * Provides common patterns that can be used across all plugins
 */

import type { Comment } from "@/types/documentSchema";
import { generateFindingId } from "./findingHelpers";
import { findMathLocation } from "../plugins/math/locationFinder";
import { getLineNumberAtPosition, getLineAtPosition } from "./textHelpers";
import { logger } from "../../../logger";

// Generic types for plugin findings
export interface GenericPotentialFinding {
  id: string;
  type: string;
  data: Record<string, unknown>;
  highlightHint: {
    searchText: string;
    chunkId: string;
    lineNumber?: number;
  };
}

export interface GenericInvestigatedFinding extends GenericPotentialFinding {
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export interface GenericLocatedFinding extends GenericInvestigatedFinding {
  locationHint: {
    lineNumber: number;
    lineText: string;
    matchText: string;
  };
  highlight: {
    startOffset: number;
    endOffset: number;
    quotedText: string;
  };
}

export interface LocationResult<T = GenericLocatedFinding> {
  located: T[];
  dropped: number;
}

/**
 * Convert extraction results to potential findings
 * Generic pattern that works for any plugin
 */
export function convertToFindings<TResult extends Record<string, unknown>>(
  results: TResult[],
  chunkId: string,
  pluginName: string,
  converter: (result: TResult) => GenericPotentialFinding[]
): GenericPotentialFinding[] {
  const findings: GenericPotentialFinding[] = [];
  
  results.forEach(result => {
    findings.push(...converter(result));
  });
  
  return findings;
}

/**
 * Generic finding location helper
 * Tries multiple strategies to locate findings in document text
 */
export function locateFindings<TInvestigated extends GenericInvestigatedFinding>(
  investigatedFindings: TInvestigated[],
  documentText: string,
  options: {
    mathSpecific?: boolean;
    allowFuzzy?: boolean;
    fallbackToContext?: boolean;
  } = {}
): LocationResult<GenericLocatedFinding> {
  const located: GenericLocatedFinding[] = [];
  let dropped = 0;

  for (const finding of investigatedFindings) {
    const searchText = finding.highlightHint.searchText;
    let highlight: { startOffset: number; endOffset: number; quotedText: string } | null = null;

    // Strategy 1: Direct text search
    const directPos = documentText.indexOf(searchText);
    if (directPos !== -1) {
      highlight = {
        startOffset: directPos,
        endOffset: directPos + searchText.length,
        quotedText: searchText
      };
    }

    // Strategy 2: Math-specific location (if enabled)
    if (!highlight && options.mathSpecific) {
      highlight = findMathLocation(searchText, documentText, { normalizeWhitespace: true });
    }

    // Strategy 3: Fuzzy matching (if enabled)
    if (!highlight && options.allowFuzzy) {
      highlight = tryFuzzyLocation(searchText, documentText);
    }

    // Strategy 4: Context-based fallback (if enabled and data available)
    if (!highlight && options.fallbackToContext && finding.data.surroundingText) {
      highlight = tryContextLocation(finding.data, documentText);
    }

    if (highlight) {
      located.push(createLocatedFinding(finding, highlight, documentText));
    } else {
      dropped++;
      logger.warn(
        `Plugin: Failed to locate finding: "${searchText}"`,
        { 
          plugin: finding.type.split('_')[0], // Extract plugin name from type
          data: finding.data.surroundingText ? { surroundingText: finding.data.surroundingText } : {}
        }
      );
    }
  }

  if (dropped > 0) {
    logger.info(`Plugin: Dropped ${dropped} findings that couldn't be located`);
  }

  return { located, dropped };
}

/**
 * Generate comments from located findings
 * Generic pattern that works for any plugin
 */
export function generateCommentsFromFindings(
  locatedFindings: GenericLocatedFinding[],
  documentText: string
): Comment[] {
  return locatedFindings.map(finding => ({
    description: finding.message,
    importance: mapSeverityToImportance(finding.severity),
    highlight: {
      startOffset: finding.highlight.startOffset,
      endOffset: finding.highlight.endOffset,
      quotedText: finding.highlight.quotedText,
      isValid: true
    },
    isValid: true
  }));
}

/**
 * Helper functions
 */

function tryFuzzyLocation(
  searchText: string,
  documentText: string
): { startOffset: number; endOffset: number; quotedText: string } | null {
  // Simple fuzzy matching - normalize whitespace and try again
  const normalizedSearch = searchText.replace(/\s+/g, ' ').trim();
  const normalizedDoc = documentText.replace(/\s+/g, ' ');
  
  const pos = normalizedDoc.indexOf(normalizedSearch);
  if (pos === -1) return null;
  
  // Map back to original document position (approximate)
  let originalPos = 0;
  let normalizedPos = 0;
  
  while (normalizedPos < pos && originalPos < documentText.length) {
    if (documentText[originalPos].match(/\s/)) {
      // Skip multiple whitespace in original
      while (originalPos < documentText.length && documentText[originalPos].match(/\s/)) {
        originalPos++;
      }
      normalizedPos++;
    } else {
      originalPos++;
      normalizedPos++;
    }
  }
  
  return {
    startOffset: originalPos,
    endOffset: originalPos + searchText.length,
    quotedText: documentText.slice(originalPos, originalPos + searchText.length)
  };
}

function tryContextLocation(
  data: any,
  documentText: string
): { startOffset: number; endOffset: number; quotedText: string } | null {
  if (!data.surroundingText || !data.equation) return null;
  
  const contextPos = documentText.indexOf(data.surroundingText);
  if (contextPos === -1) return null;
  
  const equationInContext = data.surroundingText.indexOf(data.equation);
  if (equationInContext === -1) return null;
  
  const startOffset = contextPos + equationInContext;
  const endOffset = startOffset + data.equation.length;
  
  return {
    startOffset,
    endOffset,
    quotedText: data.equation
  };
}

function createLocatedFinding(
  finding: GenericInvestigatedFinding,
  highlight: { startOffset: number; endOffset: number; quotedText: string },
  documentText: string
): GenericLocatedFinding {
  return {
    ...finding,
    locationHint: {
      lineNumber: getLineNumberAtPosition(documentText, highlight.startOffset),
      lineText: getLineAtPosition(documentText, highlight.startOffset),
      matchText: highlight.quotedText,
    },
    highlight
  };
}

function mapSeverityToImportance(severity: 'low' | 'medium' | 'high'): number {
  switch (severity) {
    case 'low': return 1;
    case 'medium': return 2;
    case 'high': return 3;
    default: return 2;
  }
}

/**
 * Math-specific utilities that can be reused
 */
export const MathHelpers = {
  /**
   * Convert math extraction results to findings
   */
  convertMathResults(
    results: Array<{
      equation: string;
      isCorrect: boolean;
      error?: string;
      surroundingText?: string;
      context?: string;
    }>,
    chunkId: string,
    pluginName: string
  ): GenericPotentialFinding[] {
    const findings: GenericPotentialFinding[] = [];

    results.forEach((result) => {
      const equationText = result.equation;

      if (!result.isCorrect && result.error) {
        findings.push({
          id: generateFindingId(pluginName, "math-error"),
          type: "math_error",
          data: {
            equation: equationText,
            error: result.error,
            context: result.context,
            surroundingText: result.surroundingText,
          },
          highlightHint: {
            searchText: equationText,
            chunkId: chunkId,
            lineNumber: undefined,
          },
        });
      } else if (result.isCorrect) {
        findings.push({
          id: generateFindingId(pluginName, "math-correct"),
          type: "math_correct",
          data: {
            equation: equationText,
            context: result.context,
            surroundingText: result.surroundingText,
          },
          highlightHint: {
            searchText: equationText,
            chunkId: chunkId,
            lineNumber: undefined,
          },
        });
      }
    });

    return findings;
  },

  /**
   * Investigate math findings
   */
  investigateMathFindings(
    potentialFindings: GenericPotentialFinding[]
  ): GenericInvestigatedFinding[] {
    const investigated: GenericInvestigatedFinding[] = [];
    
    // Only investigate error findings (not correct equations)
    const errorFindings = potentialFindings.filter(
      (f) => f.type === "math_error"
    );
    
    errorFindings.forEach((finding) => {
      investigated.push({
        ...finding,
        severity: this.determineSeverity(finding.data.error as string),
        message: `Mathematical error in "${finding.data.equation}": ${finding.data.error}`,
      });
    });
    
    return investigated;
  },

  /**
   * Determine severity based on error type
   */
  determineSeverity(error: string): 'low' | 'medium' | 'high' {
    const lowerError = error.toLowerCase();
    
    // High severity: fundamental arithmetic errors
    if (lowerError.includes('basic arithmetic') || 
        lowerError.includes('simple calculation')) {
      return 'high';
    }
    
    // Low severity: rounding or approximation issues
    if (lowerError.includes('rounding') || 
        lowerError.includes('approximation')) {
      return 'low';
    }
    
    // Default to medium
    return 'medium';
  },

  /**
   * Analyze math patterns and generate summary
   */
  analyzeMathFindings(
    potential: GenericPotentialFinding[],
    located: GenericLocatedFinding[]
  ): { summary: string; analysisSummary: string } {
    const correctEquations = potential.filter((f) => f.type === "math_correct");
    const errorEquations = potential.filter((f) => f.type === "math_error");
    const totalEquations = correctEquations.length + errorEquations.length;
    const errorCount = errorEquations.length;
    const errorRate = totalEquations > 0 ? (errorCount / totalEquations) * 100 : 0;

    const summary = `Found ${totalEquations} mathematical expressions with ${errorCount} errors (${errorRate.toFixed(1)}% error rate)`;

    let analysisSummary = `## Mathematical Analysis\n\n`;

    if (totalEquations === 0) {
      return { summary, analysisSummary: analysisSummary + `No mathematical expressions found in the document.\n` };
    }

    analysisSummary += `### Expression Summary\n`;
    analysisSummary += `- Total expressions analyzed: ${totalEquations}\n`;
    analysisSummary += `- Correct expressions: ${correctEquations.length}\n`;
    analysisSummary += `- Errors found: ${errorCount}\n`;
    analysisSummary += `- Error rate: ${errorRate.toFixed(1)}%\n\n`;

    if (errorCount > 0) {
      analysisSummary += `### Error Breakdown\n`;
      errorEquations.slice(0, 5).forEach((error) => {
        analysisSummary += `- \`${error.data.equation}\` - ${error.data.error}\n`;
      });
      if (errorEquations.length > 5) {
        analysisSummary += `- ...and ${errorEquations.length - 5} more\n`;
      }
    }

    return { summary, analysisSummary };
  }
};

/**
 * Forecast-specific utilities
 */
export const ForecastHelpers = {
  /**
   * Convert forecast extraction results to findings
   */
  convertForecastResults(
    results: Array<{
      text: string;
      timeframe?: string;
      probability?: number;
      topic: string;
      context?: string;
    }>,
    chunkId: string,
    pluginName: string,
    assessConfidence: (text: string, prob?: number, ctx?: string) => "low" | "medium" | "high"
  ): GenericPotentialFinding[] {
    return results.map((result) => ({
      id: generateFindingId(pluginName, "forecast"),
      type: "forecast",
      data: {
        predictionText: result.text,
        timeframe: result.timeframe,
        probability: result.probability,
        topic: result.topic,
        context: result.context,
        authorConfidence: assessConfidence(result.text, result.probability, result.context)
      },
      highlightHint: {
        searchText: result.text,
        chunkId: chunkId,
        lineNumber: undefined
      }
    }));
  },

  /**
   * Investigate forecast findings
   */
  investigateForecastFindings(
    potentialFindings: GenericPotentialFinding[]
  ): GenericInvestigatedFinding[] {
    return potentialFindings.map(finding => {
      let severity: 'low' | 'medium' | 'high' = 'info' as any;
      let message = '';

      if (finding.type === 'forecast') {
        const data = finding.data;
        severity = 'low'; // Most forecasts are informational
        message = `Prediction: ${data.predictionText}`;
        
        if (data.timeframe) {
          message += ` (${data.timeframe})`;
        }
        if (data.probability !== undefined) {
          message += ` - ${data.probability}% probability`;
        }
      } else if (finding.type === 'forecast_disagreement') {
        const data = finding.data;
        severity = 'medium'; // Disagreements are more noteworthy
        message = `Forecast disagreement: Author says ${data.probability}%, our analysis suggests ${data.ourProbability}%`;
      }

      return {
        ...finding,
        severity,
        message
      };
    });
  },

  /**
   * Analyze forecast patterns
   */
  analyzeForecastFindings(
    predictions: GenericPotentialFinding[],
    comparisons: GenericPotentialFinding[]
  ): { summary: string; analysisSummary: string } {
    const totalPredictions = predictions.filter(f => f.type === 'forecast').length;
    const totalComparisons = comparisons.filter(f => f.type === 'forecast_disagreement').length;
    const disagreements = comparisons.filter(f => 
      f.type === 'forecast_disagreement' && !f.data.agreesWithAuthor
    ).length;

    const summary = `Found ${totalPredictions} predictions. Generated ${totalComparisons} forecasts with ${disagreements} disagreements.`;

    let analysisSummary = `## Forecast Analysis\n\n`;
    analysisSummary += `### Predictions Summary\n`;
    analysisSummary += `- Total predictions found: ${totalPredictions}\n`;
    analysisSummary += `- Forecasts generated: ${totalComparisons}\n`;
    analysisSummary += `- Disagreements: ${disagreements}\n\n`;

    if (totalPredictions > 0) {
      // Group by timeframe
      const byTimeframe = new Map<string, number>();
      predictions.forEach(p => {
        if (p.type === 'forecast' && p.data.timeframe) {
          const category = categorizeTimeframe(p.data.timeframe as string);
          byTimeframe.set(category, (byTimeframe.get(category) || 0) + 1);
        }
      });
      
      if (byTimeframe.size > 0) {
        analysisSummary += `### Timeframe Distribution\n`;
        byTimeframe.forEach((count, timeframe) => {
          analysisSummary += `- ${timeframe}: ${count} predictions\n`;
        });
        analysisSummary += '\n';
      }
    }

    if (comparisons.length > 0) {
      analysisSummary += `### Key Forecast Comparisons\n`;
      comparisons.slice(0, 5).forEach(comp => {
        if (comp.type === 'forecast_disagreement') {
          const data = comp.data;
          analysisSummary += `- **"${data.predictionText}"**\n`;
          analysisSummary += `  - Author: ${data.probability || 'N/A'}%\n`;
          analysisSummary += `  - Our forecast: ${data.ourProbability}%\n`;
          analysisSummary += `  - ${data.agreesWithAuthor ? '✓ Agreement' : '✗ Disagreement'}\n`;
        }
      });
    }

    return { summary, analysisSummary };
  }
};

function categorizeTimeframe(timeframe: string): string {
  const lower = timeframe.toLowerCase();
  if (lower.includes("week") || lower.includes("month")) return "short-term";
  if (lower.includes("year") && !lower.includes("years")) return "medium-term";
  if (lower.includes("decade") || lower.includes("years")) return "long-term";
  return "unspecified";
}