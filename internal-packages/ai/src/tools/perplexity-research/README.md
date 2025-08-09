# Perplexity Research Tool

A research assistant tool that uses the Perplexity API to search for up-to-date information on any topic. Perfect for gathering context, finding recent developments, and collecting sources for analysis and forecasting tasks.

## Overview

The Perplexity Research Tool leverages Perplexity AI's search capabilities to:

1. **Search across the web** - Accesses current information from multiple sources
2. **Summarize findings** - Provides concise summaries of research results  
3. **Categorize sources** - Ranks sources by relevance (high/medium/low)
4. **Extract key findings** - Highlights the most important insights
5. **Support focus areas** - Tailors searches to specific domains (academic, news, technical, etc.)

## Key Features

- **Real-time search**: Accesses current information, not limited to training data
- **Source categorization**: Automatically ranks sources by relevance
- **Configurable results**: Control number of sources (3-10)
- **Focus area targeting**: Optimize searches for different domains
- **Key findings extraction**: Automatically identifies important insights
- **Source metadata**: Full URLs, titles, and snippets for verification

## Usage

### Basic Research Query

```typescript
import { perplexityResearchTool } from '@roast/ai';

const result = await perplexityResearchTool.execute({
  query: "What are the latest developments in quantum computing error correction?",
  maxSources: 5,
  focusArea: "academic"
});
```

### Focus Areas

- **`general`** - Broad web search across all sources
- **`academic`** - Prioritize scholarly articles and research papers
- **`news`** - Focus on recent news and current events
- **`technical`** - Emphasize technical documentation and specifications
- **`market`** - Target financial and market information

### Response Format

```typescript
interface ResearchResult {
  query: string;
  summary: string;
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
    relevance: 'high' | 'medium' | 'low';
  }>;
  keyFindings: string[];
  timestamp: string;
}
```

## Integration with Analysis Workflows

This tool is particularly valuable for:

### Forecasting Tasks
- Gather recent developments on prediction topics
- Find expert opinions and analysis
- Collect baseline facts for probability assessments

### Fact-Checking
- Verify claims against current sources
- Find supporting or contradicting evidence
- Access recent updates to evolving topics

### Context Building
- Research background information for document analysis
- Find related developments and trends
- Gather expert perspectives

## Example Queries

### Technology Research
```
"Latest breakthroughs in large language model efficiency improvements"
```

### Market Analysis
```  
"Current trends in renewable energy investment and policy changes 2024"
```

### Scientific Updates
```
"Recent advances in CRISPR gene editing safety and regulations"
```

## Cost and Performance

- **Response time**: 2-5 seconds depending on query complexity
- **Source diversity**: Typically returns 5-10 high-quality sources
- **Update frequency**: Accesses information updated within hours or days
- **Rate limits**: Managed automatically with backoff strategies

## Best Practices

1. **Be specific**: More specific queries yield better, more relevant results
2. **Use focus areas**: Choose the appropriate focus area for your research domain
3. **Verify sources**: Always check the provided URLs for full context
4. **Combine with other tools**: Use results to inform fact-checking or forecasting analyses
5. **Track timestamps**: Note when research was conducted for time-sensitive topics

## Limitations

- Dependent on Perplexity API availability and rate limits
- Results quality varies with query specificity
- May not access paywalled or restricted content
- Focus areas are suggestions, not strict filters