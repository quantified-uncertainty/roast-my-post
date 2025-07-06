# Multi-Turn Document Analysis

This module implements a proper multi-turn conversation approach for document analysis using the standard Anthropic SDK, as recommended in our lessons learned from the Claude Code experiment.

## Key Features

- **True multi-turn conversations**: Full control over conversation flow
- **Progressive analysis**: Builds insights over multiple turns
- **Budget management**: Reuses the proven budget tracking system
- **Flexible prompting**: Custom continuation prompts for each turn
- **Comment extraction**: Improved pattern matching for quotes and feedback

## Architecture

```typescript
for (let turn = 0; turn < maxTurns; turn++) {
  // Make API call with full conversation history
  const response = await anthropic.messages.create({
    model: "claude-4-sonnet-20250514",
    messages: conversationHistory,
  });
  
  // Process response based on turn number
  // Add continuation prompt for next turn
}
```

## Usage

```typescript
const result = await analyzeWithMultiTurn(document, agent, {
  budget: 0.06,      // Max cost in dollars
  maxTurns: 5,       // Number of conversation turns
  temperature: 0.7,  // Model temperature
  verbose: true      // Enable logging
});
```

## Turn Structure

1. **Turn 1**: Initial analysis and document overview
2. **Turn 2**: Identify key arguments and evidence
3. **Turn 3**: Examine logical structure and weaknesses
4. **Turn 4**: Generate specific comments with quotes
5. **Turn 5**: Final synthesis, grading, and additional comments

## Advantages Over Claude Code SDK

- **Predictable behavior**: No unexpected task completion
- **Full conversation control**: We manage the flow
- **Better for analysis**: Designed for extended reasoning
- **Simpler implementation**: Direct API usage
- **Cost-effective**: Same pricing, better results

## Testing

Run the test script:
```bash
npm run test:multi-turn
```