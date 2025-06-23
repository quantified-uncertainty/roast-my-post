# Open Annotate MCP Server Features

## Overview
This MCP server provides fast, direct database access to your Open Annotate system, offering 10-20x speed improvements over traditional CLI scripts.

## Available Tools

### Core Query Tools

#### 1. `get_agents`
- Lists all agents with their latest version information
- Shows agent name, type, version, and grading capability
- Optional parameters:
  - `limit`: Number of agents to return (default: 10)

#### 2. `get_recent_evaluations`
- Retrieves recent evaluation results
- Shows document info, agent details, status, grades, and costs
- Optional parameters:
  - `agentId`: Filter by specific agent
  - `limit`: Number of evaluations (default: 20)
  - `status`: Filter by "success", "failed", or "all"

#### 3. `get_documents`
- Search and list documents
- Shows evaluation counts and completion status
- Optional parameters:
  - `limit`: Number of documents (default: 10)
  - `searchTerm`: Search in document titles

#### 4. `get_failed_jobs`
- Lists recent failed jobs with error details
- Helpful for debugging and monitoring
- Optional parameters:
  - `limit`: Number of jobs (default: 20)
  - `agentId`: Filter by agent

### Analytics Tools

#### 5. `get_agent_stats`
- Provides performance analytics for a specific agent
- Shows success rate, average grade, total cost, failure reasons
- Required parameters:
  - `agentId`: The agent to analyze
- Optional parameters:
  - `days`: Lookback period (default: 7)

#### 6. `analyze_recent_evals`
- Comprehensive statistical analysis of recent evaluations
- Shows grade distributions, processing times, error patterns
- Groups results by agent and status
- Optional parameters:
  - `hours`: Hours to look back (default: 24)
  - `limit`: Max evaluations to analyze (default: 200)

#### 7. `get_batch_results`
- Detailed results for evaluation batches
- Shows completion rates, average grades, individual results
- Required parameters:
  - `batchId`: The batch ID to analyze

### System Monitoring

#### 8. `get_job_queue_status`
- Real-time job queue monitoring
- Shows pending, running, completed, and failed jobs
- Includes queue health indicators
- Optional parameters:
  - `includeDetails`: Show detailed job information (default: false)

## Example Usage in Claude

```
"Show me all agents"
"Get failed evaluations for agent-123"
"What's the performance of ASSESSOR agents over the last 30 days?"
"Find documents with 'climate' in the title"
"Show me recent failed jobs"
"Analyze evaluations from the last 24 hours"
"Get results for batch-456"
"What's the current job queue status?"
```

## Performance Benefits

- **Speed**: 2-5 seconds vs 30-60 seconds for CLI scripts
- **Persistence**: Database connection pooling
- **Structure**: JSON responses with consistent formatting
- **Natural Language**: No need to write code for queries

## Architecture

- Built with TypeScript and Prisma ORM
- Uses the MCP SDK for protocol handling
- Shares database schema with main application
- Graceful error handling and connection management