# Spelling & Grammar Analysis Module

This module provides document analysis for spelling and grammar errors using LLM-based analysis.

## Key Features

- **Chunk-based Analysis**: Divides documents into manageable chunks for analysis
- **Precise Line Numbers**: Tracks exact line numbers for accurate highlight placement
- **Word-level Precision**: Identifies specific words or phrases with errors
- **Clear Explanations**: Provides actionable corrections for each error

## Architecture

```
spellingGrammar/
├── workflows/
│   └── SpellingGrammarWorkflow.ts    # Main workflow orchestrator
├── infrastructure/
│   ├── llmClient.ts                  # LLM client with retry/fallback logic
│   └── documentProcessor.ts         # Document chunking and processing
├── domain/                           # Core domain models
├── application/                      # Business logic and error processing
├── highlightConverter.ts             # Converts line-based to character offsets
├── types.ts                         # TypeScript interfaces
├── testCases.ts                     # 20+ comprehensive test cases
├── index.ts                         # Module exports
└── __tests__/                       # Comprehensive test suite
```

## Usage

### With analyzeDocument (Recommended)

Create an agent with `extendedCapabilityId: "spelling-grammar-"`:

```typescript
const agent = {
  name: "Grammar Checker",
  extendedCapabilityId: "spelling-grammar-",
  primaryInstructions: "Find all spelling, grammar, punctuation, and capitalization errors.",
  // ... other agent properties
};

// Will automatically use spelling/grammar workflow
const result = await analyzeDocument(document, agent);
```

### Direct Workflow Analysis

```typescript
import { SpellingGrammarWorkflow } from './workflows/SpellingGrammarWorkflow';

const workflow = new SpellingGrammarWorkflow();

// Analyze complete document
const result = await workflow.analyze(document, agent, {
  executionMode: 'sequential', // or 'parallel'
  maxConcurrency: 3
});

// result contains:
// - highlights: Comment[] (ready for UI)
// - analysis: string (detailed report)
// - summary: string (brief summary)
// - grade: number (quality score)
// - tasks: TaskResult[] (cost/timing info)
```

## Highlight Format

The module uses a clean format that includes the actual error text:

```typescript
{
  lineStart: 10,           // 1-based line number
  lineEnd: 10,             // Same as lineStart for single-line
  highlightedText: "have", // Exact text with error
  description: "Grammar error: 'This' (singular) requires 'has'. Suggested correction: 'has'"
}
```

## Testing

- **Unit Tests**: Mock LLM responses for fast testing
- **LLM Tests**: Real API calls for integration testing
- **Line Number Tests**: Extensive tests for offset accuracy

Run tests:
```bash
npm run test:unit -- src/lib/documentAnalysis/spellingGrammar/
npm run test:llm -- src/lib/documentAnalysis/spellingGrammar/
```

## Implementation Details

### Document Chunking
Documents are automatically split into ~3000 character chunks to:
- Stay within LLM context limits
- Maintain reasonable processing times
- Preserve line number accuracy across chunks

### Error Detection
The system detects:
- Spelling mistakes ("recieve" → "receive")
- Grammar errors (subject-verb agreement, tense consistency)
- Punctuation errors (missing spaces, incorrect placement)
- Capitalization errors (proper nouns, sentence starts)
- Common word confusions (their/there/they're)

### Quality Scoring
Documents receive a quality score based on error density:
- 100%: No errors detected
- 90-99%: Excellent (few minor errors)
- 80-89%: Good (some errors)
- Below 80%: Needs improvement

## Performance

- Processes ~50-100 lines per second (depending on error density)
- Handles documents with 10,000+ lines
- Maintains accuracy with line numbers up to 99,999