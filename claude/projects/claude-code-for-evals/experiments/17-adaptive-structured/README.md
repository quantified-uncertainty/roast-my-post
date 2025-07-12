# Experiment 17: Adaptive Orchestration with Structured Outputs

## Overview
This experiment fixes the garbage data issue by using structured outputs throughout. Claude outputs findings in a specific format that can be reliably parsed.

## Key Improvements

### 1. **Structured Finding Format**
Claude outputs each finding in a parseable format:
```
[FINDING]
Category: mathematical_error
Severity: critical
Line: 71
Quote: "the R-squared equal the cosine of the angle"
Issue: Incorrect - should be R equals cosine, not R-squared
[/FINDING]
```

### 2. **Quality Validation**
Every finding is validated to ensure:
- Valid category from predefined list
- Valid severity level
- Line number exists
- Quote is non-empty
- Description is meaningful

### 3. **Progressive Output Storage**
All outputs are preserved:
```
outputs/
├── iteration-1-parallel/
├── iteration-2-deep-dive/
├── iteration-3-synthesis/
└── all-findings.json
```

### 4. **Smart Planning**
Decisions based on finding quality, not just count:
- Number of critical/major/minor findings
- Coverage across categories
- Areas still unexplored

### 5. **No More Garbage**
- No more picking up random lines with "line" in them
- No more "- NBA height (Line 7, 9)" nonsense
- Only real, validated findings

## Usage

```bash
# Quick test
./orchestrator.sh --test

# Standard run
./orchestrator.sh --max-iterations 5

# Full run
./orchestrator.sh
```

## Expected Results

- **Finding Quality**: 95%+ real findings (vs 20% in exp 15)
- **Efficiency**: 4-6 iterations typical
- **Runtime**: 2-5 minutes total
- **Output**: Clean, structured, actionable findings