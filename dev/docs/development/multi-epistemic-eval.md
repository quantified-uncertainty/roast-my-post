# Multi-Epistemic Evaluation Agent

The Multi-Epistemic Evaluation agent uses a plugin-based architecture to perform comprehensive document analysis across multiple dimensions.

## Overview

This agent analyzes documents using multiple "epistemic lenses":
- **Mathematical Accuracy**: Verifies calculations and formulas
- **Language Quality**: Checks spelling, grammar, and style
- **Factual Accuracy**: Verifies claims and identifies contradictions
- **Forecasting Analysis**: Extracts and analyzes predictions (optional)

## Architecture

### Plugin System

The core innovation is a **prompt-based routing system** where:

1. Each plugin declares its capabilities in natural language
2. A fast LLM (Claude Haiku) reads these descriptions and routes text chunks to appropriate plugins
3. Plugins process chunks independently and maintain state
4. Results are synthesized into a comprehensive analysis

### Key Components

```
PluginManager
├── PromptBasedRouter (decides which plugins process which chunks)
├── Plugins
│   ├── MathPlugin (verifies mathematical expressions)
│   ├── SpellingPlugin (checks spelling/grammar)
│   ├── FactCheckPlugin (verifies factual claims)
│   └── ForecastPlugin (analyzes predictions)
└── Document Chunking
```

### Workflow

1. **Chunking**: Document is split into ~1000 character chunks
2. **Routing**: Router asks Haiku which plugins should process each chunk
3. **Processing**: Plugins analyze their assigned chunks
4. **Synthesis**: Each plugin synthesizes findings
5. **Integration**: Results feed into comprehensive analysis

## Usage

### As an Agent

To use the multi-epistemic evaluation in your application:

```typescript
const agent = {
  id: 'multi-epistemic-evaluator',
  name: 'Multi-Epistemic Evaluator',
  extendedCapabilityId: 'multi-epistemic-eval',
  primaryInstructions: 'Perform comprehensive multi-epistemic evaluation...',
  // ... other agent fields
};
```

### Direct API Usage

```typescript
import { analyzeWithMultiEpistemicEval } from '@roast/ai';

const result = await analyzeWithMultiEpistemicEval(document, agent, {
  targetHighlights: 5,
  enableForecasting: false // Disabled by default due to cost
});
```

## Plugin Development

### Creating a Custom Plugin

```typescript
import { BasePlugin } from './BasePlugin';

class CustomPlugin extends BasePlugin<MyState> {
  name(): string {
    return "CUSTOM";
  }

  promptForWhenToUse(): string {
    return `Call this when you see X, Y, or Z. This includes:
    - Specific pattern 1
    - Specific pattern 2
    - Clear examples of when to use this plugin`;
  }

  async processChunk(chunk: TextChunk): Promise<ChunkResult> {
    // Analyze chunk, update state
    const findings = await this.analyzeChunk(chunk);
    this.state.items.push(...findings);
    
    return {
      findings: findings.map(f => ({
        type: 'custom_finding',
        severity: 'medium',
        message: f.description
      })),
      llmCalls: [/* track LLM usage */]
    };
  }

  async synthesize(): Promise<SynthesisResult> {
    // Analyze accumulated state
    const summary = this.analyzeTrends(this.state);
    
    return {
      summary,
      findings: this.state.criticalFindings,
      recommendations: this.generateRecommendations()
    };
  }
}
```

## Performance Characteristics

- **Routing**: ~200ms per 10 chunks (batched)
- **Processing**: Varies by plugin (math/spelling are fast, fact-checking is slower)
- **Caching**: Routing decisions are cached for similar chunks
- **Parallel**: Plugins can process chunks in parallel

## Example Output

```
OVERALL STATISTICS:
- Total chunks analyzed: 18
- Total findings: 24
- Critical findings: 5

FINDINGS BY TYPE:
  - math_error: 2
  - spelling_error: 7
  - false_claim: 1
  - contradiction: 2
  - forecast: 3

MATH ANALYSIS:
Found 4 mathematical expressions with 2 errors (50.0% error rate).
Key findings:
  - [medium] Math error in "2 + 2 = 5": Arithmetic error
  - [medium] Math error in "37% increace": Incorrect calculation

SPELLING ANALYSIS:
Found 7 spelling/grammar issues (5 spelling, 2 grammar).

FACT_CHECK ANALYSIS:
Analyzed 8 claims. Verified 3 high-priority claims: 2 true, 1 false.
Found 2 contradictions.

RECOMMENDATIONS:
- Double-check arithmetic calculations
- Run document through additional grammar checking tools
- Resolve contradictory statements for consistency
```

## Configuration

The agent supports these options:

- `targetHighlights`: Number of key issues to highlight (default: 5)
- `enableForecasting`: Enable expensive forecast analysis (default: false)
- `chunkSize`: Size of text chunks (default: 1000)
- `chunkByParagraphs`: Chunk by paragraphs vs fixed size (default: true)

## Technical Details

### Routing Prompt

Each plugin provides a natural language description:

```
MATH: Call this when there is math of any kind. This includes:
- Equations and formulas (2+2=4, E=mc², etc.)
- Statistical calculations or percentages
- Back-of-the-envelope calculations
- Mathematical reasoning or proofs
- Numerical comparisons (X is 3x larger than Y)
- Unit conversions
- Any discussion involving mathematical relationships
```

The router combines all plugin descriptions and asks the LLM to route chunks appropriately.

### State Management

Plugins maintain state across chunks, enabling:
- Pattern detection across the document
- Accumulation of related findings
- Cross-referencing between chunks
- Comprehensive synthesis at the end

### Error Handling

- Plugin failures don't crash the analysis
- Each plugin processes independently
- Failed routings default to basic analysis
- All errors are logged and reported