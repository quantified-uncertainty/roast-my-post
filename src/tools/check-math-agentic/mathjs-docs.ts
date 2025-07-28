// Comprehensive MathJS documentation for the agentic math tool
export const MATHJS_DOCS: Record<string, string> = {
  arithmetic: `MathJS Arithmetic Operations:
- Addition: a + b
- Subtraction: a - b  
- Multiplication: a * b
- Division: a / b
- Exponentiation: a ^ b or pow(a, b)
- Modulo: a % b or mod(a, b)
- Unary minus: -a
Order: PEMDAS/BODMAS
Examples: 2 + 3 * 4 = 14, (2 + 3) * 4 = 20`,

  numbers: `MathJS Number Types:
- Integers: 42, -17
- Decimals: 3.14, -0.5
- Scientific: 1.23e4, 5e-3
- Binary: 0b1010 (= 10)
- Hex: 0x2A (= 42)
- Complex: 3 + 4i
- Special: Infinity, NaN`,

  functions: `MathJS Functions:
TRIG: sin(x), cos(x), tan(x), asin(x), acos(x), atan(x)
HYPERBOLIC: sinh(x), cosh(x), tanh(x)
LOGARITHMS: log(x) [natural], log(x,base), log10(x), log2(x), exp(x)
ROOTS: sqrt(x), cbrt(x), nthRoot(x,n)
ROUNDING: round(x), floor(x), ceil(x), fix(x)
STATS: mean(arr), median(arr), std(arr), variance(arr), sum(arr)
PROBABILITY: factorial(n), combinations(n,k), permutations(n,k)`,

  comparison: `MathJS Comparisons:
OPERATORS: == != < > <= >=
LOGICAL: and, or, xor, not
FUNCTIONS: equal(a,b), unequal(a,b), smaller(a,b), larger(a,b)
CHECKS: isNaN(x), isFinite(x), isInteger(x), isPositive(x)`,

  units: `MathJS Units:
LENGTH: m, cm, mm, km, mile, yard, foot, inch
MASS: kg, g, mg, lb, oz, ton
TIME: s, ms, minute, hour, day, year
TEMP: K, degC, degF
SPEED: m/s, km/h, mph
USAGE: 5 km to m → 5000 m
       32 degF to degC → 0 degC`,

  matrices: `MathJS Matrices:
CREATE: [[1,2],[3,4]], zeros(m,n), ones(m,n), eye(n)
OPS: A+B, A*B (element), multiply(A,B) (matrix mult)
FUNCTIONS: transpose(A), det(A), inv(A), trace(A)
LINEAR: dot(a,b), cross(a,b), norm(A)`,

  percentages: `MathJS Percentages:
- 50% → 0.5
- 10% of 150 → 10% * 150 = 15
- Increase by 20% → x * (1 + 20%) = x * 1.2
- Decrease by 20% → x * (1 - 20%) = x * 0.8`,

  calculus: `MathJS Calculus (LIMITED):
DERIVATIVES: derivative('x^2', 'x') → '2 * x'
NOTE: MathJS has very limited symbolic capabilities.
Cannot do: integration, limits, series, ODEs
For symbolic math, use SymPy, Mathematica, etc.`,

  expressions: `MathJS Expression Syntax:
- Basic: 2 + 3 * 4
- Variables: x = 5; y = x * 2
- Functions: sin(pi/2), sqrt(16)
- Constants: pi, e, i
- Evaluation: evaluate('2+3*x', {x:5})`,

  default: `MathJS Quick Reference:
ARITHMETIC: + - * / ^ % mod
COMPARISON: == != < > <= >=
FUNCTIONS: sqrt() sin() log() exp() abs() round()
PERCENTAGES: 30% → 0.3
UNITS: 5 km to m, 32 degF to degC
MATRICES: [[1,2],[3,4]], multiply(A,B), det(A)
STATS: mean() std() combinations(n,k)
CONSTANTS: pi, e, i

For specific topics, ask about: arithmetic, functions, units, matrices, percentages, etc.`
};

