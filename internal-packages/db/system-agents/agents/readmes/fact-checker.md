# Fact Checker

An agent that identifies and verifies factual claims in documents, checking them against current knowledge and reliable sources. Provides detailed verdicts on claim accuracy with evidence-based reasoning.

## Configuration

**Processing Limits:**
- Maximum facts to process: **30**
- Maximum claims per chunk: **20**

**Quality Thresholds:**
- Minimum quality threshold: **25**

**Importance Scoring:**
- High importance: **60+**
- Medium importance: **40+**

**Checkability Scoring:**
- High checkability: **50+**

**Truth Probability Ranges:**
- High: **90+**
- Medium: **70-90**
- Low: **50-70**
- Very Low: **≤40**
- Likely False: **≤30**

## How It Works

The agent processes documents by:
1. Extracting factual claims and statements
2. Categorizing claims by type (statistical, historical, scientific, etc.)
3. Verifying each claim against current knowledge
4. Providing verdicts with supporting evidence
5. Suggesting corrections for inaccurate claims

## Verification Categories

- **Factual claims**: General statements about events, people, or things
- **Statistical data**: Numbers, percentages, measurements, trends
- **Historical facts**: Dates, events, historical figures and contexts
- **Scientific facts**: Research findings, natural phenomena, technical data
- **Geographic facts**: Locations, distances, demographic information
- **Current events**: Recent developments, ongoing situations

## Verdict Types

- **True**: Claim is accurate and well-supported
- **False**: Claim is demonstrably incorrect
- **Partially True**: Contains accurate elements but is misleading or incomplete
- **Outdated**: Was true but no longer current
- **Unverifiable**: Cannot be verified with available information
- **Misleading**: Technically true but presented in a deceptive way

---
*This documentation is programmatically generated from source code. Do not edit manually.*
