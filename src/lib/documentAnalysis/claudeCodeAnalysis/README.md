# Claude Code Analysis Integration

This module integrates the Claude Code SDK to provide multi-turn, agent-based document analysis with budget tracking.

## Features

- **Multi-turn conversations**: Uses Claude Code SDK for iterative analysis
- **Budget tracking**: Monitors costs and stops when budget is exceeded
- **Flexible prompting**: Converts agent instructions into Claude Code prompts
- **Comment extraction**: Parses structured feedback from the conversation
- **Cost optimization**: Uses Sonnet 4 model for cost-effective analysis

## Usage

To enable Claude Code for an agent, add these properties when calling `analyzeDocument`:

```typescript
const agent = {
  // ... existing agent properties
  useClaudeCode: true,
  claudeCodeBudget: 0.06, // Budget in dollars
};
```

## Configuration

- **Default budget**: $0.06 per evaluation
- **Max turns**: 10 (configurable)
- **Model**: Claude Sonnet 4 ($3/$15 per million tokens)

## Files

- `index.ts` - Main Claude Code integration logic
- `budgetTracker.ts` - Tracks token usage and costs
- `prompts.ts` - Converts agent instructions to prompts
- `outputParser.ts` - Extracts structured data from conversations
- `types.ts` - TypeScript interfaces

## Testing

Run the test script:

```bash
npm run test:claude-code
```

## Cost Analysis

With Sonnet 4 pricing:
- Average cost per evaluation: ~$0.005-0.01
- 10-20x cheaper than Opus 4
- Similar quality for document analysis tasks