<!-- Created: 2025-06-22 11:34:57 -->
# 2025-06-22 Background Agent Automation

## Concept
A powerful background agent that can perform complex operations on the Open Annotate system through natural language requests. This would act as an intelligent assistant for managing agents, evaluations, and improvement cycles.

## Architecture Options

### Option 1: MCP Server Integration
Use Claude Code with a custom MCP (Model Context Protocol) server that exposes Open Annotate operations as tools.

```typescript
// MCP server tools
{
  "tools": {
    "listAgents": {
      "description": "List all agents with their versions and recent performance"
    },
    "runBatchEvaluation": {
      "description": "Start a batch evaluation for an agent",
      "parameters": ["agentId", "documentCount", "documentFilter"]
    },
    "readBatchResults": {
      "description": "Get summary and detailed results from a batch",
      "parameters": ["batchId"]
    },
    "editAgentInstructions": {
      "description": "Modify agent instructions and create new version",
      "parameters": ["agentId", "changes"]
    },
    "compareAgentVersions": {
      "description": "Compare performance between agent versions",
      "parameters": ["agentId", "version1", "version2"]
    },
    "analyzeFailures": {
      "description": "Analyze failed evaluations and suggest fixes",
      "parameters": ["agentId", "batchId"]
    }
  }
}
```

### Option 2: API-Based Agent
A dedicated service that exposes these operations via API, callable by any LLM with function calling.

### Option 3: In-App Agent
Built directly into the app with a chat interface in the UI.

## Example Workflows

### 1. Agent Improvement Loop
```
User: "Improve the Research Assistant agent based on its last batch"

Agent:
1. Let me check the recent performance...
   [readBatchResults batchId="xyz"]
2. I see 15 evaluations with average grade 72. Main issues:
   - Inconsistent grading (std dev 18)
   - Missing important critiques in 3 documents
   - Overly verbose summaries
3. Analyzing the failed cases...
   [analyzeFailures agentId="research-assistant" batchId="xyz"]
4. I'll update the instructions to address these issues...
   [editAgentInstructions with specific changes]
5. Created version 8. Running a test batch...
   [runBatchEvaluation agentId="research-assistant" count=5]
6. Initial results look better (avg grade 79). Want me to run a full batch?
```

### 2. Cross-Agent Analysis
```
User: "Which agents are performing poorly on technical documents?"

Agent:
1. Analyzing all agents...
   [listAgents]
   [multiple readBatchResults calls]
2. Found 3 agents with <70% scores on technical content:
   - Code Reviewer (avg 65%)
   - Technical Editor (avg 68%)
   - Research Assistant (avg 69% on technical only)
3. Common pattern: They lack specific technical terminology instructions
4. Would you like me to update them with better technical guidance?
```

### 3. Automated A/B Testing
```
User: "A/B test making the Safety Reviewer stricter"

Agent:
1. Current Safety Reviewer is at version 5
2. Creating version 6 with stricter criteria...
   [editAgentInstructions - adding stricter thresholds]
3. Running parallel batches:
   - Batch A: 20 docs with v5
   - Batch B: 20 docs with v6
   [runBatchEvaluation x2]
4. Results after 30 minutes:
   - v5: avg grade 82, 3.2 issues per doc
   - v6: avg grade 71, 5.8 issues per doc
5. v6 is indeed stricter. False positive rate increased by 15%.
   Recommend tuning down severity on minor issues.
```

## Implementation with MCP

### 1. MCP Server Setup
```typescript
// mcp-server/src/tools/openAnnotate.ts
export const tools = {
  async runBatchEvaluation({ agentId, count }) {
    const response = await fetch(`${API_URL}/api/agents/${agentId}/batch`, {
      method: 'POST',
      body: JSON.stringify({ targetCount: count })
    });
    return response.json();
  },
  
  async editAgentInstructions({ agentId, changes }) {
    // Fetch current agent
    const agent = await getAgent(agentId);
    
    // Apply changes
    const newInstructions = applyInstructionChanges(
      agent.instructions,
      changes
    );
    
    // Create new version
    return createAgentVersion(agentId, newInstructions);
  }
};
```

### 2. Claude Code Configuration
```json
{
  "mcpServers": {
    "open-annotate": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js"],
      "env": {
        "OPEN_ANNOTATE_API_URL": "http://localhost:3000",
        "API_KEY": "..."
      }
    }
  }
}
```

## Advanced Capabilities

### 1. Proactive Monitoring
- Watch for performance degradation
- Alert on unusual patterns
- Suggest improvements based on trends

### 2. Batch Orchestration
- Run complex evaluation sequences
- Coordinate multi-agent evaluations
- Manage resource usage

### 3. Learning from History
- Track which instruction changes work
- Build a knowledge base of effective patterns
- Suggest improvements based on past successes

### 4. Natural Language Querying
```
"Show me all agents that gave grades above 90 for documents about AI safety"
"Which comments from the Ethics Reviewer were most helpful?"
"Find patterns in failed evaluations from last week"
```

## Benefits

1. **Power User Efficiency**: Complex operations via simple commands
2. **Experimentation Speed**: Rapid iteration on agent improvements
3. **Pattern Recognition**: AI can spot trends humans might miss
4. **Automation**: Set up recurring improvement cycles
5. **Accessibility**: Non-technical users can perform complex operations

## Security Considerations

1. **Authentication**: MCP server needs secure auth
2. **Rate Limiting**: Prevent runaway batch jobs
3. **Audit Trail**: Log all agent actions
4. **Permissions**: Limit which operations are exposed
5. **Sandboxing**: Ensure agent can't modify critical settings

## MVP Implementation

Start with 5 core tools:
1. `runBatch` - Start evaluation batch
2. `readResults` - Get batch summary
3. `editAgent` - Modify instructions
4. `compareVersions` - Show performance diff
5. `exportData` - Get full evaluation data

This would cover 80% of the manual workflow automation needs while being simple to implement and test.