// Extended comprehensive documentation
export const MATHJS_COMPREHENSIVE_DOCS = {
  arithmetic: `# MathJS Arithmetic Operations

## Basic Operations
- Addition: a + b
- Subtraction: a - b  
- Multiplication: a * b
- Division: a / b
- Exponentiation: a ^ b or pow(a, b)
- Modulo: a % b or mod(a, b)
- Unary minus: -a
- Unary plus: +a

## Order of Operations
MathJS follows standard mathematical order: PEMDAS/BODMAS
1. Parentheses/Brackets: ()
2. Exponents/Orders: ^
3. Multiplication and Division: * /
4. Addition and Subtraction: + -

## Examples
- 2 + 3 * 4 = 14 (not 20)
- (2 + 3) * 4 = 20
- 2^3^2 = 512 (right associative)
- -2^2 = -4 (unary minus has lower precedence)
- 10 % 3 = 1 (remainder)
- mod(-5, 3) = 1 (always positive)`,

  functions_detailed: `# MathJS Mathematical Functions (Detailed)

## Trigonometric Functions (angles in radians by default)
- sin(x), cos(x), tan(x) - basic trig functions
- asin(x), acos(x), atan(x) - inverse trig
- atan2(y, x) - four-quadrant arctangent
- sec(x), csc(x), cot(x) - reciprocal functions
- sinh(x), cosh(x), tanh(x) - hyperbolic functions
- asinh(x), acosh(x), atanh(x) - inverse hyperbolic

To use degrees: sin(90 deg), cos(45 deg)

## Logarithmic Functions
- log(x) - natural logarithm (base e)
- log(x, base) - logarithm with specified base
- log10(x) - common logarithm (base 10)
- log2(x) - binary logarithm (base 2)
- log1p(x) - log(1 + x), more accurate for small x
- exp(x) - e^x
- expm1(x) - e^x - 1, more accurate for small x

## Power and Root Functions
- sqrt(x) - square root
- cbrt(x) - cube root
- nthRoot(x, n) - nth root
- pow(x, y) - x to the power y
- square(x) - x^2
- cube(x) - x^3

## Rounding Functions
- round(x) - round to nearest integer
- round(x, n) - round to n decimal places
- floor(x) - round down to integer
- ceil(x) - round up to integer
- fix(x) - round towards zero
- sign(x) - sign of x (-1, 0, or 1)`,

  statistics_detailed: `# MathJS Statistics Functions

## Descriptive Statistics
- mean(array) - arithmetic mean/average
- median(array) - middle value
- mode(array) - most frequent value(s)
- sum(array) - sum of all elements
- prod(array) - product of all elements
- min(...values) - minimum value
- max(...values) - maximum value
- quantileSeq(array, prob) - quantile at probability

## Spread Measures
- std(array) - standard deviation (default: unbiased)
- variance(array) - variance (default: unbiased)
- mad(array) - median absolute deviation

## Probability Functions
- factorial(n) or n! - factorial
- combinations(n, k) - binomial coefficient C(n,k) or "n choose k"
- combinationsWithRep(n, k) - combinations with repetition
- permutations(n, k) - ordered selections P(n,k)
- gamma(x) - gamma function
- multinomial(a) - multinomial coefficient

## Random Numbers
- random() - uniform random [0, 1)
- random(min, max) - uniform random in range
- randomInt(max) - random integer [0, max)
- randomInt(min, max) - random integer [min, max)
- pickRandom(array) - random element from array`,

  units_detailed: `# MathJS Units System (Complete)

## Using Units
- Define: 5 km, 30 degC, 9.8 m/s^2
- Convert: value to unit
- Operations maintain units: (5 m) * (3 m) = 15 m^2

## Length Units
m (meter), cm, mm, km, mile, yard, foot, inch, mil,
angstrom, lightyear, parsec, au (astronomical unit),
fathom, furlong, chain, rod

## Mass Units  
kg (kilogram), g, mg, ug, ton, tonne, grain, dram,
ounce (oz), pound (lb), stone, slug, hundredweight (cwt)

## Time Units
s (second), ms, us, ns, ps, minute, hour, day, week,
fortnight, month, year, decade, century, millennium

## Temperature Units
K (kelvin), degC (celsius), degF (fahrenheit), degR (rankine)
Note: Absolute zero = 0 K = -273.15 degC = -459.67 degF

## Speed/Velocity
m/s, km/h (or kph), mph, knot, ft/s, mach

## Area Units
m2, cm2, mm2, km2, are, hectare, acre, sqin, sqft,
sqyd, sqmi, sqrd, sqch, sqmil

## Volume Units  
m3, cm3 (cc), mm3, L (liter), mL, cL, dL, hectoliter,
gallon, quart, pint, cup, floz, tablespoon, teaspoon,
barrel, bushel, peck

## Force Units
N (newton), dyne, poundforce (lbf), kip, kilogramforce (kgf)

## Energy Units
J (joule), kJ, MJ, GJ, Wh, kWh, eV, keV, MeV, GeV,
cal, kcal (Cal), BTU, therm, erg, electronvolt

## Power Units
W (watt), kW, MW, GW, hp (horsepower), PS

## Pressure Units
Pa (pascal), kPa, MPa, GPa, bar, mbar, torr, mmHg,
psi, ksi, atm (atmosphere), inHg, inH2O

## Frequency Units
Hz (hertz), kHz, MHz, GHz, THz, rpm

## Information Units
bit, byte, kbit, kB, Mbit, MB, Gbit, GB, Tbit, TB`,

  matrices_detailed: `# MathJS Matrix Operations (Complete)

## Creating Matrices
- 2D array: [[1, 2], [3, 4]]
- matrix() constructor: matrix([[1, 2], [3, 4]])
- zeros(m, n) - m×n zero matrix
- ones(m, n) - m×n matrix of ones
- eye(n) - n×n identity matrix
- diag(vector) - diagonal matrix from vector
- range(start, end, step) - create range vector

## Accessing Elements
- Get element: matrix.get([row, col])
- Set element: matrix.set([row, col], value)
- Get subset: matrix.subset(index(rowRange, colRange))
- Size: size(matrix) returns [rows, cols]

## Basic Matrix Arithmetic
- Addition: A + B (element-wise)
- Subtraction: A - B (element-wise)
- Scalar multiplication: 2 * A or A * 2
- Element-wise multiplication: dotMultiply(A, B)
- Matrix multiplication: multiply(A, B) or A * B
- Element-wise division: dotDivide(A, B)
- Element-wise power: dotPow(A, 2)

## Matrix Functions
- transpose(A) - transpose
- det(A) or determinant(A) - determinant
- inv(A) - matrix inverse
- trace(A) - sum of diagonal elements
- diag(A) - extract diagonal as vector
- norm(A) - Frobenius norm
- norm(A, 'fro') - Frobenius norm (explicit)
- norm(A, 1) - 1-norm
- norm(A, 2) - 2-norm
- norm(A, Infinity) - infinity norm

## Linear Algebra
- dot(a, b) - dot product of vectors
- cross(a, b) - cross product (3D vectors only)
- kron(A, B) - Kronecker product
- lup(A) - LU decomposition with pivoting
- lusolve(A, b) - solve Ax = b using LU decomposition
- qr(A) - QR decomposition
- slu(A) - sparse LU decomposition

## Matrix Manipulation
- concat(A, B) - concatenate horizontally
- concat(A, B, 0) - concatenate vertically
- resize(A, [rows, cols]) - resize matrix
- reshape(A, [rows, cols]) - reshape matrix
- squeeze(A) - remove singleton dimensions
- flatten(A) - convert to 1D array
- sort(A) - sort elements
- rotate(A, 90) - rotate matrix`,

  complex_numbers: `# MathJS Complex Numbers

## Creating Complex Numbers
- Literal notation: 3 + 4i or 3 + 4j
- complex(real, imag): complex(3, 4) creates 3 + 4i
- Complex from polar: r * exp(i * theta)

## Complex Operations
- Addition: (3 + 4i) + (1 + 2i) = 4 + 6i
- Subtraction: (3 + 4i) - (1 + 2i) = 2 + 2i
- Multiplication: (a + bi) * (c + di) = (ac - bd) + (ad + bc)i
- Division: automatic handling of complex division
- Power: (3 + 4i)^2, works with complex exponents too

## Complex Functions
- abs(z) - magnitude/modulus |z|
- arg(z) - argument/phase angle
- conj(z) - complex conjugate
- re(z) - real part
- im(z) - imaginary part
- sqrt(z) - complex square root
- exp(z) - complex exponential
- log(z) - complex natural logarithm
- sin(z), cos(z), etc. - complex trig functions

## Useful Identities
- Euler's formula: exp(i*x) = cos(x) + i*sin(x)
- De Moivre's theorem: (cos(x) + i*sin(x))^n = cos(nx) + i*sin(nx)
- |z|^2 = z * conj(z) = re(z)^2 + im(z)^2`,

  expressions_parsing: `# MathJS Expression Parsing

## Basic Expression Evaluation
- evaluate('2 + 3 * 4') → 14
- evaluate('sqrt(3^2 + 4^2)') → 5
- evaluate('sin(pi/2)') → 1

## Variables and Scope
- Single variable: evaluate('2 * x + 3', {x: 5}) → 13
- Multiple variables: evaluate('a * x + b', {a: 2, x: 5, b: 3}) → 13
- Assignment: evaluate('x = 5; y = x * 2; y') → 10

## Multiple Expressions
evaluate([
  'a = 3',
  'b = 4', 
  'c = sqrt(a^2 + b^2)',
  'c'
]) → [3, 4, 5, 5]

## Function Definition
- Simple: f(x) = x^2 + 2*x + 1
- Multiple params: g(x, y) = sqrt(x^2 + y^2)
- Conditional: sign(x) = x > 0 ? 1 : (x < 0 ? -1 : 0)

## String Interpolation
format(value, options)
- format(1/3, {precision: 3}) → "0.333"
- format(1/3, {notation: 'fixed', precision: 2}) → "0.33"

## Parser Object (Advanced)
const parser = math.parser()
parser.evaluate('x = 5')
parser.evaluate('y = x * 2')
parser.get('y') → 10`,

  common_patterns: `# Common MathJS Usage Patterns

## Financial Calculations
// Compound interest
P * (1 + r/n)^(n*t)

// Present value
FV / (1 + r)^n

// Loan payment (PMT)
P * r * (1 + r)^n / ((1 + r)^n - 1)

// Return on investment
(finalValue - initialValue) / initialValue * 100

## Physics Formulas
// Kinematic equations
d = v0*t + 0.5*a*t^2
v = v0 + a*t
v^2 = v0^2 + 2*a*d

// Energy
KE = 0.5 * m * v^2
PE = m * g * h
E = m * c^2

// Waves
f = v / lambda
T = 1 / f

## Engineering Calculations
// Ohm's law
V = I * R
P = V * I = I^2 * R = V^2 / R

// RC circuit time constant
tau = R * C

// Resonant frequency
f = 1 / (2 * pi * sqrt(L * C))

## Statistical Analysis
// Z-score
z = (x - mean) / std

// Coefficient of variation
CV = std / mean * 100

// Standard error
SE = std / sqrt(n)

// Confidence interval (95%)
CI = mean +/- 1.96 * SE

## Geometry
// Circle
area = pi * r^2
circumference = 2 * pi * r

// Triangle (Heron's formula)
s = (a + b + c) / 2
area = sqrt(s * (s-a) * (s-b) * (s-c))

// Distance between points
d = sqrt((x2-x1)^2 + (y2-y1)^2)`,

  limitations: `# MathJS Limitations and Workarounds

## What MathJS CANNOT Do

### Symbolic Mathematics
- NO symbolic integration
- NO symbolic differentiation (very limited)
- NO solving symbolic equations
- NO symbolic simplification
- NO limits or series expansion

### Advanced Mathematics
- NO differential equations
- NO Laplace/Fourier transforms
- NO tensor operations
- NO advanced number theory
- NO formal proofs

## Workarounds

### For Symbolic Math
Use alternative tools:
- Python: SymPy, SageMath
- Commercial: Mathematica, Maple
- Online: WolframAlpha, Symbolab

### For Numerical Methods
Implement manually:
// Numerical derivative
f'(x) ≈ (f(x+h) - f(x-h)) / (2*h)

// Numerical integration (Simpson's rule)
∫f(x)dx ≈ (b-a)/6 * (f(a) + 4*f((a+b)/2) + f(b))

### For Equation Solving
Use iterative methods:
// Newton's method
x_{n+1} = x_n - f(x_n) / f'(x_n)

// Bisection method
if f(a)*f(mid) < 0 then b = mid
else a = mid`
};

