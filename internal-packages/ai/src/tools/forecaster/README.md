# Simple Forecaster

Generate probability forecasts using multiple independent Claude analyses

## How It Works

Asks Claude to make multiple independent probability assessments of a given question, then aggregates them by taking the mean to produce a final forecast.

## Output

- **probability**: Aggregated probability (0-100)
- **description**: Description of the forecast and reasoning
- **confidence**: 'low' | 'medium' | 'high' based on forecast agreement
- **individualForecasts**: Array of individual probability assessments with reasoning
- **statistics**: Mean, median, standard deviation, and agreement metrics

## Confidence Levels

- **High**: >66% of forecasts within 10 points of median
- **Medium**: 33-66% agreement
- **Low**: <33% agreement

## Technical Details

- Uses multiple independent claude-sonnet-4-5 calls to reduce bias
- Removes statistical outliers before aggregation
- Agreement measured as percentage of forecasts within 10 points of median
- Default 6 forecasts per question (configurable 3-20)
