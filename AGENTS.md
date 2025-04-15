# Evaluation Agents Data Structure

This project uses JSON to store agent data. JSON is a standard data format that is widely supported and easy to work with.

## Current Implementation

The agent data is stored in two ways:

1. As `.json` files in the `src/data/agents` directory (for reference and editing)
2. As TypeScript files (`.ts`) that contain the agent data as objects

The agents are loaded and exported from the `index.ts` file in the `src/data/agents` directory.

## Agent Data Structure

Each agent file conforms to the `EvaluationAgent` interface defined in `src/types/evaluationAgents.ts`:

```typescript
export interface EvaluationAgent {
  id: string;
  name: string;
  version: string;
  description: string;
  iconName: string;
  capabilities: string[];
  use_cases: string[];
  limitations: string[];
}
```

JSON example:

```json
{
  "id": "example-agent",
  "name": "Example Agent",
  "version": "1.0",
  "description": "This is an example agent that does cool things.",
  "iconName": "StarIcon",
  "capabilities": ["Capability 1", "Capability 2", "Capability 3"],
  "use_cases": ["Use case 1", "Use case 2", "Use case 3"],
  "limitations": ["Limitation 1", "Limitation 2", "Limitation 3"]
}
```

## Adding a New Agent

To add a new agent:

1. Create a new `.json` file in the `src/data/agents` directory (e.g., `new-agent.json`)
2. Add the agent data to the file, following the structure of the existing agents
3. Create a new TypeScript file (e.g., `new-agent.ts`):

   ```typescript
   import type { EvaluationAgent } from "../../types/evaluationAgents";

   export const newAgent: EvaluationAgent = {
     id: "new-agent",
     name: "New Agent",
     // ... rest of the agent data
   };
   ```

4. Update the `index.ts` file to import and export the new agent:
   ```typescript
   import { newAgent } from './new-agent';
   export { newAgent };
   export const evaluationAgents = [..., newAgent];
   ```
