# Forecasting Module

The forecasting module provides two main capabilities:
1. **Extract forecasts** from text - find prediction-like statements
2. **Generate forecasts** - create probability estimates using multiple Claude calls

## Key Features

### Robust Forecast Generation
- Makes 6 independent Claude calls for each question
- Removes outliers using IQR (Interquartile Range) method
- Averages remaining forecasts for final probability
- Provides confidence levels based on agreement between forecasts
- Returns detailed statistics and individual forecast data

### Clean API
The module provides a simple, clean function for basic use:

```typescript
import { getForecast } from './forecaster';

// Simple usage
const result = await getForecast("Will AI achieve AGI by 2030?");
console.log(`Probability: ${result.probability}%`);
console.log(`Description: ${result.description}`);

// With context and timeframe
const result2 = await getForecast(
  "Will Bitcoin reach $100,000?",
  "Current price is $45,000 with increasing adoption",
  "By end of 2025"
);
```

### Forecast Extraction
Extract prediction statements from any text:

```typescript
import { extractForecasts } from './forecaster';

const text = "Analysts predict a 70% chance of recession in 2025...";
const forecasts = await extractForecasts(text);
// Returns: [{ text: "...", topic: "recession", probability: 70, timeframe: "2025" }]
```

## How It Works

### Forecast Generation Process
1. **Multiple Calls**: Makes 6 independent calls to Claude with temperature=0.7
2. **Outlier Detection**: Uses IQR method to identify outliers
   - Calculates Q1 (25th percentile) and Q3 (75th percentile)
   - IQR = Q3 - Q1
   - Outliers = values outside [Q1 - 1.5×IQR, Q3 + 1.5×IQR]
3. **Aggregation**: Averages remaining forecasts after outlier removal
4. **Confidence**: 
   - High: Low standard deviation (<10) and high agreement
   - Medium: Moderate disagreement (std dev 10-15)
   - Low: High disagreement (std dev >15)

### Example Output
```typescript
{
  forecast: {
    probability: 35,
    confidence: 'high',
    description: 'Based on 6 independent analyses, the estimated probability is 35%. There is strong agreement among the forecasts. Key factors include: ...'
  },
  individual_forecasts: [...], // All 6 forecasts
  outliers_removed: [...],     // Any removed outliers
  statistics: {
    mean: 35,
    median: 35,
    std_dev: 2.1,
    range: [32, 38]
  }
}
```

## Testing

Run the test suites:
```bash
# Run all forecasting tests
npm run test:narrow-forecast

# Run specific suite
npm run test:narrow-forecast extraction
npm run test:narrow-forecast generation
npm run test:narrow-forecast edge

# Run demo
npm run test:narrow-forecast:demo
```

## Use Cases

1. **Risk Assessment**: Generate probability estimates for various scenarios
2. **Decision Support**: Get calibrated forecasts for strategic decisions
3. **Content Analysis**: Extract and analyze predictions from reports/articles
4. **Trend Analysis**: Identify what experts are predicting in a domain

## Implementation Notes

- Each forecast takes ~10-15 seconds due to 6 Claude calls
- Outlier removal helps handle occasional extreme predictions
- Confidence levels help users understand forecast reliability
- The system works best with well-defined, time-bounded questions