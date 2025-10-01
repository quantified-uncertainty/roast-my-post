# Fact Checker

Verify the accuracy of specific factual claims

## Tools Used

- **[Perplexity Research](/api/tools/perplexity-research)** - Web-enhanced research using Perplexity Sonar models via OpenRouter

## How It Works

Uses Perplexity Research to gather current information and sources, then analyzes specific claims for accuracy and truthfulness. Returns structured verdicts (true, false, partially-true, unverifiable, or outdated) with detailed reasoning and supporting evidence.

## Capabilities & Limitations

**Strengths:** Evidence-based verification with source citations. Provides nuanced verdicts beyond simple true/false. Suggests corrections for false claims. Includes confidence levels for reliability assessment.

**Limitations:** Effectiveness depends on claim specificity and available evidence sources. Cannot verify highly specialized or very recent claims.

## Integration

Works with **Extract Factual Claims** tool:
1. Extract claims from documents
2. Prioritize high-importance claims
3. Verify selected claims for accuracy
4. Generate comprehensive fact-check reports

## Technical Details

- Uses Perplexity Research tool for web-enhanced information gathering
- Provides structured verdict types: true, false, partially-true, unverifiable, outdated
- Includes confidence scoring and correction suggestions
- Best used for high-priority or controversial claims
