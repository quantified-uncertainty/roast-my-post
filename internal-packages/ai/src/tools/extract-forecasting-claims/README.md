# Extract Forecasting Claims

Extracts predictions and converts them to binary (YES/NO) questions. Scores on three dimensions: precision (how binary/specific), verifiability (can we check with public data), and importance (centrality to argument)

## What it does

- **Identifies Predictions**: Extracts forecasting statements from text automatically
- **Clarifies Vague Claims**: Rewrites unclear predictions for better precision
- **Scores Quality**: Evaluates across four dimensions (precision, verifiability, importance, robustness)
- **Extracts Metadata**: Identifies probabilities, dates, and resolution criteria
- **Assesses Verifiability**: Determines how easily predictions can be verified

## Scoring Dimensions (0-100)

**Precision**: How specific and well-defined the prediction is ("Tesla stock will reach $300 by Dec 2025" vs "Tesla will do well")
**Verifiability**: How easily the prediction can be verified ("Unemployment below 4%" vs "People will be happier")
**Importance**: Significance and impact of the prediction (global vs local effects)
**Robustness**: How well-supported the prediction appears (based on evidence/reasoning)

## Score Interpretation

- **70-100**: Excellent quality, worth tracking
- **40-69**: Moderate quality, may need refinement
- **0-39**: Poor quality, significant issues

## Use Cases

- **Research Analysis**: Evaluate predictions in papers and reports
- **Content Review**: Assess prediction quality in articles and commentary
- **Forecast Tracking**: Identify high-quality predictions worth monitoring
- **Decision Support**: Evaluate predictions used in strategic planning

## Integration

Works well with:

- **Perplexity Research Tool**: Research background for predictions
- **Fact Checker Tool**: Verify underlying assumptions
- **Document Analysis Tools**: Process longer documents with multiple predictions

## Important Notes

- Clarifies vague predictions to improve precision and trackability
- Scoring based on text analysis, not domain expertise
- Cannot verify prediction accuracy (only evaluates quality)
- Review clarified predictions to ensure original intent is preserved
- Focus tracking efforts on high-scoring predictions

## Limitations

May miss subtle predictions. Effectiveness varies with writing style and domain complexity.
