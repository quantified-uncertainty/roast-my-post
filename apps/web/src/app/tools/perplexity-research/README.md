# Perplexity Research

Web-enhanced research tool using Perplexity's Sonar models through OpenRouter API. Provides real-time web search with structured extraction of sources and findings.

## How It Works

Sends queries to Perplexity Sonar models via OpenRouter, which combine web search with LLM capabilities. Attempts structured research first to extract sources, key findings, and summaries. Falls back to basic query mode if structured extraction fails. Can optionally generate forecasting-specific context with base rates and historical data.

## Capabilities & Limitations

**Strengths:** Access to real-time web information beyond training cutoffs. Returns sources with titles, URLs, and snippets. Extracts key findings as bullet points. Very low cost through OpenRouter. Supports different focus areas (general, academic, news, technical, market).

**Limitations:** Requires OPENROUTER_API_KEY environment variable. Quality depends on Perplexity's search coverage. May not find highly specialized or recent information. Structured extraction can fail, triggering fallback mode with reduced functionality.

## Technical Details

- **Models:** perplexity/sonar-small-online or sonar-medium-online via OpenRouter
- **Cost:** ~$0.001-0.005 per query
- **Focus areas:** general, academic, news, technical, market
- **Output:** Summary, sources (up to 10), key findings, optional forecasting context
- **Location:** Implementation in `/internal-packages/ai/src/tools/perplexity-research/`