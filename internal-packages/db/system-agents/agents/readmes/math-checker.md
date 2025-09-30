# Math Checker

An agent that verifies mathematical statements, calculations, and formulas for accuracy. Combines computational verification with conceptual analysis to catch errors in arithmetic, algebra, statistics, and mathematical reasoning.

## How It Works

The agent analyzes mathematical content in documents by:
1. Extracting mathematical expressions and statements
2. Verifying calculations using both computational tools and mathematical reasoning
3. Checking unit consistency and dimensional analysis
4. Validating statistical claims and data interpretations
5. Identifying conceptual errors in mathematical logic

## When to Use

This plugin is called when documents contain:
- Equations and formulas (2+2=4, E=mc², etc.)
- Statistical calculations or percentages
- Back-of-the-envelope calculations
- Mathematical reasoning or proofs
- Numerical comparisons (X is 3x larger than Y)
- Unit conversions
- Any discussion involving mathematical relationships

## Routing Examples

**Should Process:**
> "The population grew by 15% over the last decade, from 1.2M to 1.38M"

*Reason: Contains percentage calculation that should be verified*

**Should Process:**
> "If we assume a 7% annual return, $10,000 invested today would be worth $19,672 in 10 years"

*Reason: Contains compound interest calculation*

**Should NOT Process:**
> "Mathematics has been called the language of the universe"

*Reason: Discusses math conceptually but contains no actual math*

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
