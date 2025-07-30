# Tools Architecture

This directory contains all tools available in the system, following a standardized architecture for consistency and maintainability.

## Structure

```
src/tools/
├── base/               # Base classes and utilities
│   ├── Tool.ts        # Abstract base class all tools extend
│   ├── types.ts       # Common types and error classes
│   └── createToolRoute.ts  # Factory for creating API routes
├── registry.ts        # Central tool registry
├── forecaster/        # Example tool implementation
│   ├── index.ts       # Tool implementation
│   ├── forecaster.test.ts  # Tests
│   └── README.md      # Tool documentation
└── README.md          # This file
```

## Creating a New Tool

1. Create a new directory under `/src/tools/` with your tool name
2. Create an `index.ts` file that exports a class extending `Tool`:

```typescript
import { z } from 'zod';
import { Tool } from '../base/Tool';

// Define your types
export interface MyToolInput {
  // ...
}

export interface MyToolOutput {
  // ...
}

// Define schemas
const inputSchema = z.object({
  // ...
}) satisfies z.ZodType<MyToolInput>;

const outputSchema = z.object({
  // ...
}) satisfies z.ZodType<MyToolOutput>;

// Implement your tool
export class MyTool extends Tool<MyToolInput, MyToolOutput> {
  config = {
    id: 'my-tool',
    name: 'My Tool',
    description: 'What this tool does',
    version: '1.0.0',
    category: 'analysis' as const,
    costEstimate: 'Optional cost estimate'
  };
  
  inputSchema = inputSchema;
  outputSchema = outputSchema;
  
  async execute(input: MyToolInput, context: ToolContext): Promise<MyToolOutput> {
    // Your implementation here
  }
}

// Export singleton instance
export default new MyTool();
```

3. Add tests in `<tool-name>.test.ts`
4. Add documentation in `README.md`
5. Register your tool in `/src/tools/registry.ts`:

```typescript
import MyTool from './my-tool';

constructor() {
  this.register(ForecasterTool);
  this.register(MyTool); // Add this line
}
```

6. Create an API route in `/src/app/api/tools/<tool-name>/route.ts`:

```typescript
import { createToolRoute } from '@/tools/base/createToolRoute';
import MyTool from '@/tools/my-tool';

export const POST = createToolRoute(MyTool);
```

## Tool Interface

All tools must implement:

- `config`: Tool metadata (id, name, description, version, category)
- `inputSchema`: Zod schema for input validation
- `outputSchema`: Zod schema for output validation
- `execute()`: Core logic that processes input and returns output

Optional hooks:
- `validateAccess()`: Custom access control
- `beforeExecute()`: Pre-processing logic
- `afterExecute()`: Post-processing logic

## Categories

Tools are organized into categories:
- `analysis`: Tools that analyze content (forecasting, fact-checking, etc.)
- `research`: Tools that gather external information
- `utility`: Helper tools for various tasks

## API Usage

All tools expose a standardized REST API:

```typescript
POST /api/tools/<tool-id>
Authorization: Bearer <token>
Content-Type: application/json

{
  // Tool-specific input based on inputSchema
}

Response:
{
  "success": true,
  "toolId": "tool-id",
  "result": {
    // Tool-specific output based on outputSchema
  }
}
```

## Tool Discovery

List all available tools:

```
GET /api/tools

Response:
{
  "tools": [
    {
      "id": "forecaster",
      "name": "Simple Forecaster",
      "description": "...",
      "version": "1.0.0",
      "category": "analysis",
      "costEstimate": "~$0.05 per forecast"
    },
    // ...
  ],
  "categories": {
    "analysis": 1,
    "research": 0,
    "utility": 0
  }
}
```