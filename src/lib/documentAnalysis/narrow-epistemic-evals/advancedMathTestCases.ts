/**
 * Advanced mathematical test cases with subtle errors
 * These examples cover various mathematical domains with both obvious and hard-to-catch mistakes
 */

export const advancedTestCases = {
  calculus: `
    In analyzing the function f(x) = x³ - 3x² + 2x, we find its critical points by 
    taking the derivative: f'(x) = 3x² - 6x + 2. Setting this equal to zero and 
    using the quadratic formula, we get x = (6 ± √(36 - 24))/6 = (6 ± √12)/6 = 
    (6 ± 2√3)/6 = 1 ± √3/3.

    For the integral ∫sin²(x)dx, we use the identity sin²(x) = (1 - cos(2x))/2.
    Therefore, ∫sin²(x)dx = ∫(1 - cos(2x))/2 dx = x/2 - sin(2x)/2 + C.

    The Taylor series expansion of e^x around x=0 is 1 + x + x²/2! + x³/3! + ...
    Therefore, e ≈ 1 + 1 + 1/2 + 1/6 + 1/24 = 2.708. Since this series converges
    rapidly, we can say e ≈ 2.71 with good accuracy.
  `,

  statistics: `
    In a study with n=100 participants, we found a correlation of r=0.3 between 
    variables X and Y. The coefficient of determination R² = 0.3² = 0.09, meaning
    that 9% of the variance in Y is explained by X. With n=100, this correlation
    is statistically significant since |r| > 2/√n = 2/√100 = 0.2.

    For a normal distribution with μ=50 and σ=10, approximately 95% of values fall
    within 2 standard deviations of the mean. So 95% of values lie between 30 and 70.
    The probability of a value exceeding 60 is P(X > 60) = P(Z > 1) ≈ 0.1587, where
    Z = (60-50)/10 = 1. This means about 84% of values are below 60.

    In hypothesis testing with α=0.05, if we conduct 20 independent tests, the 
    probability of at least one Type I error is 1 - (0.95)²⁰ = 1 - 0.358 = 0.642,
    or about 64%. This is why we need to adjust for multiple comparisons using
    Bonferroni correction: α_adjusted = 0.05/20 = 0.025.
  `,

  linearAlgebra: `
    Consider the matrix A = [[2, 1], [4, 2]]. To find its eigenvalues, we solve
    det(A - λI) = 0. This gives us det([[2-λ, 1], [4, 2-λ]]) = (2-λ)² - 4 = 
    λ² - 4λ + 4 - 4 = λ² - 4λ = λ(λ-4) = 0. So the eigenvalues are λ₁ = 0 and λ₂ = 4.

    For the eigenvector corresponding to λ₁ = 0, we solve Av = 0v = 0:
    [[2, 1], [4, 2]] * [x, y]ᵀ = [0, 0]ᵀ
    This gives us 2x + y = 0 and 4x + 2y = 0. Since these equations are dependent,
    we can choose x = 1, giving y = -2. So v₁ = [1, -2]ᵀ.

    The matrix A has rank 1 since its rows are linearly dependent (row 2 = 2 * row 1).
    By the rank-nullity theorem, rank(A) + nullity(A) = n = 2, so nullity(A) = 1.
    This confirms that the null space is one-dimensional, spanned by v₁.
  `,

  probability: `
    In the Monty Hall problem, after the host opens a door showing a goat, the 
    probability of winning by switching is 2/3. Here's why: Initially, P(car behind 
    chosen door) = 1/3. After the host opens a door, if we originally chose a goat 
    (probability 2/3), switching wins. If we originally chose the car (probability 1/3), 
    switching loses. So P(win by switching) = P(initially chose goat) = 2/3.

    For two independent events A and B with P(A) = 0.6 and P(B) = 0.4, we have:
    P(A ∩ B) = P(A) × P(B) = 0.6 × 0.4 = 0.24
    P(A ∪ B) = P(A) + P(B) - P(A ∩ B) = 0.6 + 0.4 - 0.24 = 0.76
    P(A|B) = P(A ∩ B)/P(B) = 0.24/0.4 = 0.6 (which equals P(A) since they're independent)

    The birthday paradox: In a room with 23 people, the probability that at least
    two share a birthday is approximately 50%. The exact calculation is:
    P(at least one match) = 1 - P(no matches) = 1 - (365/365 × 364/365 × ... × 343/365)
    = 1 - 365!/(342! × 365²³) ≈ 1 - 0.493 = 0.507
  `,

  numberTheory: `
    Fermat's Little Theorem states that if p is prime and a is not divisible by p,
    then aᵖ⁻¹ ≡ 1 (mod p). For example, with p = 7 and a = 3:
    3⁶ = 729 = 104 × 7 + 1, so 3⁶ ≡ 1 (mod 7).

    To check if 561 is prime, we can use the fact that 561 = 3 × 11 × 17. However,
    561 is a Carmichael number: for any a coprime to 561, a⁵⁶⁰ ≡ 1 (mod 561).
    This satisfies Fermat's test even though 561 is composite. For instance,
    2⁵⁶⁰ ≡ 1 (mod 561), which might incorrectly suggest 561 is prime.

    The sum of divisors function σ(n) for n = 12 is:
    σ(12) = 1 + 2 + 3 + 4 + 6 + 12 = 28. Since σ(12) = 28 > 2×12 = 24,
    we conclude that 12 is an abundant number. The first perfect number is 6,
    where σ(6) = 1 + 2 + 3 + 6 = 12 = 2×6.
  `,

  topology: `
    The Euler characteristic χ for a polyhedron is given by χ = V - E + F, where
    V is vertices, E is edges, and F is faces. For a cube: V = 8, E = 12, F = 6,
    so χ = 8 - 12 + 6 = 2. For any convex polyhedron, χ = 2.

    A torus (doughnut shape) can be constructed by identifying opposite edges of a
    rectangle. Its Euler characteristic is χ = V - E + F = 1 - 2 + 1 = 0. The
    fundamental group of a torus is π₁(T²) = ℤ × ℤ, representing the two independent
    loops around the torus.

    The Klein bottle is a non-orientable surface that cannot be embedded in ℝ³ without
    self-intersection. Its Euler characteristic is χ = 1. Unlike the Möbius strip
    which has χ = 0 and one boundary component, the Klein bottle is closed (no boundary)
    and has χ = 1.
  `,

  complexAnalysis: `
    For the complex function f(z) = z², the derivative is f'(z) = 2z everywhere.
    This function is entire (holomorphic everywhere). By Cauchy's integral formula,
    for any simple closed curve C containing z₀:
    f(z₀) = (1/2πi) ∮_C f(z)/(z-z₀) dz

    The residue of f(z) = 1/(z²(z-1)) at z = 0 is found by expanding:
    1/(z²(z-1)) = -1/z² + 1/z + 1 + z + z² + ...
    So Res(f, 0) = 1 (the coefficient of 1/z).

    For the integral ∮_{|z|=2} 1/(z²-1) dz, we note that the singularities are at
    z = ±1, both inside |z| = 2. By the residue theorem:
    ∮_{|z|=2} 1/(z²-1) dz = 2πi × [Res(f, 1) + Res(f, -1)]
    = 2πi × [1/2 + (-1/2)] = 2πi × 0 = 0
  `,

  groupTheory: `
    The symmetric group S₄ has order 4! = 24. Its subgroups include the alternating
    group A₄ of order 12, the Klein four-group V₄ ≅ ℤ₂ × ℤ₂ of order 4, and various
    cyclic subgroups. Since A₄ has index 2 in S₄, it is a normal subgroup.

    The dihedral group D₆ (symmetries of a hexagon) has order 12. It has elements
    {e, r, r², r³, r⁴, r⁵, s, sr, sr², sr³, sr⁴, sr⁵} where r is rotation by 60°
    and s is reflection. The center Z(D₆) = {e, r³} has order 2.

    By Lagrange's theorem, the order of any subgroup divides the order of the group.
    So the possible orders of subgroups of a group of order 20 are: 1, 2, 4, 5, 10, 20.
    A group of order 20 = 4×5 must have either a normal Sylow 5-subgroup or a normal
    Sylow 2-subgroup (or both), making it non-simple.
  `
};

