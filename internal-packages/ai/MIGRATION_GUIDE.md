# @roast/ai Migration Guide

This guide helps developers migrate from the old structure where AI functionality was scattered across the web app to the new centralized `@roast/ai` package.

## Overview

The AI functionality has been extracted into a dedicated package (`@roast/ai`) to:
- Enable reuse across different parts of the application (web app, MCP server, future services)
- Improve testability and maintainability
- Provide cleaner separation of concerns
- Standardize AI-related utilities and tools

## Import Changes

### Claude API Wrapper

**Before:**
```typescript
import { callClaude, callClaudeWithTool } from '@/lib/claude/wrapper';
import { sessionContext } from '@/lib/helicone/sessionContext';
```

**After:**
```typescript
import { callClaude, callClaudeWithTool, sessionContext } from '@roast/ai';
```

### Analysis Plugins

**Before:**
```typescript
import { PluginManager } from '@/lib/analysis-plugins/PluginManager';
import { MathPlugin } from '@/lib/analysis-plugins/plugins/math';
```

**After:**
```typescript
import { PluginManager, MathPlugin } from '@roast/ai';
```

### Tools

**Before:**
```typescript
import { checkSpellingGrammarTool } from '@/tools/check-spelling-grammar';
import { detectLanguageConventionTool } from '@/tools/detect-language-convention';
```

**After:**
```typescript
import { checkSpellingGrammarTool, detectLanguageConventionTool } from '@roast/ai';
```

### Types

**Before:**
```typescript
import type { Agent } from '@/types/agentSchema';
import type { Document } from '@/types/documents';
import type { Comment } from '@/types/documentSchema';
```

**After:**
```typescript
import type { Agent, Document, Comment } from '@roast/ai';
```

## Configuration Changes

### Environment Variables

The AI package no longer loads environment variables directly. Instead, you need to initialize it in your application:

**Add to your app initialization (e.g., in `app/layout.tsx` or a dedicated initialization file):**

```typescript
import { initializeAI } from '@roast/ai';

// Initialize the AI package with configuration
initializeAI({
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  heliconeApiKey: process.env.HELICONE_API_KEY,
  heliconeEnabled: process.env.HELICONE_CACHE_ENABLED === 'true',
  heliconeMaxAge: process.env.HELICONE_CACHE_MAX_AGE,
  heliconeMaxSize: process.env.HELICONE_CACHE_BUCKET_MAX_SIZE,
  searchModel: process.env.SEARCH_MODEL,
  analysisModel: process.env.ANALYSIS_MODEL,
});
```

For Next.js apps, we recommend creating a file at `src/lib/ai-init.ts`:

```typescript
import { initializeAI } from '@roast/ai';

export function initializeAIPackage() {
  initializeAI({
    // ... configuration
  });
}

// Auto-initialize on import for server-side
if (typeof window === 'undefined') {
  initializeAIPackage();
}
```

Then import this file early in your application lifecycle.

## Tool Result Types

We've added comprehensive TypeScript types for tool results. Update your tool usage:

**Before:**
```typescript
const [result, setResult] = useState<any>(null);
// ... later
result.errors.map((error: any) => ...)
```

**After:**
```typescript
import type { SpellingCheckResult } from '@/types/toolResults';

const [result, setResult] = useState<SpellingCheckResult | null>(null);
// ... later
result.errors.map((error) => ...) // error is now properly typed
```

## Breaking Changes

### 1. Document Analysis Not Exported

The document analysis functionality remains in the web app due to database dependencies. This means:

- `analyzeDocument` function is NOT available from `@roast/ai`
- Document analysis workflows should continue using the web app's implementation
- Future versions may introduce interfaces to enable this migration

### 2. Removed Direct Environment Access

The AI package no longer reads environment variables directly. You MUST call `initializeAI()` before using any AI functionality.

### 3. Type Name Changes

Some types have been renamed for clarity:
- `DbComment` → `Comment` (when imported from `@roast/ai`)
- Various tool-specific types are now under dedicated interfaces

## Common Migration Issues

### Issue: "Missing required configuration"

**Solution:** Ensure `initializeAI()` is called before any AI functionality is used.

### Issue: Import not found errors

**Solution:** Update your imports according to the mapping above. Use your IDE's "Update imports" feature if available.

### Issue: Type errors after migration

**Solution:** Replace `any` types with the proper interfaces from `@/types/toolResults` or `@roast/ai`.

## Testing

After migration, run these commands to verify everything works:

```bash
# Type checking
pnpm --filter @roast/web run typecheck

# Linting
pnpm --filter @roast/web run lint

# Tests
pnpm --filter @roast/web run test:ci
```

## Need Help?

If you encounter issues not covered in this guide:

1. Check the [AI package README](./README.md) for detailed API documentation
2. Review the [example implementations](./src/analysis-plugins/README.md) in the plugins directory
3. Search for usage examples in the web app codebase

## Future Improvements

We're planning to:
- Add interfaces for document analysis to enable full migration
- Provide more granular configuration options
- Add middleware support for request/response transformation
- Improve error messages and debugging capabilities