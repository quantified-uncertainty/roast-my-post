# @roast/jobs - Job Processing System

## Architecture Overview

The job system uses **pg-boss** as the queue infrastructure while maintaining a separate **Job table** in the application database for UI/reporting purposes.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Web App   │────▶│  Job Table  │     │  pg-boss    │
│  (creates)  │     │  (status)   │◀───▶│  (queue)    │
└─────────────┘     └─────────────┘     └─────────────┘
                           ▲                   │
                           │                   ▼
                    ┌─────────────────────────────┐
                    │        Worker Process       │
                    │   (processes & updates)     │
                    └─────────────────────────────┘
```

## Dual Record Design

| Component | Purpose |
|-----------|---------|
| **Job table** | Application state, UI queries, custom fields (cost, logs, thinking) |
| **pg-boss** | Queue management, retry scheduling, job distribution |

Jobs share the same ID in both systems for easy correlation.

## Job Context (AsyncLocalStorage)

Single context propagates worker ID, job ID, and timeout through async call stack.

**Log format:**
```
[timestamp] [Worker host1234] [Job abc-123] [AI] message...
```

Worker ID = `hostname(4) + pid(4)`, max 8 chars. Set once at startup via `initWorkerContext()`.

## Timeout Handling

pg-boss `expireInSeconds` marks jobs failed but **cannot interrupt handlers**. We implement graceful timeouts:

1. **Remaining time budget** - LLM calls use `min(remainingTime, 180s)`
2. **Check between calls** - `checkJobTimeout()` throws if deadline passed

```
runWithJobContext({ jobId, timeoutMs })
    ↓
checkJobTimeout() → callClaude(remaining) → checkJobTimeout() → ...
    ↓
JobTimeoutError → Worker marks FAILED (non-retryable)
```

**Agent-specific timeouts** (from `config/agentTimeouts.ts`):
- Default: 4 min
- `spelling-grammar`: 6 min
- `simple-link-verifier`: 8 min
- `fallacy-check`: 10 min
- `multi-fallacy-eval`: 15 min
- Max: 20 min

## Retry Strategy (Hybrid)

**pg-boss handles transient errors:**
- Network errors (timeouts, connection resets)
- Rate limits (429)
- Server errors (5xx)

**Application handles permanent failures:**
- Validation errors
- Auth errors (401, 403)
- Not found (404)

### Retry Flow

1. Job fails with error
2. Worker checks `isRetryableError()`
3. If retryable AND retries remaining → re-throw (pg-boss retries)
4. If non-retryable OR max retries → mark Job as FAILED

**Job table status during retries:** Stays `RUNNING`, `attempts` field increments.

## Job Lifecycle

| State | Job Table | pg-boss |
|-------|-----------|---------|
| Created | PENDING | created |
| Processing | RUNNING | active |
| Transient error (will retry) | RUNNING | retry |
| Success | COMPLETED | completed |
| Non-retryable error | FAILED | failed (explicit) |
| Max retries exhausted | FAILED | failed (explicit) |
| Cancelled | CANCELLED | cancelled |

**Note:** For non-retryable errors, we explicitly call `boss.fail()` to prevent pg-boss from retrying.

## Scheduled Tasks

| Task | Schedule | Purpose |
|------|----------|---------|
| `job-reconciliation` | Every minute | Clean up stale RUNNING jobs (30min threshold) |
| `helicone-cost-update` | Every 30 seconds | Fetch LLM costs from Helicone |

Both use **exclusive queue policy** to prevent overlapping runs.

## Reconciliation

Handles worker crashes and orphaned jobs:

| Status | Stale After | Scenario |
|--------|-------------|----------|
| RUNNING | 30 min | Worker crashed mid-processing |
| PENDING | 10 min | Worker crashed before `markAsRunning()` or pg-boss job failed |

For each stale job:
1. Check pg-boss state
2. If no active pg-boss job → mark as FAILED

## Queue Configuration

```
document-evaluation:
  - policy: standard
  - retryLimit: 3 (configurable)
  - retryDelay: 60s
  - retryBackoff: true (exponential)
  - expireInSeconds: 3600 (job timeout)

helicone-cost-update:
  - policy: exclusive

job-reconciliation:
  - policy: exclusive
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PGBOSS_TEAM_SIZE` | 5 | Concurrent jobs per worker |
| `PGBOSS_RETRY_LIMIT` | 3 | Max retry attempts |
| `PGBOSS_RETRY_DELAY` | 60 | Seconds between retries |
| `PGBOSS_RETRY_BACKOFF` | true | Exponential backoff |
| `PGBOSS_EXPIRE_IN_SECONDS` | 3600 | Job timeout |
| `AI_LOG_LEVEL` | warn | AI package log level (error/warn/info/debug) |
