# Extract Forecasting Claims

Extracts predictions from text and converts them to binary YES/NO questions with resolution criteria. Uses three-dimensional scoring to evaluate forecast quality.

## How It Works

Uses Claude Sonnet to identify predictive statements in text and reformulate them as binary questions. Each forecast is scored on precision (how specific/binary), verifiability (availability of public data to check), and importance (centrality to argument). Generates resolution dates and criteria for systematic tracking.

## Capabilities & Limitations

**Strengths:** Converts vague predictions into specific binary questions. Provides resolution dates and clear verification criteria. Three-dimensional scoring system for quality assessment. Configurable quality threshold filtering. Returns source quotes with character offsets.

**Limitations:** Some predictions resist binary formulation. Resolution criteria may be ambiguous for complex events. Uses Claude Sonnet which costs more than Haiku (~$0.01-0.03). Limited to extracting predictions, not evaluating their likelihood.

## Technical Details

- **Scoring dimensions:** precision (0-100), verifiability (0-100), importance (0-100)
- **Output format:** Binary questions with resolution dates and criteria
- **Default limit:** 3 detailed analyses, configurable
- **Model:** Claude Sonnet for better extraction quality
- **Location:** Implementation in `/internal-packages/ai/src/tools/extract-forecasting-claims/`