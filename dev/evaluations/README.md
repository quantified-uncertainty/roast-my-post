# Evaluation System Documentation

A comprehensive evaluation framework for testing AI-powered document analysis tools including mathematical verification and spelling/grammar checking.

## Overview

The evaluation system provides automated testing capabilities for multiple document analysis tools:

- **Math Verification Tool** - Verifies mathematical statements and calculations using MathJS with deterministic approximation handling
- **Spelling & Grammar Tool** - Sophisticated proofreading with adjustable strictness levels and language convention detection

## Architecture

### Directory Structure
```
dev/evaluations/
├── shared/              # Common utilities and interfaces
│   ├── BaseRunner.ts    # Environment setup and base runner class
│   ├── TestInterfaces.ts # Shared type definitions
│   └── TestUtils.ts     # Validation helpers and utilities
├── server/              # Evaluation server and runner implementations
│   ├── runners/         # Tool-specific evaluation runners
│   ├── __tests__/       # Server tests
│   └── static/          # Web dashboard assets
├── data/                # Test case definitions
│   ├── check-math-with-mathjs/
│   └── check-spelling-grammar/
└── README.md           # This documentation
```

### Shared Components

#### BaseRunner Class
Handles common environment setup including:
- Multi-path `.env` file loading
- API key validation
- Consistent logging across runners

#### Test Interfaces
Provides type-safe interfaces for:
- Base test case structure
- Tool-specific expectations (math vs spelling)
- Run results and execution statistics

#### Test Utils
Common utilities for:
- Test case validation
- Results aggregation and reporting
- Progress tracking and formatting

## Tool Capabilities

### Math Verification Tool
**Location**: `/internal-packages/ai/src/tools/check-math-with-mathjs/`

**Strengths:**
- Handles numerical computations, unit conversions, and mathematical functions
- Deterministic approximation handling without LLM interpretation
- Early detection of symbolic math to avoid unnecessary API calls
- Consistent comparison behavior with precision-based rounding

**Limitations:**
- Cannot handle symbolic mathematics (derivatives, integrals, proofs)
- Limited to 5 rounds of tool calls with 60-second timeout
- Returns `cannot_verify` for symbolic expressions
- Costs ~$0.02-0.05 per verification when using agent mode

**Test Coverage:** 652 test cases across categories including:
- Basic Arithmetic, Percentages, Scientific Constants
- Functions, Combinatorics, Unit Conversions
- Trigonometry, Logic Errors, Approximations

### Spelling & Grammar Tool
**Location**: `/internal-packages/ai/src/tools/check-spelling-grammar/`

**Strengths:**
- Intelligent US/UK convention handling with auto-detection
- Three strictness levels (minimal/standard/thorough)
- Importance scoring (0-100) and confidence ratings
- Context-aware error explanations

**Limitations:**
- Costs ~$0.01-0.02 per check using Claude Haiku
- Limited to 50 errors by default (configurable)
- Line numbers are approximate
- Requires fuzzy-text-locator for exact positioning

**Test Coverage:** 478 test cases across categories including:
- Basic Spelling, Grammar Patterns, Capitalization
- Critical Cases, Complex Text, Edge Cases

## Usage

### Running Evaluations

```bash
# Math tool evaluation
cd dev/evaluations
npm run test:math

# Spelling/grammar tool evaluation  
npm run test:spelling

# Full evaluation suite
npm run test:all

# Dashboard server
npm start
# Server runs at http://localhost:8765
```

### Test Development

Create new test cases by adding to the appropriate data file:
- Math: `dev/evaluations/data/check-math-with-mathjs/test-cases.ts`
- Spelling: `dev/evaluations/data/check-spelling-grammar/test-cases.ts`

Follow the shared interface patterns defined in `shared/TestInterfaces.ts`.

### Dashboard

The system includes a web dashboard for viewing results:
- Access at `http://localhost:8765/dashboard` when server is running
- Separate views for math and spelling evaluations
- Real-time result filtering and statistics

## Cost Estimates

- **Math Verification**: $0.02-0.05 per verification (agent mode)
- **Spelling/Grammar**: $0.01-0.02 per check (Claude Haiku)
- **Full Test Suite**: ~$15-30 for complete evaluation run

## Technical Details

### Approximation Handling (Math Tool)
- **Precision-based rounding**: Values compared based on decimal precision shown
- **Automatic acceptance**: Reasonable approximations accepted deterministically
- **Tolerance settings**: Absolute (1e-10) and relative tolerance options
- **Special values**: Handles Infinity, NaN, and -0 correctly

### Strictness Levels (Spelling Tool)
- **Minimal** (importance ≥51): Only critical errors
- **Standard** (≥26): Most grammar and spelling issues  
- **Thorough** (≥0): All detected errors including stylistic

### Error Reporting
Both tools provide structured error output with:
- Error type classification
- Confidence scores
- Suggested corrections
- Contextual explanations

## API Endpoints
```
GET  /api/test-cases        # List all test cases
POST /api/evaluate          # Run evaluation
GET  /api/results           # List all results  
GET  /api/results/:file     # Get specific result
```

## Contributing

When adding new tools or test cases:
1. Extend shared interfaces in `TestInterfaces.ts`
2. Create tool-specific runner extending `BaseRunner`
3. Add comprehensive test cases following existing patterns
4. Update this documentation with tool-specific details

## Monitoring

The system integrates with Helicone for usage monitoring and provides:
- Session tracking for evaluation runs
- Cost tracking per tool
- Performance metrics and timing
- Error rate monitoring