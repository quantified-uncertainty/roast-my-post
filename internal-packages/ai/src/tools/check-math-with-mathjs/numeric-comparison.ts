/**
 * Deterministic numeric comparison utilities for mathematical verification
 * These functions provide consistent, code-level handling of approximations
 */

/**
 * Count the number of decimal places in a string representation of a number
 * @param value - String representation of a number (e.g., "3.14", "3.140", "3")
 * @returns Number of decimal places, or -1 for special values
 */
export function countDecimalPlaces(value: string): number {
  // Remove any whitespace
  const trimmed = value.trim();
  
  // Handle special values
  if (trimmed === 'Infinity' || trimmed === '-Infinity' || trimmed === 'NaN') {
    return -1;
  }
  
  // Handle scientific notation (e.g., 1.23e5)
  if (/[eE]/.test(trimmed)) {
    const parts = trimmed.split(/[eE]/);
    const mantissa = parts[0];
    return countDecimalPlaces(mantissa);
  }
  
  // Check if there's a decimal point
  const decimalIndex = trimmed.indexOf('.');
  if (decimalIndex === -1) {
    return 0;
  }
  
  // Count digits after decimal point
  const afterDecimal = trimmed.substring(decimalIndex + 1);
  
  // Remove trailing zeros if they exist (3.140 -> 3.14)
  // But keep them if that's all there is (3.0 -> 1 decimal place)
  const withoutTrailingZeros = afterDecimal.replace(/0+$/, '');
  return withoutTrailingZeros.length || 1; // At least 1 if there's a decimal point
}

/**
 * Round a number to a specified number of decimal places
 * @param value - The number to round
 * @param decimalPlaces - Number of decimal places
 * @returns Rounded number
 */
