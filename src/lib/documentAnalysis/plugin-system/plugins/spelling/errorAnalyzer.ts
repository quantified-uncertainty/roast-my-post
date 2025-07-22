/**
 * Spelling-specific error pattern analyzer
 */

export interface SpellingErrorPattern {
  type: string;
  count: number;
  examples: Array<{ text: string; correction: string }>;
  severity?: 'low' | 'medium' | 'high';
}

export interface SpellingErrorAnalysisResult {
  patterns: Map<string, SpellingErrorPattern>;
  mostCommonPattern?: SpellingErrorPattern;
  summary: string;
}

export class SpellingErrorAnalyzer {
  private categories = {
    spelling: ['spelling', 'misspell', 'typo'],
    grammar: ['grammar', 'grammatical', 'syntax'],
    style: ['style', 'clarity', 'readability', 'wordiness'],
    punctuation: ['punctuation', 'comma', 'period', 'apostrophe']
  };

  private severityMap = {
    spelling: 'low' as const,
    grammar: 'medium' as const,
    style: 'low' as const,
    punctuation: 'low' as const
  };

  /**
   * Analyze spelling/grammar errors and identify patterns
   */
  analyze(errors: Array<{ text: string; type: string; correction: string }>): SpellingErrorAnalysisResult {
    const patterns = new Map<string, SpellingErrorPattern>();

    // Group errors by type
    errors.forEach(error => {
      const pattern = patterns.get(error.type) || {
        type: error.type,
        count: 0,
        examples: [],
        severity: this.determineSeverity(error.type)
      };

      pattern.count++;
      if (pattern.examples.length < 5) {
        pattern.examples.push({
          text: error.text,
          correction: error.correction
        });
      }

      patterns.set(error.type, pattern);
    });

    // Find most common pattern
    let mostCommonPattern: SpellingErrorPattern | undefined;
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
   * Determine severity for an error type
   */
  private determineSeverity(errorType: string): 'low' | 'medium' | 'high' {
    const lowerType = errorType.toLowerCase();
    
    // Check configured severity map
    for (const [category, severity] of Object.entries(this.severityMap)) {
      if (this.categories[category as keyof typeof this.categories]?.some(keyword => lowerType.includes(keyword))) {
        return severity;
      }
    }

    // Default based on type
    if (lowerType === 'grammar') return 'medium';
    return 'low';
  }

  /**
   * Generate a summary of the error analysis
   */
  private generateSummary(
    totalErrors: number,
    patterns: Map<string, SpellingErrorPattern>,
    mostCommonPattern?: SpellingErrorPattern
  ): string {
    if (totalErrors === 0) {
      return 'No spelling or grammar errors found.';
    }

    let summary = `Found ${totalErrors} writing issues across ${patterns.size} categories.`;

    if (mostCommonPattern && mostCommonPattern.count > 1) {
      summary += ` Most common: ${mostCommonPattern.type} errors (${mostCommonPattern.count} instances).`;
    }

    // Add breakdown if multiple categories
    if (patterns.size > 1) {
      const breakdown = Array.from(patterns.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3)
        .map(([type, pattern]) => `${type}: ${pattern.count}`)
        .join(', ');
      
      summary += ` Distribution: ${breakdown}.`;
    }

    return summary;
  }

  /**
   * Identify common error patterns
   */
  identifyCommonPatterns(errors: Array<{ text: string; correction: string; type: string }>): string[] {
    const patterns: string[] = [];
    
    // Check for repeated errors
    const errorCounts = new Map<string, number>();
    errors.forEach(error => {
      const key = `${error.text}→${error.correction}`;
      errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
    });

    // Find errors that appear multiple times
    errorCounts.forEach((count, key) => {
      if (count >= 2) {
        const [text, correction] = key.split('→');
        patterns.push(`Repeated error: "${text}" (${count} times) - should be "${correction}"`);
      }
    });

    // Check for systematic issues
    const spellingErrors = errors.filter(e => e.type === 'spelling');
    if (spellingErrors.length > 5) {
      patterns.push('Multiple spelling errors suggest need for spellcheck');
    }

    const grammarErrors = errors.filter(e => e.type === 'grammar');
    if (grammarErrors.length > 3) {
      patterns.push('Several grammar issues indicate need for proofreading');
    }

    return patterns.slice(0, 5); // Return top 5 patterns
  }
}