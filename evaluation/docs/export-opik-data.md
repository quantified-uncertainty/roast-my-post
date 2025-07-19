# Exporting Data from Comet Opik

This guide explains how to export experiment data from Comet Opik to CSV format for further analysis.

## Prerequisites

1. **Python Environment Setup**:
   ```bash
   cd evaluation
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **API Key Configuration**:
   - Ensure your `OPIK_API_KEY` is set in the `.env` file
   - The workspace is configured as "oagr" in the scripts

## Using the Export Script

The `export_opik_data.py` script provides several commands for exporting data:

### 1. List Available Data

First, check what data is available in your Opik workspace:

```bash
python evaluation/scripts/export_opik_data.py list
```

This will show:
- Recent experiments with their IDs and scores
- Available datasets with item counts
- Dashboard URL for web access

### 2. Export Experiments

Export experiment metadata and scores to CSV:

```bash
# Export last 100 experiments (default)
python evaluation/scripts/export_opik_data.py experiments

# Export specific number of experiments
python evaluation/scripts/export_opik_data.py experiments --limit 50 --output my_experiments.csv
```

The CSV will include:
- Experiment ID and name
- Creation timestamp
- All metadata fields
- Feedback scores (Brier score, Log score, etc.)

### 3. Export Traces

Export detailed trace data including inputs, outputs, and metrics:

```bash
# Export last 1000 traces (default)
python evaluation/scripts/export_opik_data.py traces

# Export specific number of traces
python evaluation/scripts/export_opik_data.py traces --limit 500 --output forecast_traces.csv
```

The CSV will include:
- Trace ID and name
- Input data (questions, parameters)
- Output data (predictions, probabilities)
- Metadata (experiment config, timestamps)
- Feedback scores and metrics
- Tags

### 4. Export Specific Dataset

Export a dataset by name:

```bash
# Export a dataset (name from the list command)
python evaluation/scripts/export_opik_data.py dataset "current-20250119-1234" --output forecast_dataset.csv
```

## Output Format

All exports create CSV files with:
- UTF-8 encoding for proper character support
- JSON serialization for complex fields (dicts, lists)
- Sorted column headers for consistency
- All available fields from the Opik API

## Analysis Examples

Once you have the CSV files, you can analyze them using:

### Python/Pandas
```python
import pandas as pd

# Load traces
traces = pd.read_csv('traces.csv')

# Analyze Brier scores
if 'brier_score' in traces.columns:
    print(f"Average Brier Score: {traces['brier_score'].mean():.3f}")
    print(f"Std Dev: {traces['brier_score'].std():.3f}")

# Group by experiment
if 'metadata_experiment' in traces.columns:
    by_experiment = traces.groupby('metadata_experiment')['brier_score'].agg(['mean', 'std', 'count'])
    print(by_experiment)
```

### Excel/Google Sheets
- Import CSV directly
- Create pivot tables by experiment or dataset
- Generate charts for score distributions
- Filter by tags or metadata fields

### R
```r
library(tidyverse)

traces <- read_csv('traces.csv')

# Visualize score distribution
ggplot(traces, aes(x = brier_score)) +
  geom_histogram(bins = 30) +
  theme_minimal() +
  labs(title = "Brier Score Distribution")
```

## Common Use Cases

1. **Compare Experiment Performance**:
   ```bash
   python evaluation/scripts/export_opik_data.py experiments --limit 50
   # Then analyze average scores across experiments
   ```

2. **Analyze Prediction Patterns**:
   ```bash
   python evaluation/scripts/export_opik_data.py traces --limit 2000
   # Look at output_probability vs metadata_market_probability
   ```

3. **Export Specific Dataset Results**:
   ```bash
   python evaluation/scripts/export_opik_data.py dataset "curated-questions-v2"
   # Analyze performance on curated question set
   ```

## Troubleshooting

1. **Authentication Error**:
   - Check that `OPIK_API_KEY` is set correctly
   - Verify you have access to the "oagr" workspace

2. **No Data Found**:
   - Run experiments first using `evaluation/scripts/evaluate.py`
   - Check the Opik dashboard: https://www.comet.com/opik/oagr/experiments

3. **Memory Issues with Large Exports**:
   - Use smaller `--limit` values
   - Export in batches if needed

4. **CSV Parsing Issues**:
   - Complex JSON fields are stringified - parse them separately if needed
   - Use proper CSV readers that handle quoted fields

## Advanced Usage

For programmatic access or custom exports, you can import and use the functions directly:

```python
from export_opik_data import export_traces_to_csv, export_dataset_to_csv

# Custom export with specific parameters
export_traces_to_csv('forecast_analysis.csv', limit=5000)

# Export multiple datasets
for dataset_name in ['dataset1', 'dataset2']:
    export_dataset_to_csv(dataset_name, f'{dataset_name}_export.csv')
```

## Next Steps

After exporting data:
1. Analyze score distributions to identify performance patterns
2. Compare different experiment configurations
3. Identify questions where the forecaster performs poorly
4. Create visualizations of calibration curves
5. Share findings for model improvements