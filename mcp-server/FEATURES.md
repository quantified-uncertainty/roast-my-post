# Open Annotate MCP Server Features

This document provides detailed documentation of all available tools in the Open Annotate MCP server.

## Read Operations

### get_agents

Get a list of agents with their latest versions.

**Parameters:**

- `limit` (number, optional): Number of agents to return (default: 10)
- `includeArchived` (boolean, optional): Include archived agents (default: false)

**Example:**

```json
{
  "limit": 20,
  "includeArchived": false
}
```

### get_recent_evaluations

Get recent evaluations with optional filtering.

**Parameters:**

- `agentId` (string, optional): Filter by specific agent ID
- `limit` (number, optional): Number of evaluations to return (default: 20)
- `status` (string, optional): Filter by evaluation status - "success", "failed", or "all" (default: all)

**Example:**

```json
{
  "agentId": "agent-123",
  "limit": 50,
  "status": "failed"
}
```

### get_agent_stats

Get performance statistics for a specific agent.

**Parameters:**

- `agentId` (string, required): Agent ID to get stats for
- `days` (number, optional): Number of days to look back (default: 7)

**Example:**

```json
{
  "agentId": "agent-123",
  "days": 30
}
```

### get_failed_jobs

Get recent failed jobs with error details.

**Parameters:**

- `limit` (number, optional): Number of jobs to return (default: 20)
- `agentId` (string, optional): Filter by specific agent ID

**Example:**

```json
{
  "limit": 10,
  "agentId": "agent-123"
}
```

### get_documents

Get documents with optional search.

**Parameters:**

- `limit` (number, optional): Number of documents to return (default: 10)
- `searchTerm` (string, optional): Search in document titles

**Example:**

```json
{
  "limit": 20,
  "searchTerm": "AI safety"
}
```

### analyze_recent_evals

Analyze recent evaluations with comprehensive statistics.

**Parameters:**

- `hours` (number, optional): Number of hours to look back (default: 24)
- `limit` (number, optional): Maximum evaluations to analyze (default: 200)

**Example:**

```json
{
  "hours": 48,
  "limit": 500
}
```

### get_batch_results

Get results for a specific evaluation batch.

**Parameters:**

- `batchId` (string, required): The batch ID to get results for

**Example:**

```json
{
  "batchId": "batch-abc123"
}
```

### get_job_queue_status

Get current job queue status and statistics.

**Parameters:**

- `includeDetails` (boolean, optional): Include detailed job information (default: false)

**Example:**

```json
{
  "includeDetails": true
}
```

## Write Operations (Requires API Key)

To use these operations, you must configure an API key in your MCP server environment variables.

### create_agent_version

Create a new version of an existing agent.

**Parameters:**

- `agentId` (string, required): ID of the agent to update
- `name` (string, required): Name of the agent
- `purpose` (string, required): Type/purpose of the agent (ASSESSOR, ADVISOR, ENRICHER, EXPLAINER)
- `description` (string, required): Description of what the agent does
- `primaryInstructions` (string, required): Primary instructions for the agent
- `selfCritiqueInstructions` (string, optional): Self-critique instructions
- `providesGrades` (boolean, optional): Whether the agent provides grades (default: false)
- `extendedCapabilityId` (string, optional): Extended capability ID
- `readme` (string, optional): Readme/documentation for the agent

**Example:**

```json
{
  "agentId": "agent-123",
  "name": "Enhanced Safety Assessor",
  "purpose": "ASSESSOR",
  "description": "Evaluates AI safety aspects of research papers",
  "primaryInstructions": "Analyze the paper for potential safety concerns...",
  "selfCritiqueInstructions": "Review your analysis for completeness...",
  "providesGrades": true
}
```

### spawn_batch_jobs

Create a batch of evaluation jobs for an agent.

**Parameters:**

- `agentId` (string, required): ID of the agent to run evaluations for
- `name` (string, optional): Name for the batch
- `targetCount` (number, required): Number of evaluations to run (1-100)

**Example:**

```json
{
  "agentId": "agent-123",
  "name": "Weekly safety evaluation batch",
  "targetCount": 50
}
```

## Authentication Setup

For write operations, you need to:

1. Create an API key in the Open Annotate web interface
2. Add it to your MCP server configuration:

```json
{
  "mcpServers": {
    "open-annotate": {
      "env": {
        "DATABASE_URL": "your-database-url",
        "ROAST_MY_POST_MCP_USER_API_KEY": "oa_your-api-key-here"
      }
    }
  }
}
```

The API key provides the same permissions as your user account, so you can only modify agents you own.
