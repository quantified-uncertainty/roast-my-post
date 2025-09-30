/**
 * Programmatic README generator for Math Plugin
 * Generates documentation from actual plugin configuration
 */

export function generateReadme(): string {
  return `# Math Checker

An agent that verifies mathematical statements, calculations, and formulas for accuracy. Combines computational verification with conceptual analysis to catch errors in arithmetic, algebra, statistics, and mathematical reasoning.

## How It Works

The agent analyzes mathematical content in documents by:
1. Extracting mathematical expressions and statements
2. Verifying calculations using both computational tools and mathematical reasoning
3. Checking unit consistency and dimensional analysis
4. Validating statistical claims and data interpretations
5. Identifying conceptual errors in mathematical logic

## Capabilities

- **Arithmetic verification** - Basic calculations, percentages, ratios
- **Algebraic checking** - Equation solving, simplification, factoring
- **Statistical validation** - Means, medians, correlations, significance tests
- **Unit analysis** - Dimensional consistency, conversion errors
- **Formula verification** - Scientific formulas, financial calculations
- **Conceptual review** - Mathematical logic, proof steps, reasoning errors

## Error Categories

- **Calculation errors**: Incorrect arithmetic or computational mistakes
- **Unit errors**: Dimensional inconsistencies or conversion mistakes
- **Logic errors**: Flawed mathematical reasoning or invalid steps
- **Notation errors**: Incorrect mathematical symbols or expressions
- **Conceptual errors**: Misunderstanding of mathematical principles

---
*This documentation is programmatically generated from source code. Do not edit manually.*
`;
}
