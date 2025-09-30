# Spelling & Grammar Checker

A sophisticated proofreading agent that combines language convention detection with Claude-based error analysis. Features adjustable strictness levels and automatic US/UK English convention handling.

## Tools Used

- **[Check Spelling & Grammar](/tools/check-spelling-grammar)** - Analyze text for spelling and grammar errors using Claude with advanced error detection



## Configuration

**Error Processing:**
- Maximum errors per chunk: **20**
- Minimum confidence threshold: **30**
- High importance threshold: **50**

**Language Convention Detection:**
- Sample size for detection: **2000 characters**
- Low confidence threshold: **0.8**
- Low consistency threshold: **0.8**

## How It Works

First detects the document's language convention (US/UK/mixed) using convention detection, then analyzes text with Claude for error detection. The agent uses importance scoring (0-100) and confidence levels to prioritize errors, with configurable strictness levels (minimal/standard/thorough) that adjust the error detection threshold.

## Capabilities

- **Intelligent convention handling** - Can enforce specific US/UK spelling or adapt to mixed conventions
- **Three strictness levels** for different use cases (minimal, standard, thorough)
- **Returns exact error text** with concise corrections, importance scores, and confidence ratings
- **Provides explanations** only for complex errors to reduce noise
- **Line number tracking** for approximate error locations

## Technical Details

- **Strictness levels:** minimal (importance ≥51), standard (≥26), thorough (≥0)
- **Convention modes:** US, UK, or auto-detect with mixed convention support
- **Error scoring:** importance (0-100), confidence (0-100), with contextual descriptions
- **Maximum errors:** 50 by default (configurable)

---
*This documentation is programmatically generated from source code. Do not edit manually.*
