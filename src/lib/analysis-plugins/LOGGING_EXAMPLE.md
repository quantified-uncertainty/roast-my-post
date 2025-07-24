# Centralized Plugin Logging System

This document demonstrates the new centralized logging system that has been integrated with the plugin architecture and Job processing.

## Overview

The system provides:
- **Structured logging** during plugin execution
- **Error context capture** for debugging failed operations
- **Job integration** - logs are automatically saved to the `Job.logs` field
- **Log aggregation** and summary for completed jobs
- **Performance monitoring** with timing and cost tracking

## Key Components

### 1. PluginLogger
The main logger that captures all plugin events:
- Plugin execution lifecycle (start, complete, retry)
- Cost and performance tracking
- Error handling with stack traces
- Structured log entries with phases and context

### 2. PluginLoggerInstance
Plugin-specific logger with convenience methods:
- `logger.startPhase()` / `logger.endPhase()`
- `logger.processingChunks()`
- `logger.locationNotFound()`
- `logger.commentsGenerated()`
- `logger.cost()`

### 3. Job Integration
Automatically includes plugin logs in Job.logs field:
```
=== Plugin Analysis Summary ===
Duration: 19.5s
Total Cost: $0.0234
Total Comments: 24
Overall Status: PARTIAL
Errors: 1, Warnings: 15

=== Plugin Results ===
MathAnalyzer: SUCCESS
  Duration: 8.6s
  Comments: 21
  Cost: $0.0156
  Issues: 0 errors, 3 warnings

SpellingAnalyzer: FAILED
  Duration: 5.2s
  Comments: 0
  Cost: $0.0045
  Issues: 1 errors, 8 warnings
  Error: Cannot read properties of undefined (reading 'toLowerCase')

ForecastAnalyzer: SUCCESS
  Duration: 5.7s
  Comments: 3
  Cost: $0.0033
  Issues: 0 errors, 4 warnings

=== Key Issues ===
SpellingAnalyzer: Location Finding Failed (8x)
  Example: Could not find location for spelling error: This times the increase
MathAnalyzer: Location Finding Failed (3x)
  Example: Could not find location for math expression: 0.0228 / 0.0395 = 36.6%
ForecastAnalyzer: Location Finding Failed (4x)
  Example: Could not find location for forecast: I expect funding HIPF...

=== Recent Errors ===
[2025-07-24T01:58:52.599Z] SpellingAnalyzer (analysis): Plugin execution failed
  TypeError: Cannot read properties of undefined (reading 'toLowerCase')
```

## Integration Flow

1. **Job Processing** calls `analyzeDocument()` with `jobId`
2. **PluginManager** creates `PluginLogger` with the jobId
3. **Each plugin** gets a `PluginLoggerInstance` for structured logging
4. **Plugin execution** is wrapped with automatic logging:
   - Start/end phase tracking
   - Error handling with context
   - Performance and cost monitoring
5. **Job completion** includes the formatted log string in `Job.logs`

## Benefits

### For Debugging
- **Detailed error context** with stack traces and plugin state
- **Location finding failures** are now clearly tracked
- **Performance bottlenecks** are identified with timing data
- **Cost tracking** per plugin and per operation

### For Monitoring
- **Success/failure rates** per plugin
- **Common error patterns** identified automatically
- **Performance trends** over time
- **Cost optimization** opportunities

### For Users
- **Clear job logs** in the database for troubleshooting
- **Structured summaries** instead of scattered console logs
- **Actionable insights** about what went wrong and why

## Example Log Output

This is what you'll now see in the `Job.logs` field instead of just basic task information:

### Before (Basic Task Logs)
```
### Plugin Analysis
- Model: claude-3-5-sonnet-20241022
- Time: 19.5s
- Cost: $0.023400
- Interactions: 15
```

### After (Rich Plugin Logs)
```
=== Plugin Analysis Logs ===
=== Plugin Analysis Summary ===
Duration: 19.5s
Total Cost: $0.0234
Total Comments: 24
Overall Status: PARTIAL
Errors: 1, Warnings: 15

=== Plugin Results ===
[Detailed per-plugin results with errors and context]

=== Key Issues ===
[Categorized common problems with examples]

=== Recent Errors ===
[Stack traces and error context for debugging]

---

### Plugin Analysis
[Original task information]
```

The logging system provides the context you saw in your original logs but now structures it for persistence and analysis.