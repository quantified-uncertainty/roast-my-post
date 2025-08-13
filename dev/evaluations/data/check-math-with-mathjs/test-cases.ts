import type { CheckMathAgenticInput } from '../../../../internal-packages/ai/src/tools/check-math-with-mathjs/types';

export interface TestExpectation {
  status: 'verified_true' | 'verified_false' | 'cannot_verify';
  errorType?: 'calculation' | 'logic' | 'unit' | 'notation' | 'conceptual';
  minConfidence?: number;
  maxConfidence?: number;
  mustContainInExplanation?: string[];
}

export interface TestCase {
  id: string;
  category: string;
  name: string;
  input: CheckMathAgenticInput;
  expectations: TestExpectation;
  description: string;
}

export const testCases: TestCase[] = [
  // Basic Arithmetic Verification
  {
    id: 'arithmetic-addition-correct',
    category: 'Basic Arithmetic',
    name: 'Correct addition',
    input: { statement: '2 + 2 = 4' },
    expectations: {
      status: 'verified_true'
    },
    description: 'Should verify correct simple addition'
  },
  {
    id: 'arithmetic-addition-incorrect',
    category: 'Basic Arithmetic',
    name: 'Incorrect addition',
    input: { statement: '2 + 2 = 5' },
    expectations: {
      status: 'verified_false',
      errorType: 'calculation'
    },
    description: 'Should detect incorrect addition'
  },
  {
    id: 'arithmetic-multiplication-correct',
    category: 'Basic Arithmetic',
    name: 'Correct multiplication',
    input: { statement: '7 × 8 = 56' },
    expectations: {
      status: 'verified_true'
    },
    description: 'Should verify correct multiplication'
  },
  {
    id: 'arithmetic-division-correct',
    category: 'Basic Arithmetic',
    name: 'Correct division',
    input: { statement: '100 ÷ 4 = 25' },
    expectations: {
      status: 'verified_true'
    },
    description: 'Should verify correct division'
  },
  {
    id: 'arithmetic-subtraction-incorrect',
    category: 'Basic Arithmetic',
    name: 'Incorrect subtraction',
    input: { statement: '50 - 30 = 15' },
    expectations: {
      status: 'verified_false',
      errorType: 'calculation'
    },
    description: 'Should detect incorrect subtraction'
  },

  // Percentages and Fractions
  {
    id: 'percentage-calculation-correct',
    category: 'Percentages',
    name: 'Correct percentage calculation',
    input: { statement: '15% of 200 equals 30' },
    expectations: {
      status: 'verified_true'
    },
    description: 'Should verify correct percentage calculation'
  },
  {
    id: 'percentage-calculation-incorrect',
    category: 'Percentages',
    name: 'Incorrect percentage calculation',
    input: { statement: '25% of 80 equals 25' },
    expectations: {
      status: 'verified_false',
      errorType: 'calculation'
    },
    description: 'Should detect incorrect percentage (should be 20)'
  },
  {
    id: 'fraction-conversion-correct',
    category: 'Percentages',
    name: 'Fraction to decimal conversion',
    input: { statement: '3/4 equals 0.75' },
    expectations: {
      status: 'verified_true'
    },
    description: 'Should verify correct fraction conversion'
  },
  {
    id: 'percentage-increase-incorrect',
    category: 'Percentages',
    name: 'Incorrect percentage increase',
    input: { statement: 'A 50% increase from 100 gives 140' },
    expectations: {
      status: 'verified_false',
      errorType: 'calculation'
    },
    description: 'Should detect incorrect percentage increase (should be 150)'
  },

  // Scientific Constants and Approximations
  {
    id: 'scientific-pi-approximation',
    category: 'Scientific',
    name: 'Pi approximation',
    input: { statement: 'π ≈ 3.14' },
    expectations: {
      status: 'verified_true'
    },
    description: 'Should accept reasonable pi approximation'
  },
  {
    id: 'scientific-pi-wrong',
    category: 'Scientific',
    name: 'Incorrect pi value',
    input: { statement: 'π = 3.0' },
    expectations: {
      status: 'verified_false',
      errorType: 'calculation'
    },
    description: 'Should reject incorrect pi value'
  },
  {
    id: 'scientific-e-approximation',
    category: 'Scientific',
    name: 'Euler number approximation',
    input: { statement: 'e ≈ 2.718' },
    expectations: {
      status: 'verified_true'
    },
    description: 'Should accept reasonable e approximation'
  },
  {
    id: 'scientific-sqrt2-exact',
    category: 'Scientific',
    name: 'Square root of 2',
    input: { statement: 'sqrt(2) ≈ 1.414' },
    expectations: {
      status: 'verified_true'
    },
    description: 'Should verify square root approximation'
  },

  // Functions and Operations
  {
    id: 'function-sqrt-correct',
    category: 'Functions',
    name: 'Correct square root',
    input: { statement: 'sqrt(16) = 4' },
    expectations: {
      status: 'verified_true'
    },
    description: 'Should verify correct square root'
  },
  {
    id: 'function-sqrt-incorrect',
    category: 'Functions',
    name: 'Incorrect square root',
    input: { statement: 'sqrt(25) = 6' },
    expectations: {
      status: 'verified_false',
      errorType: 'calculation'
    },
    description: 'Should detect incorrect square root'
  },
  {
    id: 'function-factorial-correct',
    category: 'Functions',
    name: 'Correct factorial',
    input: { statement: '5! = 120' },
    expectations: {
      status: 'verified_true'
    },
    description: 'Should verify correct factorial'
  },
  {
    id: 'function-logarithm-correct',
    category: 'Functions',
    name: 'Correct logarithm',
    input: { statement: 'log₁₀(1000) = 3' },
    expectations: {
      status: 'verified_true'
    },
    description: 'Should verify correct logarithm'
  },
  {
    id: 'function-exponent-incorrect',
    category: 'Functions',
    name: 'Incorrect exponentiation',
    input: { statement: '2^10 = 1000' },
    expectations: {
      status: 'verified_false',
      errorType: 'calculation'
    },
    description: 'Should detect incorrect exponentiation (should be 1024)'
  },

  // Combinatorics and Probability
  {
    id: 'combinatorics-choose-correct',
    category: 'Combinatorics',
    name: 'Correct combination',
    input: { statement: '10 choose 3 equals 120' },
    expectations: {
      status: 'verified_true'
    },
    description: 'Should verify correct binomial coefficient'
  },
  {
    id: 'combinatorics-choose-incorrect',
    category: 'Combinatorics',
    name: 'Incorrect combination',
    input: { statement: '8 choose 2 equals 30' },
    expectations: {
      status: 'verified_false',
      errorType: 'calculation'
    },
    description: 'Should detect incorrect combination (should be 28)'
  },
  {
    id: 'combinatorics-permutation-correct',
    category: 'Combinatorics',
    name: 'Correct permutation',
    input: { statement: 'The number of ways to arrange 3 items from 5 is 60' },
    expectations: {
      status: 'verified_true'
    },
    description: 'Should verify correct permutation calculation'
  },

  // Unit Conversions
  {
    id: 'units-length-correct',
    category: 'Unit Conversions',
    name: 'Correct length conversion',
    input: { statement: '5 km + 3000 m = 8 km' },
    expectations: {
      status: 'verified_true'
    },
    description: 'Should verify correct unit addition'
  },
  {
    id: 'units-temperature-correct',
    category: 'Unit Conversions',
    name: 'Correct temperature conversion',
    input: { statement: '100°F is approximately 37.78°C' },
    expectations: {
      status: 'verified_true'
    },
    description: 'Should verify correct temperature conversion'
  },
  {
    id: 'units-weight-incorrect',
    category: 'Unit Conversions',
    name: 'Incorrect weight conversion',
    input: { statement: '1 kg = 1000 pounds' },
    expectations: {
      status: 'verified_false',
      errorType: 'unit'  // This is a unit conversion error, not a calculation error
    },
    description: 'Should detect incorrect unit conversion'
  },

  // Trigonometry
  {
    id: 'trig-sin90-correct',
    category: 'Trigonometry',
    name: 'Sine of 90 degrees',
    input: { statement: 'sin(90 degrees) = 1' },
    expectations: {
      status: 'verified_true'
    },
    description: 'Should verify correct sine value'
  },
  {
    id: 'trig-cos0-correct',
    category: 'Trigonometry',
    name: 'Cosine of 0',
    input: { statement: 'cos(0) = 1' },
    expectations: {
      status: 'verified_true'
    },
    description: 'Should verify correct cosine value'
  },
  {
    id: 'trig-tan45-incorrect',
    category: 'Trigonometry',
    name: 'Incorrect tangent',
    input: { statement: 'tan(45°) = 0.5' },
    expectations: {
      status: 'verified_false',
      errorType: 'calculation'
    },
    description: 'Should detect incorrect tangent (should be 1)'
  },

  // Logic and Conceptual Errors
  {
    id: 'logic-probability-error',
    category: 'Logic Errors',
    name: 'Probability logic error',
    input: { statement: 'If we flip a coin 10 times, we will definitely get exactly 5 heads' },
    expectations: {
      status: 'verified_false',
      errorType: 'logic'
    },
    description: 'Should detect probability logic error'
  },
  {
    id: 'logic-division-by-zero',
    category: 'Logic Errors',
    name: 'Division by zero',
    input: { statement: '5 / 0 = infinity' },
    expectations: {
      status: 'verified_false',
      errorType: 'conceptual'
    },
    description: 'Should handle division by zero appropriately'
  },
  {
    id: 'logic-negative-sqrt',
    category: 'Logic Errors',
    name: 'Square root of negative',
    input: { statement: 'sqrt(-4) = 2' },
    expectations: {
      status: 'verified_false',
      errorType: 'conceptual'
    },
    description: 'Should reject square root of negative without complex context'
  },

  // Symbolic and Cannot Verify Cases
  {
    id: 'symbolic-derivative',
    category: 'Symbolic Math',
    name: 'Symbolic derivative',
    input: { statement: 'The derivative of x³ is 3x²' },
    expectations: {
      status: 'cannot_verify'
    },
    description: 'Should recognize symbolic math that cannot be numerically verified'
  },
  {
    id: 'symbolic-integral',
    category: 'Symbolic Math',
    name: 'Symbolic integral',
    input: { statement: 'The integral of 2x is x² + C' },
    expectations: {
      status: 'cannot_verify'
    },
    description: 'Should recognize symbolic integration'
  },
  {
    id: 'symbolic-limit',
    category: 'Symbolic Math',
    name: 'Limit statement',
    input: { statement: 'The limit of 1/x as x approaches infinity is 0' },
    expectations: {
      status: 'cannot_verify'
    },
    description: 'Should recognize limit statements as non-verifiable'
  },

  // Complex Multi-Step Problems
  {
    id: 'complex-multi-calculation',
    category: 'Complex Statements',
    name: 'Multiple calculations',
    input: { statement: 'Given that 2 + 2 = 4 and 3 × 5 = 15, therefore 4 + 15 = 19' },
    expectations: {
      status: 'verified_true'
    },
    description: 'Should verify multi-step calculation'
  },
  {
    id: 'complex-word-problem-correct',
    category: 'Complex Statements',
    name: 'Word problem correct',
    input: { statement: 'If John has 5 apples and gives away 2, he has 3 apples left' },
    expectations: {
      status: 'verified_true'
    },
    description: 'Should verify correct word problem'
  },
  {
    id: 'complex-word-problem-incorrect',
    category: 'Complex Statements',
    name: 'Word problem incorrect',
    input: { statement: 'A store offers 20% off a $50 item, making the final price $45' },
    expectations: {
      status: 'verified_false',
      errorType: 'calculation'
    },
    description: 'Should detect incorrect discount calculation (should be $40)'
  },

  // Approximation and Rounding Cases (Important for your concern!)
  {
    id: 'approximation-reasonable-rounding-1',
    category: 'Approximations',
    name: 'Reasonable rounding 2 decimals',
    input: { statement: 'The result of 10/3 is 3.33' },
    expectations: {
      status: 'verified_true'  // Should accept as reasonable approximation
    },
    description: 'Should accept reasonable 2-decimal rounding (actual: 3.333...)'
  },
  {
    id: 'approximation-reasonable-rounding-2',
    category: 'Approximations',
    name: 'Reasonable rounding 3 decimals',
    input: { statement: 'π × 2 = 6.283' },
    expectations: {
      status: 'verified_true'  // Should accept as reasonable approximation
    },
    description: 'Should accept reasonable 3-decimal rounding (actual: 6.28318...)'
  },
  {
    id: 'approximation-small-difference',
    category: 'Approximations',
    name: 'Small difference acceptable',
    input: { statement: '√2 = 1.414' },
    expectations: {
      status: 'verified_true'  // Should accept small approximation
    },
    description: 'Should accept small approximation (actual: 1.41421...)'
  },
  {
    id: 'approximation-percentage-close',
    category: 'Approximations',
    name: 'Percentage calculation close',
    input: { statement: '33.3% of 100 is 33.3' },
    expectations: {
      status: 'verified_true'  // Should accept (vs 33.333...)
    },
    description: 'Should accept close percentage calculation'
  },
  {
    id: 'approximation-division-result',
    category: 'Approximations',
    name: 'Division with minor rounding',
    input: { statement: '100 ÷ 7 = 14.29' },
    expectations: {
      status: 'verified_true'  // Should accept (actual: 14.2857...)
    },
    description: 'Should accept reasonable division rounding'
  },
  {
    id: 'approximation-trig-rounding',
    category: 'Approximations',
    name: 'Trig function rounding',
    input: { statement: 'cos(60°) = 0.5' },
    expectations: {
      status: 'verified_true'  // Exact match, should definitely pass
    },
    description: 'Should verify exact trig value'
  },
  {
    id: 'approximation-significant-error',
    category: 'Approximations',
    name: 'Significant approximation error',
    input: { statement: 'π = 3.0' },
    expectations: {
      status: 'verified_false',  // Too far off
      errorType: 'calculation'
    },
    description: 'Should reject significant approximation error'
  },

  // More Arithmetic Errors
  {
    id: 'arithmetic-multiplication-error',
    category: 'Basic Arithmetic',
    name: 'Multiplication error',
    input: { statement: '7 × 8 = 54' },
    expectations: {
      status: 'verified_false',
      errorType: 'calculation'
    },
    description: 'Should detect multiplication error (should be 56)'
  },
  {
    id: 'arithmetic-division-error',
    category: 'Basic Arithmetic',
    name: 'Division error',
    input: { statement: '100 ÷ 4 = 20' },
    expectations: {
      status: 'verified_false',
      errorType: 'calculation'
    },
    description: 'Should detect division error (should be 25)'
  },
  {
    id: 'arithmetic-subtraction-error',
    category: 'Basic Arithmetic',
    name: 'Subtraction error',
    input: { statement: '93 - 27 = 64' },
    expectations: {
      status: 'verified_false',
      errorType: 'calculation'
    },
    description: 'Should detect subtraction error (should be 66)'
  },
  {
    id: 'arithmetic-order-operations-error',
    category: 'Basic Arithmetic',
    name: 'Order of operations error',
    input: { statement: '2 + 3 × 4 = 20' },
    expectations: {
      status: 'verified_false',
      errorType: 'calculation'
    },
    description: 'Should detect PEMDAS error (should be 14, not 20)'
  },

  // Percentage Errors
  {
    id: 'percentage-increase-error',
    category: 'Percentages',
    name: 'Percentage increase error',
    input: { statement: 'A 25% increase on 80 gives 105' },
    expectations: {
      status: 'verified_false',
      errorType: 'calculation'
    },
    description: 'Should detect percentage increase error (should be 100)'
  },
  {
    id: 'percentage-of-error',
    category: 'Percentages',
    name: 'Percentage of error',
    input: { statement: '15% of 200 is 35' },
    expectations: {
      status: 'verified_false',
      errorType: 'calculation'
    },
    description: 'Should detect percentage calculation error (should be 30)'
  },

  // Fraction Errors
  {
    id: 'fraction-addition-error',
    category: 'Fractions',
    name: 'Fraction addition error',
    input: { statement: '1/2 + 1/3 = 2/5' },
    expectations: {
      status: 'verified_false',
      errorType: 'calculation'
    },
    description: 'Should detect fraction addition error (should be 5/6)'
  },
  {
    id: 'fraction-multiplication-error',
    category: 'Fractions',
    name: 'Fraction multiplication error',
    input: { statement: '2/3 × 3/4 = 6/7' },
    expectations: {
      status: 'verified_false',
      errorType: 'calculation'
    },
    description: 'Should detect fraction multiplication error (should be 1/2)'
  },

  // Scientific Notation Errors
  {
    id: 'scientific-notation-error',
    category: 'Scientific',
    name: 'Scientific notation error',
    input: { statement: '3.2 × 10^3 = 320' },
    expectations: {
      status: 'verified_false',
      errorType: 'calculation'
    },
    description: 'Should detect scientific notation error (should be 3200)'
  },
  {
    id: 'scientific-exponent-error',
    category: 'Scientific',
    name: 'Exponent calculation error',
    input: { statement: '2^10 = 1000' },
    expectations: {
      status: 'verified_false',
      errorType: 'calculation'
    },
    description: 'Should detect exponent error (should be 1024)'
  },

  // Statistics Errors
  {
    id: 'stats-mean-error',
    category: 'Statistics',
    name: 'Mean calculation error',
    input: { statement: 'The mean of 2, 4, 6, 8, 10 is 7' },
    expectations: {
      status: 'verified_false',
      errorType: 'calculation'
    },
    description: 'Should detect mean calculation error (should be 6)'
  },

  // Edge Cases
  {
    id: 'edge-division-by-zero',
    category: 'Edge Cases',
    name: 'Division by zero claim',
    input: { statement: '5 divided by 0 equals infinity' },
    expectations: {
      status: 'verified_false',
      errorType: 'conceptual'  // This is a conceptual error, not a calculation error
    },
    description: 'Should recognize that division by zero is undefined, not infinity'
  },
  {
    id: 'edge-very-large-numbers',
    category: 'Edge Cases',
    name: 'Large number calculation',
    input: { statement: '1 million × 1 thousand = 1 billion' },
    expectations: {
      status: 'verified_true'
    },
    description: 'Should handle large numbers correctly'
  },
  {
    id: 'edge-zero-property-error',
    category: 'Edge Cases',
    name: 'Zero multiplication error',
    input: { statement: '0 × 999999 = 1' },
    expectations: {
      status: 'verified_false',
      errorType: 'calculation'
    },
    description: 'Should detect zero property violation'
  }
];