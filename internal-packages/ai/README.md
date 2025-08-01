# @roast/ai

Core AI utilities for RoastMyPost - Claude integration, Helicone tracking, and token management.

## Overview

This internal package provides centralized AI functionality that can be shared across the web application, MCP server, and future worker processes.

## Features

- **Claude API Wrapper**: Centralized Claude API integration with retry logic, caching, and Helicone integration
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
import { callClaude, callClaudeWithTool, MODEL_CONFIG } from '@roast/ai';

// Basic Claude call
const result = await callClaude({
  model: MODEL_CONFIG.analysis,
  system: "You are a helpful assistant",
  messages: [{ role: "user", content: "Hello!" }],
  max_tokens: 1000
});

// Claude with tool use
const toolResult = await callClaudeWithTool({
  system: "Extract data from text",
  messages: [{ role: "user", content: "..." }],
  toolName: "extract_data",
  toolDescription: "Extract structured data",
  toolSchema: { /* Zod schema */ }
});
```

### Token Utilities

```typescript
import { countTokens, estimateTokens, checkTokenLimits } from '@roast/ai';

// Count tokens (uses Anthropic API when available)
const tokenCount = await countTokens("Your text here");

// Quick estimation (synchronous)
const estimate = estimateTokens("Your text here");

// Check if within model limits
const { withinLimit, percentUsed } = checkTokenLimits(tokenCount);
```

### Helicone Integration

```typescript
import { HeliconeSessionContext, getHeliconeClient } from '@roast/ai';

// Set session context for tracking
HeliconeSessionContext.set({
  sessionId: "unique-session-id",
  sessionName: "Analysis Session",
  sessionPath: "/analysis/123"
});

// Get cost data
const client = getHeliconeClient();
const costs = await client.getCosts({ /* filters */ });
```

## Environment Variables

### Required Variables

```bash
# Claude API (required for all AI functionality)
ANTHROPIC_API_KEY=your-api-key
```

### Optional Variables

```bash
# Model selection (defaults to claude-sonnet-4-20250514)
ANALYSIS_MODEL=claude-sonnet-4-20250514

# Helicone integration for cost tracking and caching
HELICONE_API_KEY=your-helicone-key        # Required if HELICONE_CACHE_ENABLED=true
HELICONE_CACHE_ENABLED=true               # Enable Helicone caching (default: false)
HELICONE_CACHE_MAX_AGE=3600              # Cache TTL in seconds (default: 3600)
HELICONE_CACHE_BUCKET_MAX_SIZE=20        # Max cached items (default: 20)
```

### Configuration Validation

The package provides strict configuration validation that fails fast on any configuration errors:

```typescript
import { validateConfiguration } from '@roast/ai';

const config = validateConfiguration();
if (!config.isValid) {
  console.error('Configuration errors:', config.errors);
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
- `/utils` - Token counting, logging, and retry utilities
- `/types.ts` - Shared TypeScript types