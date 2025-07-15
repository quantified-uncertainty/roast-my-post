# Subtle Mathematical Errors in Test Cases

This document explains the deliberate mathematical errors embedded in the test cases.

## Calculus Errors

1. **Derivative Critical Points**: The derivative f'(x) = 3x² - 6x + 2 is correct, but the quadratic formula application has an arithmetic error in calculating the discriminant.

2. **Integration of sin²(x)**: The antiderivative should be x/2 - sin(2x)/4 + C, not x/2 - sin(2x)/2 + C. Missing the factor of 1/2 from the chain rule.

3. **Euler's Number**: States e ≈ 2.708, but e ≈ 2.718. The series calculation is subtly wrong.

## Statistics Errors

1. **Correlation Significance Test**: The rule |r| > 2/√n is a rough approximation but not the correct statistical test. Should use t-distribution with df = n-2.

2. **Normal Distribution Percentile**: While P(Z > 1) ≈ 0.1587 is correct, stating "84% below" instead of "~84.13% below" seems minor but could matter in precise contexts.

3. **Bonferroni Correction**: States α_adjusted = 0.025 but should be 0.0025 (forgot to divide by 10).

## Linear Algebra Errors

1. **Eigenvalue Calculation**: The expansion of det(A - λI) = (2-λ)² - 4 is incorrect. Should be (2-λ)(2-λ) - 4 = 4 - 4λ + λ² - 4 = λ² - 4λ, which gives the same answer but the shown work is wrong.

## Probability Errors

1. **Birthday Paradox**: Uses 365!/(342! × 365²³) but should be 365!/(343! × 365²³). Off by one in the factorial.

## Number Theory Errors

1. **Abundant Number Check**: Correctly calculates σ(12) = 28, but then compares to 2×12 = 24. This is actually correct (28 > 24), but the presentation might confuse since typically we check if σ(n) > 2n directly.

## Topology Errors

1. **Klein Bottle Euler Characteristic**: States χ = 1 for Klein bottle, but it's actually χ = 0. This is a straightforward factual error.

## Complex Analysis Errors

1. **Residue Calculation**: For f(z) = 1/(z²(z-1)), the Laurent expansion around z=0 starts with 1/z² - 1/z + ..., so Res(f,0) = -1, not 1.

2. **Contour Integral**: The calculation and answer are actually correct (integral is 0), but the presentation might suggest an error.

## Group Theory Errors

These examples are mostly correct but could have clearer presentation.

## Subtle Error Cases

1. **Limit Error**: Shows only one application of L'Hôpital's rule for the second limit when it requires two applications.

2. **Integration by Parts**: The final factoring is wrong. Should be (x²/2)(ln(x) - 1/2) not (x²/4)(2ln(x) - 1).

3. **Matrix Inverse**: The determinant calculation shows 3×3 - 2×4 = 1, which would be 9 - 8 = 1 (correct), but written confusingly.

4. **Conditional Probability**: Actually correct, but complex enough that errors could hide.

5. **Series Convergence**: Mostly correct, but the convergence value of the alternating harmonic series is ln(2), which is worth verifying.

## Why These Errors Matter

These subtle errors represent the kinds of mistakes that:
- Experts might make when working quickly
- Students might make when learning
- Could propagate through academic or technical writing
- Might affect downstream calculations or conclusions
- Are hard to catch without careful checking

The math checker should ideally catch most of these, though some require deep mathematical knowledge or context to identify.