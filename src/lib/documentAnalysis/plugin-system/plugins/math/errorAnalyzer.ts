/**
 * Math-specific error pattern analyzer
 */

export interface MathErrorPattern {
  type: string;
  count: number;
  examples: any[];
  severity?: 'low' | 'medium' | 'high';
}

export interface MathErrorAnalysisResult {
  patterns: Map<string, MathErrorPattern>;
  mostCommonPattern?: MathErrorPattern;
  summary: string;
}

export class MathErrorAnalyzer {
  private categories = {
    arithmetic: ['arithmetic', 'calculation', 'addition', 'subtraction', 'multiplication', 'division'],
    unit_conversion: ['unit', 'conversion', 'dimensional', 'measurement'],
    percentage: ['percentage', 'percent', '%', 'proportion', 'ratio'],
    formula: ['formula', 'equation', 'expression'],
    logic: ['logic', 'reasoning', 'proof', 'derivation']
  };

  private severityMap = {
    arithmetic: 'high' as const,
    unit_conversion: 'high' as const,
    percentage: 'medium' as const,
    formula: 'high' as const,
    logic: 'medium' as const
  };

  /**
   * Analyze math errors and identify patterns
   */
  analyze(errors: Array<{ text: string; description: string; [key: string]: any }>): MathErrorAnalysisResult {
    const patterns = new Map<string, MathErrorPattern>();

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
    let mostCommonPattern: MathErrorPattern | undefined;
    let maxCount = 0;
    patterns.forEach(pattern => {
      if (pattern.count > maxCount) {
        maxCount = pattern.count;
        mostCommonPattern = pattern;
      }
    });

    // Generate summary
    const summary = this.generateSummary(errors.length, patterns, mostCommonPattern);

    return {
      patterns,
      mostCommonPattern,
      summary
    };
  }

  /**
   * Categorize an error based on keywords
   */
  private categorizeError(description: string): string {
    const lowerDesc = description.toLowerCase();

    for (const [category, keywords] of Object.entries(this.categories)) {
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
    if (this.severityMap[errorType as keyof typeof this.severityMap]) {
      return this.severityMap[errorType as keyof typeof this.severityMap];
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
   * Generate a summary of the error analysis
   */
  private generateSummary(
    totalErrors: number,
    patterns: Map<string, MathErrorPattern>,
    mostCommonPattern?: MathErrorPattern
  ): string {
    if (totalErrors === 0) {
      return 'No math errors found.';
    }

    let summary = `Found ${totalErrors} math errors across ${patterns.size} categories.`;

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
}