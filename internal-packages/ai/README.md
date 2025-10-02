# @roast/ai

Core AI utilities for RoastMyPost - Claude integration, analysis plugins, document analysis tools, and token management.

## Overview

This internal package provides centralized AI functionality that can be shared across the web application, MCP server, and future worker processes. It contains all the AI-powered features extracted from the main web application for better code reuse and modularity.

## Features

- **Claude API Wrapper**: Centralized Claude API integration with retry logic, caching, and Helicone integration
- **Analysis Plugins System**: Modular plugin architecture for document analysis (math checking, spell checking, fact checking, forecasting)
- **Document Analysis Workflows**: Comprehensive analysis, self-critique, highlight extraction, and multi-epistemic evaluation
- **AI-Powered Tools**: Suite of specialized tools for text analysis, language detection, content extraction
- **Token Management**: Accurate token counting and estimation utilities
- **Helicone Integration**: Cost tracking, session management, and usage analytics
- **Type Safety**: Full TypeScript support with comprehensive types

## Installation

This is an internal package. Add it to your package dependencies:

```json
"dependencies": {
  "@roast/ai": "workspace:*"
}
```

## Usage

### Claude API Wrapper

```typescript
import { callClaude, callClaudeWithTool, MODEL_CONFIG } from "@roast/ai";

// Basic Claude call
const result = await callClaude({
  model: MODEL_CONFIG.analysis,
  system: "You are a helpful assistant",
  messages: [{ role: "user", content: "Hello!" }],
  max_tokens: 1000,
});

// Claude with tool use
const toolResult = await callClaudeWithTool({
  system: "Extract data from text",
  messages: [{ role: "user", content: "..." }],
  toolName: "extract_data",
  toolDescription: "Extract structured data",
  toolSchema: {
    /* Zod schema */
  },
});
```

### Token Utilities

```typescript
import { countTokens, estimateTokens, checkTokenLimits } from "@roast/ai";

// Count tokens (uses Anthropic API when available)
const tokenCount = await countTokens("Your text here");

// Quick estimation (synchronous)
const estimate = estimateTokens("Your text here");

// Check if within model limits
const { withinLimit, percentUsed } = checkTokenLimits(tokenCount);
```

### Analysis Plugins

```typescript
import {
  PluginManager,
  MathPlugin,
  SpellingPlugin,
  FactCheckPlugin,
} from "@roast/ai";

// Create plugin manager
const manager = new PluginManager({
  jobId: "analysis-123",
});

// Analyze document with all plugins
const result = await manager.analyzeDocument(document, {
  targetHighlights: 10,
});
```

### Document Analysis Tools

```typescript
import {
  documentChunker,
  extractMathExpressions,
  checkSpellingGrammar,
  extractFactualClaims,
  fuzzyTextLocator,
} from "@roast/ai";

// Chunk a document intelligently
const chunks = await documentChunker(text, {
  maxChunkSize: 1500,
  preserveContext: true,
});

// Extract and check math
const mathExpressions = await extractMathExpressions(text);
const mathResults = await checkMath(mathExpressions);

// Check spelling and grammar
const spellingErrors = await checkSpellingGrammar(text, {
  languageConvention: "US",
});
```

### Helicone Integration

```typescript
import { sessionContext, getHeliconeClient } from "@roast/ai";

// Set session context for tracking
sessionContext.setSession({
  sessionId: "unique-session-id",
  sessionName: "Analysis Session",
  sessionPath: "/analysis/123",
});

// Get cost data
const client = getHeliconeClient();
const costs = await client.getCosts({
  /* filters */
});
```

## Environment Variables

### Required Variables

```bash
# Claude API (required for all AI functionality)
ANTHROPIC_API_KEY=your-api-key
```

### Optional Variables

```bash
# Model selection (defaults to claude-sonnet-4-5)
ANALYSIS_MODEL=claude-sonnet-4-5

# Helicone integration for cost tracking and caching
HELICONE_API_KEY=your-helicone-key        # Required if HELICONE_CACHE_ENABLED=true
HELICONE_CACHE_ENABLED=true               # Enable Helicone caching (default: false)
HELICONE_CACHE_MAX_AGE=3600              # Cache TTL in seconds (default: 3600)
HELICONE_CACHE_BUCKET_MAX_SIZE=20        # Max cached items (default: 20)
```

### Configuration Validation

The package provides strict configuration validation that fails fast on any configuration errors:

```typescript
import { validateConfiguration } from "@roast/ai";

const config = validateConfiguration();
if (!config.isValid) {
  console.error("Configuration errors:", config.errors);
  process.exit(1);
}
```

**Note**: This package enforces strict configuration requirements. All API keys must be properly set, and all numeric values must be valid. This is intentional to catch configuration issues early rather than experiencing runtime failures.

## Development

Run tests:

```bash
pnpm test
```

Type checking:

```bash
pnpm typecheck
```

## Architecture

The package is organized into:

- `/claude` - Claude API wrapper and utilities
- `/helicone` - Helicone integration for cost tracking
- `/analysis-plugins` - Plugin system for modular document analysis
  - `/plugins` - Individual analysis plugins (math, spelling, fact-check, forecast)
  - `/utils` - Plugin utilities (chunk routing, comment building)
- `/document-analysis` - High-level document analysis workflows
  - `/comprehensiveAnalysis` - Full document analysis orchestration
  - `/selfCritique` - Self-critique generation
  - `/highlightExtraction` - Extract highlights from analysis
  - `/linkAnalysis` - Analyze and validate links in documents
- `/tools` - Individual AI-powered analysis tools
  - `math-validator-llm` - Mathematical expression validation
  - `spelling-grammar-checker` - Spelling and grammar checking
  - `factual-claims-extractor` - Factual claim extraction
  - `smart-text-searcher` - Smart text search and location
  - `document-chunker` - Intelligent document chunking
  - And many more...
- `/shared` - Shared types and utilities
- `/utils` - Token counting, logging, and retry utilities
- `/types.ts` - Core TypeScript types

## Exports

The package provides both named exports for specific components and namespace exports for convenience:

```typescript
// Individual imports
import { callClaude, PluginManager, MathPlugin } from "@roast/ai";

// Tool imports
import { checkMath, checkSpellingGrammar } from "@roast/ai";

// Type imports
import type { Comment, DocumentLocation, LanguageConvention } from "@roast/ai";
```
