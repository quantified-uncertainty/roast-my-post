/**
 * Generic error pattern analyzer for identifying common issues across plugins
 */

import { Finding } from '../types';
import { FindingBuilder } from '../builders/FindingBuilder';

export interface ErrorExample {
  text: string;
  description: string;
  [key: string]: unknown;
}

export interface ErrorPattern {
  type: string;
  count: number;
  examples: ErrorExample[];
  severity?: 'low' | 'medium' | 'high';
}

export interface ErrorAnalysisResult {
  patterns: Map<string, ErrorPattern>;
  mostCommonPattern?: ErrorPattern;
  findings: Finding[];
  summary: string;
}

export interface ErrorCategorizationConfig {
  categories: Record<string, string[]>;
  severityMap?: Record<string, 'low' | 'medium' | 'high'>;
  patternThreshold?: number; // Minimum occurrences to consider a pattern
}

export class ErrorPatternAnalyzer {
  private config: Required<ErrorCategorizationConfig>;

  constructor(config: ErrorCategorizationConfig) {
    this.config = {
      categories: config.categories,
      severityMap: config.severityMap || {},
      patternThreshold: config.patternThreshold || 2
    };
  }

  /**
   * Analyze errors and identify patterns
   */
  analyze(errors: ErrorExample[]): ErrorAnalysisResult {
    const patterns = new Map<string, ErrorPattern>();

    // Categorize each error
    errors.forEach(error => {
      const category = this.categorizeError(error.description);
      const pattern = patterns.get(category) || {
        type: category,
        count: 0,
        examples: [],
        severity: this.determineSeverity(category, error.description)
      };

      pattern.count++;
      if (pattern.examples.length < 5) { // Keep up to 5 examples
        pattern.examples.push(error);
      }

      patterns.set(category, pattern);
    });

    // Find most common pattern
    let mostCommonPattern: ErrorPattern | undefined;
    let maxCount = 0;
    patterns.forEach(pattern => {
      if (pattern.count > maxCount) {
        maxCount = pattern.count;
        mostCommonPattern = pattern;
      }
    });

    // Generate findings for systematic issues
    const findings = this.generatePatternFindings(patterns);

    // Generate summary
    const summary = this.generateSummary(errors.length, patterns, mostCommonPattern);

    return {
      patterns,
      mostCommonPattern,
      findings,
      summary
    };
  }

  /**
   * Categorize an error based on keywords
   */
  private categorizeError(description: string): string {
    const lowerDesc = description.toLowerCase();

    for (const [category, keywords] of Object.entries(this.config.categories)) {
      if (keywords.some(keyword => lowerDesc.includes(keyword))) {
        return category;
      }
    }

    return 'other';
  }

  /**
   * Determine severity for an error type
   */
  private determineSeverity(errorType: string, description: string): 'low' | 'medium' | 'high' {
    // Check configured severity map first
    if (this.config.severityMap[errorType]) {
      return this.config.severityMap[errorType];
    }

    // Default severity logic based on description
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('critical') || lowerDesc.includes('major') || lowerDesc.includes('wrong')) {
      return 'high';
    }
    if (lowerDesc.includes('minor') || lowerDesc.includes('style') || lowerDesc.includes('suggestion')) {
      return 'low';
    }
    return 'medium';
  }

  /**
   * Generate findings for identified patterns
   */
  private generatePatternFindings(patterns: Map<string, ErrorPattern>): Finding[] {
    const findings: Finding[] = [];

    patterns.forEach(pattern => {
      if (pattern.count >= this.config.patternThreshold) {
        const severity = pattern.severity || 'medium';
        const finding = FindingBuilder
          .forError(
            'pattern',
            `${pattern.type} errors`,
            `Systematic ${pattern.type} errors detected (${pattern.count} instances)`,
            severity === 'high' ? 'high' : 'medium'
          )
          .withMetadata({
            patternType: pattern.type,
            occurrences: pattern.count,
            examples: pattern.examples.slice(0, 3).map(e => e.text)
          })
          .build();

        findings.push(finding);
      }
    });

    return findings;
  }

  /**
   * Generate a summary of the error analysis
   */
  private generateSummary(
    totalErrors: number,
    patterns: Map<string, ErrorPattern>,
    mostCommonPattern?: ErrorPattern
  ): string {
    if (totalErrors === 0) {
      return 'No errors found.';
    }

    let summary = `Found ${totalErrors} errors across ${patterns.size} categories.`;

    if (mostCommonPattern && mostCommonPattern.count > 1) {
      summary += ` Most common: ${mostCommonPattern.type} (${mostCommonPattern.count} instances).`;
    }

    // Add breakdown if multiple categories
    if (patterns.size > 1) {
      const breakdown = Array.from(patterns.entries())
        .filter(([_, pattern]) => pattern.count > 0)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3)
        .map(([type, pattern]) => `${type}: ${pattern.count}`)
        .join(', ');
      
      summary += ` Distribution: ${breakdown}.`;
    }

    return summary;
  }

  /**
   * Static factory methods for common error categorizations
   */

  static forSpelling(): ErrorPatternAnalyzer {
    return new ErrorPatternAnalyzer({
      categories: {
        spelling: ['spelling', 'misspell', 'typo'],
        grammar: ['grammar', 'grammatical', 'syntax'],
        style: ['style', 'clarity', 'readability', 'wordiness'],
        punctuation: ['punctuation', 'comma', 'period', 'apostrophe']
      },
      severityMap: {
        spelling: 'low',
        grammar: 'medium',
        style: 'low',
        punctuation: 'low'
      }
    });
  }

  static forGeneral(): ErrorPatternAnalyzer {
    return new ErrorPatternAnalyzer({
      categories: {
        accuracy: ['wrong', 'incorrect', 'false', 'inaccurate'],
        consistency: ['inconsistent', 'contradiction', 'mismatch'],
        completeness: ['missing', 'incomplete', 'lacks'],
        clarity: ['unclear', 'ambiguous', 'confusing'],
        technical: ['technical', 'implementation', 'code', 'syntax']
      }
    });
  }
}