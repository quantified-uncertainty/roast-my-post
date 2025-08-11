# Fact Checker

Verifies individual factual claims using Claude's knowledge base, with optional real-time web research through Perplexity integration.

## How It Works

Takes a specific claim and verifies it against Claude's training data. Optionally searches for evidence using Perplexity Research tool to get current information with sources. Returns structured verdict (true/false/uncertain/unverifiable) with confidence scores, explanations, and supporting evidence when available.

## Capabilities & Limitations

**Strengths:** Optional web search for current information beyond training cutoff. Returns confidence scores (0-100) with detailed explanations. Identifies claims needing current data. Provides research notes and sources when evidence search is enabled. Includes today's date context for time-sensitive claims.

**Limitations:** Without web search, limited to Claude's training cutoff. Individual claim verification only - not designed for bulk analysis. Web search adds cost and latency. Cannot access paywalled or restricted sources. Costs ~$0.01-0.02 per claim (more with web search).

## Technical Details

- **Verdicts:** true, false, uncertain, unverifiable
- **Optional features:** searchForEvidence flag triggers Perplexity research
- **Research:** Up to 8 sources fetched when enabled
- **Caching:** Uses cache seeds for consistent responses
- **Location:** Implementation in `/internal-packages/ai/src/tools/fact-checker/`