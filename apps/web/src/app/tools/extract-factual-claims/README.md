# Extract Factual Claims

Extracts verifiable factual claims from text while explicitly avoiding mathematical errors and predictions. Works alongside math and forecast extractors to provide comprehensive document analysis.

## How It Works

Uses Claude to identify factual assertions (statistics, historical facts, scientific claims, organizational info) while explicitly excluding math calculations, predictions, and probabilities which are handled by other tools. Scores each claim on importance (0-100 for centrality to argument), checkability (0-100 for verification ease), and truth probability (0-100 for likelihood of being true).

## Capabilities & Limitations

**Strengths:** Clear separation of concerns - focuses only on factual claims, not math or predictions. Detailed scoring system with specific thresholds. Returns source quotes with character offsets. Configurable quality threshold and max claims.

**Limitations:** Deliberately excludes mathematical verification (e.g., "15% of 1000 is 125") and future predictions (e.g., "GDP will reach $25T by 2025") which need specialized tools. Uses temperature 0 for consistency but still has some subjectivity in scoring.

## Technical Details

- **Scoring:** importance (centrality), checkability (verification ease), truthProbability (likelihood)
- **Exclusions:** Math errors, computational mistakes, predictions, probability statements
- **Default limits:** 30 claims max, quality threshold 50
- **Location:** Implementation in `/internal-packages/ai/src/tools/extract-factual-claims/`