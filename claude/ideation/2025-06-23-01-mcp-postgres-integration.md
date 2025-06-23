<!-- Created: 2025-06-23 -->
# MCP PostgreSQL Integration for Faster Database Access

## Problem Statement
Currently, interacting with the PostgreSQL database through Claude Code requires writing individual TypeScript scripts for each operation. This process is slow and repetitive:
1. Claude Code writes a new script file
2. Handles imports and type definitions
3. Saves the file
4. Executes it with `npx tsx`

This workflow creates significant friction when performing database analysis or operations.

## Solution: MCP (Model Context Protocol) Server

MCP provides a standardized way for AI assistants to interact with external tools and data sources. By implementing an MCP server for PostgreSQL access, we can eliminate the script-writing overhead and enable direct, natural language database interactions.

## Implementation Options

### Option 1: Use Existing PostgreSQL MCP Servers

#### A. Official PostgreSQL MCP Server
```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://localhost/open_annotate"
      ]
    }
  }
}
```
- **Pros**: Simple setup, official support
- **Cons**: Read-only access, limited functionality

#### B. Postgres MCP Pro (CrystalDBA)
```json
{
  "mcpServers": {
    "postgres": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "DATABASE_URI",
        "crystaldba/postgres-mcp",
        "--access-mode=unrestricted"
      ],
      "env": {
        "DATABASE_URI": "postgresql://user:pass@localhost:5432/open_annotate"
      }
    }
  }
}
```
- **Pros**: Full read/write access, performance analysis, index tuning
- **Cons**: Generic tool, not tailored to Open Annotate needs

### Option 2: Custom MCP Server for Open Annotate

Build a specialized MCP server that understands the Open Annotate domain and provides optimized tools for common operations.

