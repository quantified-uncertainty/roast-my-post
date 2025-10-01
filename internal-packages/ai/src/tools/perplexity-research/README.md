# Perplexity Research

Web-enhanced research using Perplexity Sonar models via OpenRouter

## How It Works

Uses Perplexity's Sonar models via OpenRouter to perform web-enhanced research. Searches current information beyond AI training data and returns structured results with summaries, key findings, and source citations (3-10 sources with titles, URLs, snippets). Includes fallback mechanisms for reliability.

## Capabilities & Limitations

**Strengths:** Access to current web information with source citations. Multiple focus areas (general, academic, news, technical, market) for domain-specific optimization. Structured output with summaries and key findings. Fallback mechanisms for reliability. Optional forecasting context for prediction tasks.

**Limitations:** Depends on Perplexity API and OpenRouter availability. Quality varies by query complexity and available sources. Cannot access paywalled or restricted content.

## Technical Details

- Uses Perplexity Sonar models via OpenRouter API
- Configurable focus areas: general, academic, news, technical, market
- Returns 3-10 sources per query (configurable)
- Fallback: structured research → basic query with parsing
- Primary use: Supporting fact-checking and forecasting tools