// More focused test cases with specific subtle errors
export const subtleErrorCases = {
  limitError: `
    To evaluate lim(x→0) [sin(x)/x], we can use L'Hôpital's rule since we have 0/0:
    lim(x→0) [sin(x)/x] = lim(x→0) [cos(x)/1] = cos(0) = 1.
    
    Similarly, lim(x→0) [(1-cos(x))/x²] = lim(x→0) [sin(x)/(2x)] = lim(x→0) [cos(x)/2] = 1/2.
  `,

  integrationByParts: `
    To solve ∫x·ln(x)dx, we use integration by parts with u = ln(x), dv = x dx.
    Then du = (1/x)dx and v = x²/2.
    So ∫x·ln(x)dx = (x²/2)·ln(x) - ∫(x²/2)·(1/x)dx = (x²/2)·ln(x) - ∫(x/2)dx
    = (x²/2)·ln(x) - x²/4 + C = (x²/4)(2ln(x) - 1) + C.
  `,

  matrixInverse: `
    For the 2×2 matrix A = [[3, 2], [4, 3]], the determinant is det(A) = 3×3 - 2×4 = 1.
    The inverse is A⁻¹ = (1/det(A)) × [[3, -2], [-4, 3]] = [[3, -2], [-4, 3]].
    We can verify: AA⁻¹ = [[3, 2], [4, 3]] × [[3, -2], [-4, 3]] = [[1, 0], [0, 1]] ✓
  `,

  conditionalProbability: `
    A medical test has 95% sensitivity (true positive rate) and 98% specificity 
    (true negative rate). If the disease prevalence is 1%, what's the probability
    someone has the disease given a positive test?
    
    Using Bayes' theorem:
    P(Disease|Positive) = P(Positive|Disease)×P(Disease) / P(Positive)
    = 0.95 × 0.01 / [0.95 × 0.01 + 0.02 × 0.99]
    = 0.0095 / [0.0095 + 0.0198] = 0.0095 / 0.0293 ≈ 0.324 or 32.4%
  `,

  seriesConvergence: `
    The harmonic series ∑(1/n) diverges, but the alternating harmonic series
    ∑((-1)ⁿ⁺¹/n) = 1 - 1/2 + 1/3 - 1/4 + ... converges to ln(2).
    
    For the p-series ∑(1/nᵖ), convergence occurs when p > 1. So ∑(1/n²) converges
    to π²/6 ≈ 1.645, while ∑(1/n^(1/2)) diverges since p = 1/2 < 1.
  `
};