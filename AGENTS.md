# Evaluation Agents Data Structure

This project now uses JSON files to store agent data instead of TypeScript files. This makes the data more accessible for editing without needing to understand TypeScript syntax.

## Current Implementation

The agent data is stored in `.json` files in the `src/data/agents` directory. Each agent has its own file, and the agents are loaded and exported from the `index.ts` file in that directory.

## Agent Data Structure

Each agent file contains a JSON object that conforms to the `EvaluationAgent` interface defined in `src/types/evaluationAgents.ts`:

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

## Adding a New Agent

To add a new agent:

1. Create a new `.json` file in the `src/data/agents` directory
2. Add the agent data to the file, following the structure of the existing agents
3. Update the `index.ts` file to import and export the new agent

## Future Enhancements

If you want to add support for JSON5 (which allows comments, trailing commas, etc.), you'll need to:

1. Install the json5-loader package:
   ```
   npm install --save-dev json5-loader
   ```

2. Update the Next.js config to handle JSON5 files:
   ```javascript
   // next.config.js
   const nextConfig = {
     webpack: (config) => {
       // Existing config...
       
       // Add rule for JSON5 files
       config.module.rules.push({
         test: /\.json5$/,
         type: 'json',
         use: [
           {
             loader: 'json5-loader',
             options: {},
           },
         ],
       });
       
       return config;
     },
   };
   ```

3. Change the file extensions from `.json` to `.json5`
4. Update the imports in `index.ts` accordingly