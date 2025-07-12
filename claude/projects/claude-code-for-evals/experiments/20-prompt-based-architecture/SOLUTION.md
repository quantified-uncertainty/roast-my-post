# Solution: Why the Analyzers Were Hanging

## The Problem
The analyzers were hanging because they were missing the Node.js timeout parameter in the `execAsync` call. Without this, Node.js would wait forever for the command to complete, even if the shell `timeout` command had already killed the process.

## The Fix
Add `timeout: (timeout + 10) * 1000` to the execAsync options:

```javascript
const { stdout } = await execAsync(
    `cat ${tempFile} | timeout ${timeout} claude --print`,
    { 
        maxBuffer: 10 * 1024 * 1024, 
        shell: '/bin/bash',
        timeout: (timeout + 10) * 1000  // <-- THIS WAS MISSING
    }
);
```

## Why It Worked Before
The previous experiments (like experiment 06) used the old Claude CLI syntax with `-p` flag directly, which may have had different behavior. Also, they might have been tested with shorter prompts that completed quickly.

## Current Status
- The issue has been identified
- The fix is simple: add Node.js timeout to execAsync
- The analyzers should work once this timeout is properly added

## Recommendation
For now, use the `prompt-based-analyzer-fixed-timeout.js` which has the proper timeout handling, or manually fix the original files by adding the timeout parameter to all execAsync calls.