export function getMathJsDocs(topic: string): string {
  const topicLower = topic.toLowerCase();
  
  // Check basic docs first
  if (MATHJS_DOCS[topicLower]) {
    return MATHJS_DOCS[topicLower];
  }
  
  // Check comprehensive docs
  if (MATHJS_COMPREHENSIVE_DOCS[topicLower as keyof typeof MATHJS_COMPREHENSIVE_DOCS]) {
    return MATHJS_COMPREHENSIVE_DOCS[topicLower as keyof typeof MATHJS_COMPREHENSIVE_DOCS];
  }
  
  // Search for partial matches in comprehensive docs
  for (const [key, doc] of Object.entries(MATHJS_COMPREHENSIVE_DOCS)) {
    if (key.includes(topicLower) || topicLower.includes(key)) {
      return doc;
    }
  }
  
  // Return default
  return MATHJS_DOCS.default;
}

// Get all documentation
export function getAllMathJSDocumentation(): string {
  return Object.values(MATHJS_COMPREHENSIVE_DOCS).join('\n\n---\n\n');
}

// Concise docs for system prompt
export const MATHJS_CONCISE_DOCS = `MathJS Quick Reference:
ARITHMETIC: + - * / ^ % mod
COMPARISON: == != < > <= >=
FUNCTIONS: sqrt() sin() cos() log() exp() abs() round()
PERCENTAGES: 30% → 0.3
UNITS: 5 km to m, 32 degF to degC
MATRICES: [[1,2],[3,4]], multiply(A,B), det(A)
STATISTICS: mean() std() combinations(n,k)
CONSTANTS: pi, e, i

For full docs, use get_mathjs_syntax tool.`;