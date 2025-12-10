/**
 * Programmatic README generator for Fallacy Review Tool
 */

import {
  generateToolHeader,
} from "../utils/readme-helpers";
import fallacyReviewTool from "./index";

export function generateReadme(): string {
  const header = generateToolHeader(fallacyReviewTool);

  return `${header}

## How It Works

Takes a set of fallacy/epistemic comments extracted from a document and performs three key functions:

1. **Filters Comments** - Removes redundant, weak, or overly similar comments (targets keeping 50-90%)
2. **Generates Document Summary** - Creates a 200-600 word analysis of the document's overall epistemic quality
3. **Generates One-Line Summary** - Provides a concise summary for display headers

## Input

The tool expects:
- **documentText** - The full document text being analyzed
- **comments** - Array of comments to review, each with:
  - index, header, description, level, importance, quotedText

## Output

Returns:
- **commentIndicesToKeep** - Array of comment indices to keep (e.g., [0, 2, 5, 7])
- **documentSummary** - Comprehensive 200-600 word analysis
- **oneLineSummary** - Single sentence summary (20-150 characters)

## Filtering Criteria

The review prioritizes:
- **Variety** - Keeps comments about different types of issues
- **Impact** - Retains the most significant and unique insights
- **Importance** - Prioritizes comments with higher importance scores
- **Non-redundancy** - Removes duplicates that make the same point

## Document Summary Content

The generated summary:
- Analyzes overall epistemic quality
- Identifies patterns and systemic issues
- Discusses credibility and reliability
- Notes strong and weak aspects of reasoning
- Provides balanced assessment (acknowledges both strengths and weaknesses)

## Technical Details

- Uses Claude for intelligent comment filtering and summary generation
- Temperature set to 0.2 for consistent, analytical output
- Maximum 2000 tokens for response
- Falls back to keeping all comments if review fails

## Integration

Works as the final phase in the Fallacy Check pipeline:
1. **Extraction Phase** - Fallacy Extractor identifies issues
2. **Comment Generation** - Comments built with locations
3. **Review Phase** - This tool filters and summarizes
`;
}
