# Extract Forecasting Claims Tool

A specialized AI tool for extracting and analyzing forecasting claims from text. Identifies predictions, evaluates their quality, and provides detailed scoring across multiple dimensions.

## Overview

The Extract Forecasting Claims tool:

1. **Identifies Predictions** - Extracts forecasting statements from text
2. **Clarifies Intent** - Rewrites vague predictions for better precision
3. **Scores Quality** - Evaluates predictions across four key dimensions
4. **Extracts Metadata** - Identifies probabilities, dates, and other key information
5. **Rates Verifiability** - Assesses how easily predictions can be verified

## Key Features

- **Multi-dimensional Scoring**: Precision, verifiability, importance, and robustness scores
- **Prediction Clarification**: Rewrites vague predictions for better understanding
- **Metadata Extraction**: Pulls out resolution dates and probability estimates
- **Quality Assessment**: Comprehensive evaluation of prediction quality
- **Batch Processing**: Handles multiple predictions in a single text input

## Scoring Dimensions

### Precision Score (0-100)
- Measures how specific and well-defined the prediction is
- Higher scores for predictions with clear timeframes, specific outcomes, and measurable criteria
- Example: "Tesla stock will reach $300 by December 2025" (high precision) vs "Tesla will do well" (low precision)

### Verifiability Score (0-100)
- Assesses how easily the prediction can be verified when resolved
- Higher scores for predictions with objective, measurable outcomes
- Example: "Unemployment will be below 4% in Q1 2025" (high verifiability) vs "People will be happier" (low verifiability)

### Importance Score (0-100)
- Evaluates the significance and impact of the prediction
- Higher scores for predictions affecting many people or important decisions
- Example: "Global GDP will grow by 3% in 2025" (high importance) vs "My local café will add a new menu item" (low importance)

### Robustness Score (0-100)
- Measures how well-supported and reasonable the prediction appears
- Higher scores for predictions with clear reasoning or supporting evidence
- Example: Predictions based on trends, data, or expert analysis score higher

## Score Interpretation

- **70-100**: Excellent quality prediction
- **40-69**: Moderate quality, may need refinement
- **0-39**: Poor quality, significant issues present

## Use Cases

### Research Analysis
```
Extract and evaluate predictions from research papers, reports, or forecasting documents.
```

### Content Review
```
Assess the quality of predictions in articles, blog posts, or expert commentary.
```

### Forecast Tracking
```
Identify predictions that are worth tracking and following up on for accuracy.
```

### Decision Support
```
Evaluate the quality of predictions used in strategic planning or decision-making.
```

## Best Practices

1. **Clear Text Input**: Provide text with well-structured sentences containing predictions
2. **Review Clarifications**: Check rewritten predictions to ensure they capture the original intent
3. **Consider Context**: Scores should be interpreted within the domain and context of the prediction
4. **Track High-Quality Predictions**: Focus follow-up efforts on predictions with high scores
5. **Validate Extracted Metadata**: Verify that dates and probabilities are correctly extracted

## Integration Workflow

This tool works well with:
1. **Perplexity Research Tool** - Research background information for predictions
2. **Fact Checker Tool** - Verify assumptions underlying the predictions
3. **Document Analysis Tools** - Process longer documents containing multiple predictions

## Limitations

- May miss implicit or very subtle predictions
- Scoring is based on text analysis, not domain expertise
- Cannot verify the accuracy of the predictions themselves
- May struggle with highly technical or domain-specific predictions
- Effectiveness varies with writing style and prediction complexity