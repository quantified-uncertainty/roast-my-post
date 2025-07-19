# Forecast Evaluation System

This directory contains all tools for evaluating the forecaster tool using Opik and real prediction market data.

## Directory Structure

```
evaluation/
├── README.md              # This file
├── run_evaluation.sh      # Main runner script
├── requirements.txt       # Python dependencies
├── .env.opik.example     # Example Opik configuration
├── scripts/              # Evaluation scripts
│   ├── evaluate.py       # Main evaluation runner
│   ├── fetch_data.py     # Fetch questions from Metaforecast
│   ├── metrics.py        # Scoring metrics (Brier, log scores)
│   ├── setup-opik.sh     # Opik setup helper
│   └── typescript/       # TypeScript evaluation examples
├── data/                 # Forecast question datasets
│   ├── curated_questions.json      # 20 manually curated broad questions
│   ├── metaforecast_cache.json     # 330+ Metaforecast questions
│   ├── ai_curated_forecasts.json   # 50 AI-selected questions
│   ├── opik-simple-eval-results.json    # Example results
│   └── quick-eval-results.json          # Example results
├── docs/                 # Documentation
│   ├── authentication.md           # Auth setup for API access
│   ├── evaluation-improvements.md  # Improvement recommendations
│   └── typescript-evaluation.md    # TypeScript evaluation guide
└── config/              # Configuration files
    └── forecaster_improvements.json  # Recommended settings
```

## Quick Start

```bash
# Set up Python environment
python -m venv venv
source venv/bin/activate
pip install -r evaluation/requirements.txt

# Fetch latest forecast data
python evaluation/scripts/fetch_data.py

# Run evaluation with Brier and log scores
python evaluation/scripts/evaluate.py --dataset curated

# View results in Opik dashboard
# https://www.comet.com/opik/oagr/experiments
```

## Available Commands

### Data Fetching
```bash
# Fetch 500 questions from Metaforecast
python evaluation/scripts/fetch_data.py --count 500

# Use AI to curate best 50 questions
python evaluation/scripts/fetch_data.py --count 500 --ai-curate 50
```

### Running Evaluations
```bash
# Evaluate with curated political/tech questions
python evaluation/scripts/evaluate.py --dataset curated

# Evaluate with Metaforecast data
python evaluation/scripts/evaluate.py --dataset metaforecast --limit 20

# Run A/B test with different prompts
python evaluation/scripts/evaluate.py --experiment prompt-variations
```

## Metrics

We use proper scoring rules for forecast evaluation:

1. **Brier Score**: Measures the mean squared difference between predicted probabilities and market probabilities. Lower is better (0 = perfect, 2 = worst).

2. **Log Score**: Measures the log likelihood of the predictions. Rewards both calibration and confidence appropriately.

## Configuration

The forecaster can be improved based on evaluation results. See `config/forecaster_improvements.json` for recommended settings:
- Consensus thresholds
- Temperature variations
- Prompt improvements

## Results Interpretation

- **Brier Score < 0.25**: Excellent calibration
- **Brier Score 0.25-0.5**: Good calibration
- **Brier Score > 0.5**: Poor calibration

The current forecaster scores:
- Brier: 0.041 (inverted to 0.959 for Opik)
- Log: 0.393 (poor)

This indicates the forecaster clusters predictions too narrowly around 10-25% regardless of market probabilities.

## Exporting Data from Opik

To export experiment results for further analysis:

```bash
# List available data
python evaluation/scripts/export_opik_data.py list

# Export experiment results to CSV
python evaluation/scripts/export_opik_data.py experiments --output results.csv

# Export detailed trace data
python evaluation/scripts/export_opik_data.py traces --limit 1000

# Export a specific dataset
python evaluation/scripts/export_opik_data.py dataset "dataset-name"
```

See `docs/export-opik-data.md` for detailed export instructions and analysis examples.