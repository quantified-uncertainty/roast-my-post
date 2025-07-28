export const MATHJS_DOCS: Record<string, string> = {
  expressions: `MathJS Expression Syntax:
- Basic arithmetic: 2 + 3 * 4
- Powers: 2^3 or pow(2, 3)
- Roots: sqrt(9) or 9^(1/2)
- Parentheses: (2 + 3) * 4
- Variables: x = 5; y = x * 2
- Functions: sin(pi/2), log(10), abs(-5)`,
  
  units: `MathJS Units:
- Define units: 5 kg, 10 m, 20 m/s
- Convert: 5 kg to lb, 100 cm to m
- Operations: (5 m) * (3 m) = 15 m^2
- Temperature: 20 degC to degF
- Compound: 60 mph to m/s`,
  
  functions: `Common MathJS Functions:
- Trigonometry: sin, cos, tan, asin, acos, atan
- Logarithms: log (base 10), ln (natural), log2
- Statistics: mean, median, std, variance
- Rounding: round, ceil, floor, fix
- Complex: abs, arg, conj, im, re`,
  
  constants: `MathJS Constants:
- pi: 3.14159...
- e: 2.71828...
- i: imaginary unit
- infinity: Infinity
- LN2, LN10, LOG2E, LOG10E, SQRT1_2, SQRT2`,
  
  matrices: `MathJS Matrix Operations:
- Create: [[1,2],[3,4]] or matrix([[1,2],[3,4]])
- Operations: A * B (multiply), A + B (add)
- Functions: det(A), inv(A), transpose(A)
- Element access: A[1,2] (row 1, col 2)`,
  
  default: `MathJS is a math library with support for:
- Expression parsing and evaluation
- Units and unit conversion
- Complex numbers
- Matrices and vectors
- Statistics functions
- BigNumbers for arbitrary precision

Use check_expression to evaluate any mathematical expression.`
};

export function getMathJsDocs(topic: string): string {
  return MATHJS_DOCS[topic.toLowerCase()] || MATHJS_DOCS.default;
}