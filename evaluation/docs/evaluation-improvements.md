# Evaluation Flow Improvements

## Current Issues Identified

1. **Narrow Prediction Range**: Forecasts cluster around 10-25% regardless of market
2. **Static Consensus**: Almost always returns "high" consensus
3. **Poor Calibration**: Large gaps between market and predicted probabilities
4. **Low Diversity**: Individual forecasts too similar

## Suggested Improvements

### 1. Data Collection Enhancements
- **More diverse sources**: Add Manifold, Metaculus, Kalshi
- **Question categorization**: Sports, politics, technology, economics
- **Time horizons**: Near-term (days), medium (months), long-term (years)
- **Probability buckets**: Group by market probability ranges to ensure coverage

### 2. Evaluation Metrics
- **Calibration Score**: How close to market consensus
- **Brier Score**: Proper scoring rule for probabilistic predictions
- **Diversity Metric**: Standard deviation of individual forecasts
- **Confidence Intervals**: Track uncertainty ranges
- **Time-based accuracy**: For resolved questions

### 3. Using Opik for Optimization

#### A. Prompt Engineering Experiments
```python
prompt_variations = {
    "baseline": "Current prompt",
    "market_context": "Include current market probability",
    "contrarian": "Explicitly ask for contrarian views",
    "base_rates": "Emphasize historical base rates",
    "uncertainty": "Ask for confidence intervals"
}
```

#### B. Parameter Tuning
- Temperature: Test 0.5, 0.7, 0.9, 1.0
- Number of forecasts: 3, 5, 7, 10
- Model variations: Different Claude models
- Consensus thresholds: Adjust std dev boundaries

#### C. Systematic Testing
1. Create experiment groups in Opik
2. Run same questions with different configurations
3. Compare calibration and diversity metrics
4. Identify optimal settings per question type

### 4. Quick Wins (Implement Today)

1. **Fix Consensus Calculation**:
   ```typescript
   // Current thresholds are too wide
   if (std_dev > 15) return "low";     // Too high
   if (std_dev > 7) return "medium";   // More reasonable
   return "high";
   ```

2. **Add Market Context**:
   ```typescript
   // Pass market probability to forecasters
   const prompt = `Current market: ${marketProb}%. What's your independent assessment?`;
   ```

3. **Increase Diversity**:
   ```typescript
   // Use different "personas" for each forecast
   const personas = [
     "optimistic analyst",
     "skeptical researcher", 
     "base-rate focused statistician",
     "domain expert",
     "generalist predictor"
   ];
   ```

4. **Better Temperature Sampling**:
   ```typescript
   // Vary temperature per forecast
   const temperatures = [0.6, 0.7, 0.8, 0.9, 1.0];
   const temp = temperatures[index % temperatures.length];
   ```

### 5. Opik Dashboard Setup

Create these views in Opik:
1. **Calibration Dashboard**: Plot predicted vs actual
2. **Question Type Analysis**: Performance by category
3. **Parameter Comparison**: Side-by-side experiments
4. **Trend Analysis**: Performance over time

### 6. Automated Improvement Pipeline

1. **Daily Evaluation Runs**:
   ```bash
   # Cron job to run daily
   0 9 * * * cd /project && ./scripts/daily-forecast-eval.sh
   ```

2. **A/B Testing Framework**:
   - 50% requests use current config
   - 50% use experimental config
   - Track in Opik with experiment tags

3. **Auto-tuning Loop**:
   - Analyze weekly Opik results
   - Adjust parameters based on best performers
   - Deploy winning configurations

### 7. Next Steps Priority

1. **Immediate** (Today):
   - Fix consensus thresholds
   - Add calibration metric to evaluation
   - Run baseline evaluation for comparison

2. **Short-term** (This Week):
   - Implement prompt variations
   - Add market context experiments
   - Create Opik comparison dashboard

3. **Medium-term** (Next Week):
   - Add more data sources
   - Implement auto-tuning
   - Build performance tracking

## Example Implementation

To test prompt variations immediately:
```bash
# Run baseline
python scripts/opik_eval_real_forecasts.py --tag baseline

# Run with market context
python scripts/opik_eval_real_forecasts.py --tag market_aware --include-market

# Compare in Opik dashboard
# Filter by tags to see performance differences
```

This systematic approach will help identify what actually improves forecast quality!