export function roundToDecimalPlaces(value: number, decimalPlaces: number): number {
  if (!isFinite(value)) {
    return value;
  }
  
  if (decimalPlaces < 0) {
    return value;
  }
  
  const multiplier = Math.pow(10, decimalPlaces);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Compare two numeric values with approximation tolerance
 * @param stated - The stated/claimed value (as string, to preserve precision info)
 * @param computed - The computed/actual value (as number)
 * @param options - Comparison options
 * @returns Comparison result with details
 */
export interface ComparisonResult {
  isEqual: boolean;
  reason: string;
  statedValue: string;
  computedValue: number;
  roundedComputedValue?: number;
  decimalPlaces?: number;
}

export interface ComparisonOptions {
  /** Use relative tolerance for large numbers */
  useRelativeTolerance?: boolean;
  /** Relative tolerance factor (default: 0.001 = 0.1%) */
  relativeTolerance?: number;
  /** Absolute tolerance for very small differences */
  absoluteTolerance?: number;
  /** Whether to allow reasonable approximations based on stated precision */
  allowApproximation?: boolean;
}

export function compareNumericValues(
  stated: string,
  computed: number,
  options: ComparisonOptions = {}
): ComparisonResult {
  const {
    useRelativeTolerance = false,
    relativeTolerance = 0.001,
    absoluteTolerance = 1e-10,
    allowApproximation = true
  } = options;
  
  // Parse the stated value
  const statedNumber = parseFloat(stated);
  
  // Handle special cases
  if (isNaN(statedNumber)) {
    // Special case: NaN === NaN should be considered equal in our comparison
    if (isNaN(computed)) {
      return {
        isEqual: true,
        reason: 'Special values match',
        statedValue: stated,
        computedValue: computed
      };
    }
    return {
      isEqual: false,
      reason: 'Stated value is not a valid number',
      statedValue: stated,
      computedValue: computed
    };
  }
  
  if (!isFinite(computed)) {
    // Handle infinity and NaN
    if (!isFinite(statedNumber)) {
      const isEqual = (statedNumber === computed) || 
                     (isNaN(statedNumber) && isNaN(computed));
      return {
        isEqual,
        reason: isEqual ? 'Special values match' : 'Special values do not match',
        statedValue: stated,
        computedValue: computed
      };
    }
    return {
      isEqual: false,
      reason: 'Computed value is not finite',
      statedValue: stated,
      computedValue: computed
    };
  }
  
  // Check for exact equality first
  if (statedNumber === computed) {
    return {
      isEqual: true,
      reason: 'Exact match',
      statedValue: stated,
      computedValue: computed
    };
  }
  
  // Apply approximation rules based on stated precision
  if (allowApproximation) {
    const decimalPlaces = countDecimalPlaces(stated);
    
    if (decimalPlaces >= 0) {
      // Round the computed value to match the stated precision
      const roundedComputed = roundToDecimalPlaces(computed, decimalPlaces);
      
      if (statedNumber === roundedComputed) {
        return {
          isEqual: true,
          reason: `Reasonable approximation (rounded to ${decimalPlaces} decimal places)`,
          statedValue: stated,
          computedValue: computed,
          roundedComputedValue: roundedComputed,
          decimalPlaces
        };
      }
      
      // Also check if the stated value itself is the rounded version
      const roundedStated = roundToDecimalPlaces(statedNumber, decimalPlaces);
      if (roundedStated === roundedComputed) {
        return {
          isEqual: true,
          reason: `Reasonable approximation (both round to ${roundedComputed} at ${decimalPlaces} decimal places)`,
          statedValue: stated,
          computedValue: computed,
          roundedComputedValue: roundedComputed,
          decimalPlaces
        };
      }
    }
  }
  
  // Check absolute tolerance for very small differences
  const absoluteDiff = Math.abs(statedNumber - computed);
  if (absoluteDiff < absoluteTolerance) {
    return {
      isEqual: true,
      reason: `Within absolute tolerance (difference: ${absoluteDiff.toExponential(2)})`,
      statedValue: stated,
      computedValue: computed
    };
  }
  
  // Check relative tolerance for larger numbers
  if (useRelativeTolerance && statedNumber !== 0) {
    const relativeDiff = absoluteDiff / Math.abs(statedNumber);
    if (relativeDiff < relativeTolerance) {
      return {
        isEqual: true,
        reason: `Within relative tolerance (${(relativeDiff * 100).toFixed(3)}% difference)`,
        statedValue: stated,
        computedValue: computed
      };
    }
  }
  
  // Values are not equal
  const decimalPlaces = countDecimalPlaces(stated);
  const roundedComputed = decimalPlaces >= 0 
    ? roundToDecimalPlaces(computed, decimalPlaces)
    : computed;
    
  return {
    isEqual: false,
    reason: `Values do not match (stated: ${stated}, computed: ${computed}, difference: ${absoluteDiff})`,
    statedValue: stated,
    computedValue: computed,
    roundedComputedValue: roundedComputed,
    decimalPlaces: decimalPlaces >= 0 ? decimalPlaces : undefined
  };
}

/**
 * Format a number for display with appropriate precision
 * @param value - The number to format
 * @param maxDecimals - Maximum number of decimal places
 * @returns Formatted string
 */
export function formatNumber(value: number, maxDecimals: number = 6): string {
  if (!isFinite(value)) {
    return String(value);
  }
  
  // Remove trailing zeros and unnecessary decimal point
  const formatted = value.toFixed(maxDecimals);
  return formatted.replace(/\.?0+$/, '');
}

/**
 * Check if a mathematical statement contains an equality assertion
 * @param statement - The mathematical statement
 * @returns Object with parsed left and right sides, or null if not an equality
 */
export function parseEqualityStatement(statement: string): { left: string; right: string } | null {
  // Handle different equality operators
  const equalityPatterns = [
    '===',  // Strict equality (rare in math)
    '==',   // Double equals
    '=',    // Single equals (most common in math)
    '≈',    // Approximately equal
    '≅',    // Congruent/approximately equal
  ];
  
  for (const pattern of equalityPatterns) {
    const index = statement.indexOf(pattern);
    if (index > 0 && index < statement.length - pattern.length) {
      const left = statement.substring(0, index).trim();
      const right = statement.substring(index + pattern.length).trim();
      
      // Make sure both sides have content
      if (left && right) {
        return { left, right };
      }
    }
  }
  
  return null;
}