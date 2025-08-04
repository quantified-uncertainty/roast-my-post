# Session Hierarchy Bug Analysis

## Problem Summary

The logs show that tools are creating their own session IDs instead of inheriting from the job's session manager. This breaks the hierarchical session tracking that's supposed to show the full context of API calls.

### Example from logs:
```
Job Session: job-evaluation-12345
Tool Sessions: 
- math-agentic-1754315940404-mzjh6bv
- spell-agentic-1754315940405-abc123
- fact-agentic-1754315940406-xyz789
```

Each tool creates a standalone session, losing the connection to the parent job.

## Root Cause

Tools are generating their own session IDs instead of using the global session manager:

```typescript
// BUGGY CODE in check-math-with-mathjs/index.ts:124
const sessionId = `math-agentic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
```

This pattern appears in multiple tools:
- `check-math-with-mathjs/index.ts`
- `check-math-hybrid/index.ts` (likely)
- Other tools that create similar session IDs

## The Fix

Tools should check for and use the global session manager:

```typescript
// CORRECT IMPLEMENTATION
import { getGlobalSessionManager, getCurrentHeliconeHeaders } from '@roast/ai';

// In the tool's execute method:
const globalManager = getGlobalSessionManager();

if (globalManager) {
  // Use the global session manager for tracking
  await globalManager.trackTool('check-math', async () => {
    // Tool logic here
    // Headers are automatically included in all API calls
  });
} else {
  // Only create standalone session if no global context
  const sessionId = `${toolName}-standalone-${Date.now()}`;
  // Use standalone session
}
```

## Expected Behavior

With the fix, the session hierarchy should be:
```
job-123 (Job Session)
├── /analysis/document
│   └── /plugins/math
│       └── /tools/check-math  ← Same session ID as job
│   └── /plugins/spelling  
│       └── /tools/check-spelling  ← Same session ID as job
```

## Files to Update

1. **check-math-with-mathjs/index.ts**
   - Line 124: Remove session ID generation
   - Use global session manager

2. **check-math-hybrid/index.ts**
   - Similar pattern, needs same fix

3. **Other tools** that generate session IDs:
   - Search for pattern: `${toolName}-agentic-${Date.now()}`
   - Replace with global session manager usage

## Testing

Created comprehensive tests in:
- `sessionHierarchyIntegration.test.ts` - Integration tests
- `toolSessionBugReport.test.ts` - Bug reproduction and fix demonstration

These tests verify:
1. Tools inherit session ID from job
2. Path hierarchy is maintained
3. Parallel execution maintains separate paths
4. Session cleanup after job completion

## Implementation Steps

1. Remove standalone session ID generation from all tools
2. Import `getGlobalSessionManager` from '@roast/ai'
3. Check for global manager and use its tracking methods
4. Fall back to standalone only when no global context exists
5. Test with job execution to verify proper hierarchy