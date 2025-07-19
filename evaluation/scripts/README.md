# Evaluation Scripts

This directory contains the main evaluation script for testing the forecaster tool.

## Main Script

### `evaluate_with_meta.py`

The primary evaluation script that:
- Loads forecast questions from JSON datasets
- Calls the forecaster API to generate predictions
- Tracks experiments using Opik/Comet ML
- Calculates Brier scores and log scores
- Exports results to JSON and CSV formats

### Usage

```bash
# Basic usage with a dataset
python evaluation/scripts/evaluate_with_meta.py --dataset kalshi --num-forecasts 5

# Use test mode for quick testing
python evaluation/scripts/evaluate_with_meta.py --dataset test --num-forecasts 3

# Export results with custom prefix
python evaluation/scripts/evaluate_with_meta.py --dataset combined --export-prefix my-experiment

# Skip Opik tracking (local testing)
python evaluation/scripts/evaluate_with_meta.py --dataset kalshi --skip-opik
```

### Options

- `--dataset`: Dataset to use (kalshi, polymarket, manifold, metaculus, combined, test)
- `--num-forecasts`: Number of forecasts per question (default: 5)
- `--export-prefix`: Prefix for export files (default: dataset name)
- `--skip-opik`: Skip Opik experiment tracking
- `--opik-name`: Custom name for Opik experiment
- `--use-perplexity`: Use Perplexity for research before forecasting

## Supporting Modules

The script uses modules from `evaluation/lib/`:
- `metrics.py`: Brier score and log score calculations
- `cost_utils.py`: API cost tracking utilities
- `categorize.py`: Question categorization logic

## Environment Setup

Ensure you have the required environment variables:
```bash
OPIK_API_KEY=your-api-key
OPIK_WORKSPACE=your-workspace
NEXT_PUBLIC_API_URL=http://localhost:3000  # or your API URL
```