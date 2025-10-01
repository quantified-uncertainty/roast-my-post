# Extract Forecasting Claims

Extracts predictions and converts them to binary (YES/NO) questions. Scores on three dimensions: precision (how binary/specific), verifiability (can we check with public data), and importance (centrality to argument)

## How It Works

Extracts forecasting statements from text and converts them to binary (YES/NO) questions. Clarifies vague predictions for better precision. Scores each prediction across four dimensions: precision (how specific), verifiability (can we check with public data), importance (centrality to argument), and robustness (how well-supported).

## Capabilities & Limitations

**Strengths:** Clarifies vague predictions to improve trackability. Scores across four dimensions (0-100 each). Extracts metadata (probabilities, dates, resolution criteria). Identifies high-quality predictions worth monitoring.

**Limitations:** May miss subtle predictions. Effectiveness varies with writing style and domain complexity. Scoring based on text analysis, not domain expertise. Cannot verify prediction accuracy (only evaluates quality).

## Technical Details

- Scoring dimensions: precision, verifiability, importance, robustness (0-100 each)
- Score interpretation: 70-100 (excellent), 40-69 (moderate), 0-39 (poor)
- Clarifies predictions to ensure they are specific and binary
- Extracts probabilities, dates, and resolution criteria when present
