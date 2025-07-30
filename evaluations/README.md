# Spelling/Grammar Tool Evaluation System

A modern evaluation framework for the spelling/grammar checking tool, built with Hono and TypeScript.

## Architecture

```
evaluations/
├── data/
│   └── test-cases.ts      # Single source of truth for all test cases
├── server/
│   ├── index.ts           # Hono server with API endpoints
│   ├── runner.ts          # Test execution engine
│   ├── views.ts           # HTML templates
│   └── static/            # CSS and JS assets
├── scripts/
│   └── run-evaluation.ts  # CLI for running evaluations
└── results/               # JSON result files (gitignored)
```

## Quick Start

### 1. Start the Dashboard Server
```bash
cd evaluations
npm start
# Server runs at http://localhost:8765
```

### 2. Run Evaluations

**Via Web UI:**
- Click "Run New Evaluation" in the dashboard
- Tests run asynchronously in the background

**Via CLI:**
```bash
# Run all tests
npm run evaluate

# Run quick test (first 5 tests only)
npm run evaluate -- --quick

# Custom number of runs per test
npm run evaluate -- --runs 5
```

## Key Improvements

### 🎯 Single Source of Truth
All test cases are now in `data/test-cases.ts` with:
- Structured expectations (min/max errors, must find, etc.)
- Clear categorization
- Type-safe test definitions

### 🚀 Modern Web Server (Hono)
- Lightweight, fast, TypeScript-first
- Clean API endpoints
- Server-side HTML templating
- No more 1400+ lines of HTML in TypeScript!

### 📊 Better Dashboard
- Clean, responsive design
- Real-time evaluation progress (coming soon)
- Detailed test results with expandable sections
- Category-based statistics

### 🔧 API Endpoints
```
GET  /api/test-cases        # List all test cases
POST /api/evaluate          # Run evaluation
GET  /api/results           # List all results  
GET  /api/results/:file     # Get specific result
```

## Test Case Structure

```typescript
interface TestCase {
  id: string;
  category: string;
  name: string;
  input: CheckSpellingGrammarInput;
  expectations: {
    shouldFindErrors: boolean;
    minErrors?: number;
    maxErrors?: number;
    mustFind?: Array<{
      text: string;
      correction?: string;
      type?: 'spelling' | 'grammar';
      minImportance?: number;
      maxImportance?: number;
    }>;
  };
  description: string;
}
```

## Adding New Tests

Edit `data/test-cases.ts` to add new test cases. The structure enforces consistency and makes expectations explicit.