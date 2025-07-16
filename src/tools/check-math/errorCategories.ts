/**
 * Enhanced error categorization for mathematical errors
 */

export interface ErrorPattern {
  pattern: RegExp | string[];
  type: 'calculation' | 'logic' | 'unit' | 'notation' | 'conceptual';
  weight: number; // 0-1, higher weight = stronger match
}

export const ERROR_PATTERNS: ErrorPattern[] = [
  // Calculation errors
  {
    pattern: [
      'calculation', 'arithmetic', 'sum', 'product', 'difference', 
      'quotient', 'addition', 'subtraction', 'multiplication', 'division',
      'incorrect result', 'wrong answer', 'computational error'
    ],
    type: 'calculation',
    weight: 0.9
  },
  {
    pattern: /\d+\s*[\+\-\*\/]\s*\d+\s*=\s*\d+/,
    type: 'calculation',
    weight: 0.8
  },
  
  // Unit errors
  {
    pattern: [
      'unit', 'conversion', 'dimension', 'measurement', 'scale',
      'meters', 'kilometers', 'miles', 'degrees', 'radians',
      'celsius', 'fahrenheit', 'kelvin'
    ],
    type: 'unit',
    weight: 0.9
  },
  {
    pattern: /\d+\s*(km|m|cm|mm|mi|ft|in|kg|g|lb|oz|L|mL|gal)/,
    type: 'unit',
    weight: 0.7
  },
  
  // Logic errors
  {
    pattern: [
      'logic', 'reasoning', 'fallacy', 'contradiction', 'invalid',
      'assumption', 'premise', 'conclusion', 'inference', 'deduction',
      'proof', 'theorem', 'lemma', 'corollary'
    ],
    type: 'logic',
    weight: 0.9
  },
  {
    pattern: [
      'if...then', 'implies', 'therefore', 'hence', 'thus',
      'because', 'since', 'given that', 'it follows'
    ],
    type: 'logic',
    weight: 0.6
  },
  
  // Notation errors
  {
    pattern: [
      'notation', 'symbol', 'formula', 'equation', 'expression',
      'syntax', 'parentheses', 'brackets', 'order of operations',
      'exponent', 'subscript', 'superscript'
    ],
    type: 'notation',
    weight: 0.9
  },
  {
    pattern: /[\(\)\[\]\{\}]|[∑∏∫∂∇]/,
    type: 'notation',
    weight: 0.5
  },
  
  // Conceptual errors
  {
    pattern: [
      'concept', 'understanding', 'definition', 'principle', 'theory',
      'misinterpretation', 'misconception', 'fundamental', 'basic',
      'meaning', 'interpretation', 'context'
    ],
    type: 'conceptual',
    weight: 0.8
  }
];

export const SEVERITY_INDICATORS = {
  critical: [
    'completely wrong', 'fundamental error', 'invalidates',
    'entirely incorrect', 'severe', 'critical', 'major flaw',
    'completely invalidates', 'fatal error', 'catastrophic'
  ],
  major: [
    'significant', 'incorrect', 'wrong', 'error', 'mistake',
    'inaccurate', 'flawed', 'problematic', 'misleading'
  ],
  minor: [
    'minor', 'small', 'slight', 'notation', 'formatting',
    'style', 'convention', 'preference', 'could be improved'
  ]
};

/**
 * Calculate error type based on weighted pattern matching
 */
export function categorizeErrorAdvanced(description: string): {
  type: 'calculation' | 'logic' | 'unit' | 'notation' | 'conceptual';
  confidence: number;
} {
  const lowerDesc = description.toLowerCase();
  const scores = new Map<string, number>();
  
  for (const errorPattern of ERROR_PATTERNS) {
    let matchScore = 0;
    
    if (Array.isArray(errorPattern.pattern)) {
      // String pattern matching
      for (const term of errorPattern.pattern) {
        if (lowerDesc.includes(term)) {
          matchScore += errorPattern.weight;
        }
      }
    } else {
      // Regex pattern matching
      const matches = lowerDesc.match(errorPattern.pattern);
      if (matches) {
        matchScore += errorPattern.weight * matches.length;
      }
    }
    
    const currentScore = scores.get(errorPattern.type) || 0;
    scores.set(errorPattern.type, currentScore + matchScore);
  }
  
  // Find the type with highest score
  let bestType: 'calculation' | 'logic' | 'unit' | 'notation' | 'conceptual' = 'conceptual';
  let bestScore = 0;
  
  for (const [type, score] of scores.entries()) {
    if (score > bestScore) {
      bestScore = score;
      bestType = type as typeof bestType;
    }
  }
  
  // Calculate confidence (normalize to 0-1)
  const maxPossibleScore = ERROR_PATTERNS
    .filter(p => p.type === bestType)
    .reduce((sum, p) => sum + p.weight, 0);
  
  const confidence = Math.min(bestScore / maxPossibleScore, 1);
  
  return { type: bestType, confidence };
}

/**
 * Determine severity based on description and error type
 */
export function determineSeverityAdvanced(
  errorType: string,
  description: string
): {
  severity: 'critical' | 'major' | 'minor';
  confidence: number;
} {
  const lowerDesc = description.toLowerCase();
  
  // Check for severity indicators
  for (const indicator of SEVERITY_INDICATORS.critical) {
    if (lowerDesc.includes(indicator)) {
      return { severity: 'critical', confidence: 0.9 };
    }
  }
  
  // Type-specific severity rules
  if (errorType === 'calculation' || errorType === 'unit') {
    // Calculation and unit errors are usually major
    for (const indicator of SEVERITY_INDICATORS.major) {
      if (lowerDesc.includes(indicator)) {
        return { severity: 'major', confidence: 0.8 };
      }
    }
    // Default to major for these types
    return { severity: 'major', confidence: 0.7 };
  }
  
  if (errorType === 'logic') {
    // Logic errors can be critical if they affect conclusions
    if (lowerDesc.includes('conclusion') || lowerDesc.includes('invalidate')) {
      return { severity: 'critical', confidence: 0.85 };
    }
    return { severity: 'major', confidence: 0.75 };
  }
  
  // Check for minor indicators
  for (const indicator of SEVERITY_INDICATORS.minor) {
    if (lowerDesc.includes(indicator)) {
      return { severity: 'minor', confidence: 0.8 };
    }
  }
  
  // Default severity based on type
  if (errorType === 'notation') {
    return { severity: 'minor', confidence: 0.6 };
  }
  
  return { severity: 'major', confidence: 0.5 };
}