# Local Data Export for Evaluation

The evaluation script now supports exporting results locally for data analysis, in addition to sending them to Opik.

## Usage

Add the `--export` flag when running evaluations:

```bash
python evaluation/scripts/evaluate_with_meta.py \
  --dataset current \
  --limit 10 \
  --export evaluation/exports \
  --description "Testing local export functionality"
```

## Export Formats

When you use the `--export` flag, the script creates three files:

### 1. CSV File (`experiment_id_timestamp.csv`)
- Flat format ideal for data analysis in pandas, Excel, or R
- Contains all key metrics per question:
  - Question text and market probability
  - Forecast probability and consensus level
  - Cost metrics (USD, tokens)
  - All metadata fields (category, timeframe, etc.)
  - Individual forecast details (if multiple forecasts)

### 2. JSON File (`experiment_id_timestamp.json`)
- Complete hierarchical data structure
- Includes:
  - Full experiment configuration
  - Summary statistics
  - All evaluation results with nested data
  - Opik metrics (if available)

### 3. Summary Report (`experiment_id_timestamp_summary.txt`)
- Human-readable summary
- Key statistics at a glance
- Cost totals
- Success/failure counts

## Data Analysis Examples

### Python/Pandas
```python
import pandas as pd
import json

# Load CSV for quick analysis
df = pd.read_csv('evaluation/exports/current-20250718-120000_20250718_120000.csv')

# Basic statistics
print(df['forecast_probability'].describe())
print(f"Total cost: ${df['cost_usd'].sum():.2f}")

# Compare forecast vs market
df['difference'] = df['forecast_probability'] - df['market_probability']
print(df[['question', 'market_probability', 'forecast_probability', 'difference']])

# Load JSON for detailed analysis
with open('evaluation/exports/current-20250718-120000_20250718_120000.json') as f:
    data = json.load(f)
    print(f"Experiment: {data['experiment_id']}")
    print(f"Summary: {data['summary']}")
```

### R Analysis
```r
library(tidyverse)

# Load and analyze
results <- read_csv("evaluation/exports/current-20250718-120000_20250718_120000.csv")

# Visualize forecast vs market
ggplot(results, aes(x = market_probability, y = forecast_probability)) +
  geom_point() +
  geom_abline(slope = 1, intercept = 0, linetype = "dashed") +
  labs(title = "Forecast vs Market Probabilities")
```

## Export Directory Structure

```
evaluation/exports/
├── current-20250718-120000_20250718_120000.csv
├── current-20250718-120000_20250718_120000.json
├── current-20250718-120000_20250718_120000_summary.txt
├── sonnet4-test_20250718_130000.csv
├── sonnet4-test_20250718_130000.json
└── sonnet4-test_20250718_130000_summary.txt
```

## Benefits

1. **Local Analysis**: No need to query Opik API for basic analysis
2. **Data Portability**: Easy to share CSV files with collaborators
3. **Version Control**: Track changes in evaluation results over time
4. **Custom Analysis**: Use your preferred tools (pandas, R, Excel)
5. **Offline Access**: Work with results without internet connection

## Best Practices

1. **Regular Exports**: Always use `--export` for important experiments
2. **Organize by Date**: The automatic timestamp helps track progression
3. **Archive Results**: Periodically backup the exports directory
4. **Document Experiments**: Use meaningful `--description` flags

## Integration with Existing Workflow

The export functionality works seamlessly with all existing features:
- Still sends data to Opik
- Compatible with all config files
- Works with parallel evaluation
- Includes all metadata and cost tracking

Just add `--export evaluation/exports` to your existing commands!