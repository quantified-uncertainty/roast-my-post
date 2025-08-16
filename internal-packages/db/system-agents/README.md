# System Agents

This directory contains the definitions and synchronization logic for system-managed agents that are consistent across all environments.

## Overview

System agents are pre-defined evaluation agents that:
- Are managed by code rather than user-created
- Maintain consistency across development, staging, and production
- Are versioned and tracked in source control
- Cannot be modified by regular users

## Available System Agents

1. **Spelling & Grammar Checker** (`system-spelling-grammar`)
   - Advanced proofreading with US/UK convention support
   - Provides importance and confidence scores for errors
   - Configurable strictness levels

2. **Mathematical Accuracy Checker** (`system-math-checker`)
   - Verifies calculations, formulas, and mathematical reasoning
   - Checks unit consistency and dimensional analysis
   - Validates statistical claims

3. **Factual Accuracy Verifier** (`system-fact-checker`)
   - Verifies factual claims against current knowledge
   - Provides detailed verdicts with evidence
   - Suggests corrections for inaccurate claims

## Usage

### Synchronizing Agents

To sync system agents to your database:

```bash
# From the db package directory
pnpm run sync:agents

# From the project root
pnpm --filter @roast/db run sync:agents
```

This will:
1. Create a system admin user if it doesn't exist
2. Create or update each system agent
3. Version changes automatically
4. Skip non-system-managed agents with the same ID

### Adding New System Agents

1. Create a new agent definition file in `agents/`:
   ```typescript
   // agents/my-agent.ts
   import { SystemAgentDefinition } from '../types';
   
   export const myAgent: SystemAgentDefinition = {
     id: 'system-my-agent',
     name: 'My Agent',
     description: 'Description',
     providesGrades: true,
     readme: '# Documentation...',
     primaryInstructions: 'Instructions...',
     selfCritiqueInstructions: 'Critique instructions...'
   };
   ```

2. Export it from `agents/index.ts`:
   ```typescript
   import { myAgent } from './my-agent';
   
   export const systemAgents: SystemAgentDefinition[] = [
     // ... existing agents
     myAgent,
   ];
   ```

3. Run the sync command to add it to the database

## Database Schema

System agents use a special field in the Agent model:
- `isSystemManaged: Boolean` - Indicates the agent is code-managed

When syncing:
- New agents are created with `isSystemManaged: true`
- Existing system agents are updated with new versions
- Non-system agents with matching IDs are skipped

## Development Workflow

1. **Initial Setup**: Run `pnpm run sync:agents` after database setup
2. **Agent Updates**: Modify agent definitions and run sync again
3. **Version Control**: All changes are tracked through agent versions
4. **Production Deploy**: Run sync as part of deployment process

## Important Notes

- System agents always use the `system-admin` user as the owner
- Agent IDs should be prefixed with `system-` for clarity
- Changes to agent definitions create new versions automatically
- The sync process is idempotent - safe to run multiple times