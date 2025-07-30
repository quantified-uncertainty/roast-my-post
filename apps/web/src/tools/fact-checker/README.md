# Fact Checker Tool

The fact-checker tool is designed to verify the accuracy of specific factual claims. It works in tandem with the extract-factual-claims tool to provide a complete fact-checking pipeline.

## How it Works

This tool takes a specific claim and verifies its accuracy by:

1. Analyzing the claim for accuracy
2. Providing a verdict (true, false, partially-true, unverifiable, outdated)
3. Explaining the reasoning with evidence
4. Suggesting corrections if needed

## Separation of Concerns

Similar to the forecasting system, fact-checking is split into two tools:

- **extract-factual-claims**: Finds and scores factual claims in documents
- **fact-checker**: Verifies the accuracy of specific claims

This separation allows:
- Better performance through parallel processing
- Cleaner interfaces and testing
- Flexibility to use either tool independently
- Cost optimization by only verifying high-priority claims

## Example Usage

```typescript
const result = await factCheckerTool.execute({
  claim: "The Great Wall of China is visible from space",
  context: "Common misconception about landmarks"
});

// Result includes:
// - verdict: 'false'
// - confidence: 'high'
// - explanation: "This is a common myth. The Great Wall is not visible..."
// - evidence: ["NASA has confirmed...", "Astronauts have stated..."]
// - corrections: "The Great Wall is not visible from space without aid"
```

## Integration with FactCheckAnalyzerJob

The FactCheckAnalyzerJob orchestrates both tools:

1. Extracts claims using extract-factual-claims
2. Scores and filters claims based on importance, controversiality, and verifiability
3. Verifies high-priority claims using fact-checker
4. Generates comments combining extraction scores and verification results