#### Architecture
```typescript
// mcp-server/src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const server = new Server({
  name: "open-annotate-mcp",
  version: "1.0.0"
});

// Register specialized tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "analyze_agent_performance",
      description: "Get performance metrics for an agent",
      inputSchema: {
        type: "object",
        properties: {
          agentId: { type: "string", description: "Agent ID" },
          days: { type: "number", description: "Days to look back" }
        }
      }
    },
    {
      name: "find_failed_evaluations",
      description: "Find recent failed evaluations with error details",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max results" },
          agentId: { type: "string", description: "Filter by agent" }
        }
      }
    },
    {
      name: "get_evaluation_stats",
      description: "Get aggregate statistics for evaluations",
      inputSchema: {
        type: "object",
        properties: {
          groupBy: { 
            type: "string", 
            enum: ["agent", "document", "day"],
            description: "Grouping dimension" 
          }
        }
      }
    },
    {
      name: "update_agent_instructions",
      description: "Update agent instructions via API",
      inputSchema: {
        type: "object",
        properties: {
          agentId: { type: "string" },
          instructions: { type: "object" }
        },
        required: ["agentId", "instructions"]
      }
    }
  ]
}));

// Implement tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case "analyze_agent_performance":
      const stats = await prisma.$queryRaw`
        SELECT 
          av.version,
          COUNT(ev.id) as eval_count,
          AVG(ev.grade) as avg_grade,
          STDDEV(ev.grade) as grade_stddev,
          COUNT(CASE WHEN j.status = 'FAILED' THEN 1 END) as failures
        FROM agent_versions av
        JOIN evaluation_versions ev ON ev.agent_version_id = av.id
        JOIN jobs j ON j.evaluation_version_id = ev.id
        WHERE av.agent_id = ${args.agentId}
          AND ev.created_at > NOW() - INTERVAL '${args.days} days'
        GROUP BY av.version
        ORDER BY av.version DESC
      `;
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(stats, null, 2)
        }]
      };
      
    case "update_agent_instructions":
      // Use API for writes to maintain consistency
      const response = await fetch(
        `http://localhost:3000/api/agents/${args.agentId}/versions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args.instructions)
        }
      );
      
      return {
        content: [{
          type: "text",
          text: await response.text()
        }]
      };
      
    // ... other tool implementations
  }
});
```

#### Configuration
```json
{
  "mcpServers": {
    "open-annotate": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}",
        "OPEN_ANNOTATE_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

## Benefits of MCP Approach

### Speed Improvements
- **Before**: 30-60 seconds to write and execute a script
- **After**: 2-5 seconds for direct query execution
- **10-20x faster** for database operations

### Workflow Improvements
1. **Natural language queries**: "Show me agents with high failure rates"
2. **Chained operations**: Analyze → Identify issues → Fix → Test
3. **Stateful sessions**: Maintain context across multiple queries
4. **Parallel execution**: Run multiple analyses simultaneously

### Example Interactions
```
User: "Which agents are failing most often?"

Claude (with MCP): 
[Instantly queries database]
Here are the agents with highest failure rates:
- research-scholar: 23% failure rate (18/78 evaluations)
- safety-reviewer: 19% failure rate (12/63 evaluations)
- technical-editor: 15% failure rate (9/60 evaluations)

User: "What's causing the research-scholar failures?"

Claude (with MCP):
[Analyzes error patterns]
The research-scholar failures are primarily due to:
1. Comment validation errors (72% of failures)
2. Timeout issues on long documents (18%)
3. Missing required fields (10%)
```

## Implementation Plan

### Phase 1: Quick Win (1 day)
1. Install Postgres MCP Pro
2. Configure in Claude Desktop
3. Test basic queries and operations
4. Document common query patterns

### Phase 2: Minimal Custom Server (4-8 hours)
1. Create basic MCP server project
2. Implement 3-5 most-used tools:
   - `getAgentStats`: Quick performance check
   - `findFailedJobs`: Debug evaluation failures  
   - `runQuery`: Direct SQL for flexibility
3. Start with read-only operations
4. Add more tools as needed

### Phase 2b: Expanded Custom Tools (Optional, 3-5 days)
1. Add write operations via API
2. Implement advanced tools:
   - Batch evaluation management
   - Cost tracking queries
   - Automated analysis reports
3. Add hybrid approach (DB reads + API writes)
4. Polish based on usage patterns

### Phase 3: Advanced Features (1 week)
1. Add streaming support for large result sets
2. Implement caching for frequent queries
3. Add visualization tools (generate charts/graphs)
4. Create preset query templates
5. Add safety controls and audit logging

## Technical Considerations

### Security
- Use read-only credentials for analysis queries
- Implement rate limiting
- Log all operations for audit trail
- Validate all inputs to prevent SQL injection

### Performance
- Connection pooling for multiple concurrent queries
- Query optimization hints
- Result caching for expensive aggregations
- Streaming for large result sets

### Maintenance
- Schema change detection and adaptation
- Version compatibility checks
- Health monitoring endpoints
- Automatic reconnection logic

## Alternative Approaches Considered

1. **Database GUI Tools** (TablePlus, DataGrip)
   - Pros: Immediate solution, powerful features
   - Cons: Context switching, manual operation

2. **REST API Layer**
   - Pros: Clean abstraction, reusable
   - Cons: Still requires endpoint creation for each operation

3. **Pre-built Query Library**
   - Pros: Type-safe, tested
   - Cons: Limited flexibility, still needs script execution

4. **Database REPL**
   - Pros: Interactive, fast
   - Cons: No AI integration, manual SQL writing

## Cost-Benefit Analysis

### Costs

#### Development Costs
- **Postgres MCP Pro Setup**: ~1-2 hours
  - Installing and configuring
  - Testing basic operations
  - Learning curve for MCP concepts

- **Minimal Custom MCP Server**: ~4-8 hours
  - Initial setup with TypeScript SDK: 1 hour
  - Implementing 3-5 essential tools: 2-4 hours
  - Basic testing: 1 hour
  - Iterative improvements: 1-2 hours

- **Full Custom MCP Server** (if needed later): ~20-40 hours
  - Complete architecture: 8 hours
  - Comprehensive tool suite: 16 hours
  - Extensive testing: 8 hours
  - Documentation: 4 hours

#### Operational Costs
- **Runtime overhead**: MCP server process (~50-100MB RAM)
- **Maintenance time**: ~2-4 hours/month for updates
- **Debugging complexity**: Harder to trace issues vs simple scripts
- **Claude API tokens**: Slightly more tokens used for tool descriptions

### Benefits

#### Time Savings
- **Current approach**: ~2 minutes per database operation
  - Write script: 45 seconds
  - Save and execute: 30 seconds
  - Parse results: 45 seconds

- **With MCP**: ~10 seconds per operation
  - Natural language query: 5 seconds
  - Execution and response: 5 seconds
  - **12x faster per operation**

#### Productivity Metrics
Assuming 20 database operations per day:
- **Daily time saved**: 30 minutes
- **Weekly time saved**: 2.5 hours
- **Monthly time saved**: 10 hours
- **Break-even point**: 2-4 weeks for basic setup, 2-3 months for custom server

#### Qualitative Benefits
1. **Reduced context switching**: Stay in conversation flow
2. **Lower cognitive load**: No need to remember Prisma syntax
3. **Faster experimentation**: Test hypotheses immediately
4. **Better analysis**: Can run exploratory queries easily
5. **Knowledge preservation**: Tools encode domain expertise

### ROI Calculation

#### Simple Setup (Postgres MCP Pro)
- **Investment**: 2 hours setup
- **Payback period**: 4 days
- **Monthly ROI**: 500% (10 hours saved vs 2 hours invested)

#### Minimal Custom MCP Server
- **Investment**: 4-8 hours development
- **Payback period**: 2-3 weeks
- **Monthly ROI**: 125-250% (10 hours saved vs 4-8 hours invested)
- **Key advantage**: Tailored to your exact workflow

#### Full Custom MCP Server (if needed)
- **Investment**: 40 hours development
- **Payback period**: 4 months
- **Annual ROI**: 300% (120 hours saved vs 40 hours invested)
- **Additional value**: Reusable by team members

### Risk Analysis

#### Low Risk
- **Postgres MCP Pro**: Minimal investment, immediate returns
- **Reversibility**: Can switch back to scripts anytime
- **Data safety**: Read-only mode available

#### Medium Risk
- **Dependency on MCP ecosystem**: Still evolving
- **Learning curve**: New mental model required
- **Integration complexity**: Custom server needs maintenance

#### Mitigation Strategies
1. Start with read-only access
2. Keep script-based backup methods
3. Implement comprehensive logging
4. Use version control for MCP server code

## Recommendation

Start with **Postgres MCP Pro** for immediate productivity gains while developing a **custom MCP server** tailored to Open Annotate's specific needs. This provides:

1. **Immediate value**: Start using natural language DB queries today
2. **Future flexibility**: Build specialized tools for your workflow
3. **Best of both worlds**: Generic SQL access + domain-specific operations
4. **Scalable approach**: Add tools incrementally as needs arise

The MCP approach transforms database interactions from a bottleneck into a seamless part of the AI-assisted development workflow, enabling faster iteration and more sophisticated analysis capabilities.

Given the strong ROI (500% monthly for basic setup) and low risk profile, implementing MCP for database access is highly recommended for power users who frequently interact with the database.