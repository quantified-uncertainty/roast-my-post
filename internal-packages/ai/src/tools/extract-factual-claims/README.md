# Extract Factual Claims Tool

An AI-powered tool for extracting and categorizing factual claims from text. Identifies verifiable statements and classifies them by type with confidence scores.

## Overview

The Extract Factual Claims tool uses advanced AI to:

1. **Identify Claims** - Extracts factual statements from text
2. **Classify Types** - Categorizes claims as factual, statistical, historical, scientific, or other
3. **Assess Verifiability** - Determines if claims can be verified through external sources
4. **Rate Confidence** - Provides confidence scores for each extracted claim
5. **Provide Context** - Includes contextual information where relevant

## Key Features

- **Multi-type Classification**: Factual, statistical, historical, scientific, and other claim types
- **Verifiability Assessment**: Indicates whether claims can be independently verified
- **Confidence Scoring**: Percentage confidence for extraction accuracy
- **Contextual Information**: Additional context for better understanding
- **Batch Processing**: Handles multiple claims in a single text input
- **Performance Metrics**: Processing time and claim count statistics

## Claim Types

### Factual Claims
- General factual statements about events, people, or things
- Example: "The capital of France is Paris"

### Statistical Claims
- Numerical data, percentages, measurements, or statistics
- Example: "The unemployment rate increased by 2.3% in 2023"

### Historical Claims
- Statements about past events, dates, or historical facts
- Example: "World War II ended in 1945"

### Scientific Claims
- Scientific facts, research findings, or technical information
- Example: "Water boils at 100°C at sea level"

### Other Claims
- Claims that don't fit into the above categories
- May include subjective or opinion-based statements incorrectly identified as factual

## Verifiability Assessment

### Verifiable Claims
- Can be checked against reliable external sources
- Typically include specific facts, dates, numbers, or well-documented events
- Suitable for fact-checking processes

### Non-Verifiable Claims
- Cannot be easily verified through standard sources
- May include opinions, predictions, or subjective statements
- Require careful evaluation before use in research

## Best Practices

1. **Review All Claims**: AI extraction may miss subtle nuances or context
2. **Verify Important Claims**: Always fact-check extracted claims through reliable sources
3. **Consider Context**: Understand the broader context in which claims are made
4. **Check Confidence Scores**: Higher confidence indicates more reliable extraction
5. **Validate Classification**: Ensure claim types are correctly categorized

## Use Cases

### Research Analysis
```
Extract factual claims from research papers, articles, or reports for analysis.
```

### Content Verification
```
Identify claims in articles or documents that need fact-checking.
```

### Information Organization
```
Systematically organize factual information from large text documents.
```

### Quality Assurance
```
Review content to ensure all factual claims are properly supported.
```

## Integration Workflow

This tool works well in combination with:
1. **Fact Checker Tool** - Verify extracted claims for accuracy
2. **Perplexity Research Tool** - Find additional sources for claim verification
3. **Link Validator Tool** - Check sources and references mentioned in claims

## Limitations

- May extract opinion statements as factual claims in some cases
- Effectiveness varies with text complexity and domain specificity
- Cannot verify the accuracy of extracted claims (only identifies them)
- May miss implicit or contextually dependent claims
- Performance may vary with different writing styles and formats

## Example Output

For the input "The Eiffel Tower is 324 meters tall and was completed in 1889":

- **Claim 1**: "The Eiffel Tower is 324 meters tall"
  - Type: Statistical
  - Verifiable: Yes
  - Confidence: 95%

- **Claim 2**: "The Eiffel Tower was completed in 1889"
  - Type: Historical
  - Verifiable: Yes
  - Confidence: 98%