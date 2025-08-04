# Helicone Session ID Override Issue

## Problem Summary

When plugins run with a specific Helicone session ID (e.g., for job tracking), the tools they call create their own session IDs instead of inheriting the parent session. This breaks the session tracking hierarchy and makes it impossible to see all API calls for a single job in Helicone.

## Example Scenario

1. Job starts with session ID: `job-12345`
2. Plugin runs with this session
3. Plugin calls `extract-math-expressions` tool
4. Tool creates NEW session: `extract-math-expressions-1234567890` ❌
5. Plugin calls `check-math-with-mathjs` tool  
6. Tool creates ANOTHER session: `math-agentic-1234567890-abc` ❌

Result: Three separate sessions in Helicone instead of one unified session.

## Root Cause

Tools are calling `sessionContext.setSession()` which REPLACES the entire session context instead of extending it.

### Example of the Problem (from check-math-with-mathjs/index.ts):

```typescript
if (existingSession) {
  sessionId = existingSession.sessionId;
  context.logger.info(`Using existing session: ${sessionId}`);
} else {
  sessionId = `math-agentic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const newSession = {
    sessionId,
    sessionName: `Math Agentic Tool`,
    sessionPath: '/tools/check-math-with-mathjs'
  };
  
  // PROBLEM: This replaces the entire session!
  sessionContext.setSession(newSession);
}
```

## The Fix

Tools should use `withPath()` and `withProperties()` to extend the existing session, not replace it.

### Correct Pattern:

```typescript
// Get or extend existing session
let sessionConfig: HeliconeSessionConfig | undefined;

const existingSession = sessionContext.getSession();
if (existingSession) {
  // EXTEND the existing session path
  sessionConfig = sessionContext.withPath('/tools/check-math-with-mathjs');
  
  // Add tool-specific properties
  if (sessionConfig) {
    sessionConfig = sessionContext.withProperties({
      tool: 'check-math-with-mathjs',
      operation: 'verify-calculation'
    });
  }
  
  context.logger.info(`Using existing session: ${sessionConfig?.sessionId}`);
} else {
  // Only create new session if running standalone
  sessionConfig = {
    sessionId: `math-agentic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    sessionName: 'Math Agentic Tool (Standalone)',
    sessionPath: '/tools/check-math-with-mathjs'
  };
  
  // DON'T call setSession here - just use the config for headers
  context.logger.info(`Created standalone session: ${sessionConfig.sessionId}`);
}

// Use the session config for Helicone headers
const heliconeHeaders = sessionConfig ? createHeliconeHeaders(sessionConfig) : undefined;
```

## Tools That Need Fixing

All tools that create their own session IDs need to be updated:

1. **check-math-with-mathjs** - Creates `math-agentic-*` sessions
2. **extract-math-expressions** - Uses `withPath()` but still might have issues
3. **extract-forecasting-claims** - Creates its own sessions
4. **extract-factual-claims** - Needs verification
5. **check-spelling-grammar** - Needs verification
6. **fact-checker** - Needs verification
7. **fuzzy-text-locator** - Needs verification

## Testing

The integration tests in `__tests__/` demonstrate:
- The current problematic behavior
- The desired behavior
- How to properly extend sessions

Run tests with:
```bash
pnpm test session-id-inheritance.test.ts
```

## Benefits of Fixing

1. **Unified job tracking** - All API calls for a job appear under one session
2. **Cost attribution** - Can accurately track costs per job
3. **Debugging** - Easier to trace the full execution flow
4. **Monitoring** - Better insights into job performance and errors
5. **Metadata preservation** - Job metadata (documentId, agentId, etc.) flows through all calls

## Additional Notes

There's also a bug in `sessionContext.ts` where `withPath()` and `withProperties()` reference `this.currentSession` which doesn't exist. They should use `this.getSession()` instead.