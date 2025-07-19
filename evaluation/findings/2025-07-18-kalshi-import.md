# Kalshi API Import Findings
Date: 2025-07-18

## Overview
Investigated using Kalshi's prediction market API to create a forecasting benchmark dataset of 200 diverse questions suitable for LLM evaluation.

## API Details

### Endpoint Structure
- Base URL: `https://api.elections.kalshi.com/trade-api/v2`
- Markets endpoint: `/markets`
- No authentication required for public market data
- Returns paginated results with cursor-based pagination

### Key Response Fields
```json
{
  "ticker": "KXELONJREGUEST-26JAN",
  "title": "Who will go on The Joe Rogan Experience?",
  "yes_sub_title": "Elon Musk",  // The specific answer option
  "no_sub_title": "Elon Musk",
  "status": "active",
  "volume": 0,
  "last_price": 0,  // Current probability in cents (0-100)
  "close_time": "2026-01-01T15:00:00Z",
  "rules_primary": "If Elon Musk goes on The Joe Rogan Experience..."
}
```

## Multi-Outcome Market Structure

Kalshi represents multi-outcome questions as separate binary markets:
- Same `title` across all options (e.g., "Who will win MVP?")
- Different `ticker` for each option
- `yes_sub_title` contains the specific option (e.g., player name)

Example:
- Market 1: "Who will win MVP?" → LeBron James (ticker: KXMVP-LEBRON)
- Market 2: "Who will win MVP?" → Stephen Curry (ticker: KXMVP-CURRY)
- Market 3: "Who will win MVP?" → Nikola Jokić (ticker: KXMVP-JOKIC)

## Data Quality Issues

### 1. Heavy Sports Bias
- Out of 5,000 markets fetched, ~75% were sports-related
- Limited diversity in other categories:
  - Politics: ~1%
  - Economics: ~2%
  - Technology: ~3%
  - Science: <1%

### 2. Limited Active Markets
- Only 311 out of 5,000 markets met basic criteria:
  - Status: active
  - Closes 30-730 days from now
  - Valid title format

### 3. Duplicate Questions
- Multi-outcome markets create massive duplication
- "Who will win Clutch Player of the Year?" had 70 separate markets
- "Who will win Most Improved Player?" had 51 markets
- After deduplication: only 43 unique questions from 311 markets

### 4. Data Completeness
- Most markets have no trading volume (90%)
- Many markets missing current probability data
- Volume concentrated in a few popular markets

## Implementation Challenges

### 1. Title Validation
Initial attempt was too strict:
- Required titles > 20 characters (excluded valid short questions)
- Looked for "missing names" that were actually in `yes_sub_title`
- Better approach: minimum 10 characters, check for question markers

### 2. Category Classification
- Kalshi's `category` field often empty
- Had to infer from title/subtitle content
- Created keyword mappings for 10 major categories

### 3. Benchmark Selection Strategy
Final approach:
- Deduplicate by base question
- Include up to 3 options per multi-outcome question
- Prioritize markets with price/volume data
- Target category distribution (though data limitations prevented achieving it)

## Final Dataset Characteristics

Successfully created benchmark with:
- 200 total markets
- 43 unique base questions
- 100% have price data
- 10.5% have trading volume
- Heavy sports bias (74%)

## Recommendations

### For Better Diversity:
1. **Fetch more pages** - We only fetched 5,000 of likely 10,000+ markets
2. **Relax time constraints** - Include markets closing in <30 days or >2 years
3. **Include closed markets** - Historical questions might be good for benchmarking
4. **Combine data sources** - Supplement with Metaculus, Manifold, or Polymarket

### For Production Use:
1. **Cache API responses** - Avoid re-fetching 50+ pages
2. **Implement incremental updates** - Track new markets daily
3. **Monitor market lifecycle** - Track how questions resolve
4. **Build question taxonomy** - Better categorization than keywords

## Code Artifacts

Created several scripts:
1. `fetch-kalshi-markets.ts` - Basic market fetching
2. `create-forecasting-benchmark.ts` - Initial attempt (too strict validation)
3. `create-forecasting-benchmark-cleaned.ts` - Fixed validation, revealed deduplication issue
4. `create-forecasting-benchmark-final.ts` - Attempted deduplication (only 43 questions)
5. `create-forecasting-benchmark-v2.ts` - Final version with smart multi-outcome handling

## Lessons Learned

1. **API pagination is essential** - Default limit is 100, need cursor for more
2. **Multi-outcome markets dominate** - Must handle deduplication carefully
3. **Sports overwhelming** - Kalshi's market distribution heavily skewed
4. **Price != Volume** - Many markets have prices but zero trading
5. **Question quality varies** - From specific ("Will X happen on date Y?") to vague ("Who will win?")

## Future Work

1. **Automated benchmark updates** - Track how predictions age
2. **Difficulty scoring** - Use volume/spread as difficulty proxy
3. **Resolution tracking** - Build dataset of resolved questions for accuracy testing
4. **Cross-platform integration** - Combine multiple prediction market APIs