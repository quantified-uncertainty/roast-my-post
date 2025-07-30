# Agent Timeout Configuration

## Overview
Different agent types require different execution timeouts based on their complexity. The General Epistemic Auditor (multi-epistemic-eval) was consistently timing out at 4 minutes because it runs multiple analysis plugins.

## Solution
We've implemented a dynamic timeout system that automatically adjusts worker timeouts based on the agent's extended capability.

## Configuration

### Default Timeout
- Default: 4 minutes (240,000 ms)
- Configured via: `ADAPTIVE_WORKER_TIMEOUT_MS` environment variable

### Per-Capability Timeouts
Defined in `/src/config/agentTimeouts.ts`:

| Extended Capability | Timeout | Reason |
|-------------------|---------|---------|
| `multi-epistemic-eval` | 15 minutes | Runs multiple plugins (Math, Spelling, FactCheck, Forecast) |
| `spelling-grammar` | 6 minutes | Processes large documents with detailed analysis |
| `simple-link-verifier` | 8 minutes | May need to check many external URLs |
| (default) | 4 minutes | Standard agents |

### How It Works
1. When spawning a worker, the adaptive processor checks the next pending job
2. It reads the agent's `extendedCapabilityId` from the job
3. It looks up the appropriate timeout for that capability
4. The worker is spawned with the specific timeout

### Adding New Timeouts
To add a timeout for a new agent capability:

1. Update `/src/config/agentTimeouts.ts`:
```typescript
CAPABILITY_TIMEOUTS: {
  'multi-epistemic-eval': 900000,
  'your-new-capability': 600000, // 10 minutes
  // ...
}
```

2. Document the reason for the timeout in comments

### Monitoring
When a non-default timeout is used, you'll see a log message:
```
📊 Next job requires 15m timeout (capability: multi-epistemic-eval)
```

### Safety Limits
- Maximum timeout: 20 minutes (safety limit)
- Workers are forcefully killed 5 seconds after timeout
- Failed jobs are automatically retried (up to 3 attempts)

## Example Usage
```bash
# Run the adaptive job processor with dynamic timeouts
npm run process-jobs-adaptive

# Override default timeout (for agents without specific capabilities)
ADAPTIVE_WORKER_TIMEOUT_MS=300000 npm run process-jobs-adaptive
```

## Troubleshooting
If agents are still timing out:
1. Check the agent's `extendedCapabilityId` in the database
2. Verify the timeout is sufficient in `/src/config/agentTimeouts.ts`
3. Consider optimizing the agent's workflow
4. Monitor actual execution times to adjust timeouts