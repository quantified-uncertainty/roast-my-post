# Terminology Update: Forecasts vs Forecasting Claims

## Changes Made

### Clarified Terminology
- **Forecasting Claims**: What we extract from the document (author's predictions)
- **Our Forecasts**: Our own probability estimates for those claims

### Variable Naming Updates
- `this.forecasts` → `this.forecastingClaims` 
- `this.ourPredictions` → `this.ourForecasts`
- Method: `extractForecasts()` → `extractForecastingClaims()`
- Loop variables: `forecast` → `forecastClaim` where appropriate

### Comment Updates
- "Extract forecasts" → "Extract forecasting claims"
- "predictions" → "forecasting claims" in user-facing messages
- Added clarifying comments about the distinction

### Why This Matters
The previous naming was confusing because:
- The tool extracts "forecasting claims" from the document
- We then generate our own "forecasts" (probability estimates) for some of those claims
- Using "forecast" for both made the code harder to understand

Now the flow is clearer:
1. Extract **forecasting claims** from the document
2. Generate our own **forecasts** for important claims
3. Compare and create comments for disagreements

This makes the code more maintainable and easier to understand for future developers.