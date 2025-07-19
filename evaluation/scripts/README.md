# Evaluation Scripts

This directory contains scripts for managing and exporting evaluation data from Opik.

## TypeScript Export Script (Recommended)

The TypeScript export script (`export-opik-data.ts`) is the recommended way to export Opik data to CSV format. It's consistent with the Next.js codebase and doesn't require Python setup.

### Setup

1. Ensure you have the required environment variables in your `.env` file:
   ```
   OPIK_API_KEY=your-api-key
   OPIK_WORKSPACE=oagr  # or your workspace name
   ```

2. The script uses the installed `opik` npm package and CSV utilities.

### Usage

Use the npm script for easy access:

```bash
# List available data
npm run opik:export list

# Export experiments to CSV
npm run opik:export experiments
npm run opik:export experiments -- -o my-experiments.csv -l 50

# Export traces to CSV
npm run opik:export traces
npm run opik:export traces -- -o my-traces.csv -l 1000

# Export a specific dataset to CSV
npm run opik:export dataset "dataset-name"
npm run opik:export dataset "dataset-name" -- -o my-dataset.csv

# Show help
npm run opik:export -- --help
```

### Direct Script Usage

You can also run the script directly with tsx:

```bash
npx tsx evaluation/scripts/export-opik-data.ts list
npx tsx evaluation/scripts/export-opik-data.ts experiments -o experiments.csv -l 100
```

### Output Format

The script exports data to CSV format with:
- Nested objects flattened with underscore prefixes (e.g., `metadata_key`)
- Arrays and complex objects stringified as JSON
- All available fields from the API responses
- Sorted column headers for consistency

### Features

- **Experiments Export**: Includes experiment metadata, feedback scores, and metrics
- **Traces Export**: Includes input/output data, metadata, tags, and feedback scores
- **Dataset Export**: Includes all dataset items with nested field expansion
- **List Command**: Shows available experiments and datasets with summary information

## Python Scripts (Legacy)

The Python scripts in this directory are kept for backwards compatibility but the TypeScript version is recommended for consistency with the codebase.

### Python Setup (if needed)

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r evaluation/requirements.txt
```

### Python Usage

```bash
# List available data
python evaluation/scripts/export_opik_data.py list

# Export experiments
python evaluation/scripts/export_opik_data.py experiments -o experiments.csv

# Export traces
python evaluation/scripts/export_opik_data.py traces -o traces.csv

# Export dataset
python evaluation/scripts/export_opik_data.py dataset "dataset-name" -o dataset.csv
```

## Notes

- The TypeScript version uses the same Opik npm package that's already installed in the project
- Both scripts connect to the Opik Cloud API at `https://www.comet.com/opik/api/v1`
- CSV files are created in the current working directory unless a full path is specified
- Large exports may take some time depending on the amount of data