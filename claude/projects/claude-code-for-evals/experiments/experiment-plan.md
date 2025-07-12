# Parallel Experiment Plan

## Experiment 09: File I/O vs Pre-loaded Content (Small Document)
**Question**: Does pre-loading content actually save time?
- Use a SHORT document (500-1000 words) to isolate the effect
- Run two versions:
  - A: Claude reads file with Read tool
  - B: Content pre-loaded in prompt
- Same task: Find 5 specific types of errors
- Measure: Time and cost for each approach

## Experiment 10: Chunked Analysis
**Question**: Is it better to analyze in chunks vs all at once?
- Take the full document and split into 3 chunks
- Each chunk gets analyzed separately then combined
- Compare to single-shot analysis of full document
- This tests if smaller working memory = faster processing

## Experiment 11: Focused Single-Task Iterations
**Question**: How much does task focus matter?
- Run 3 parallel single-task analyses:
  - Process 1: ONLY find math errors (R vs R²)
  - Process 2: ONLY find typos/grammar
  - Process 3: ONLY find logical contradictions
- Compare total time vs asking for all three at once
- Tests if cognitive load affects speed

## Why These Three?

1. **Different variables tested simultaneously**
2. **Can run in parallel** - saving wall-clock time
3. **Each answers a specific optimization question**
4. **Results will guide the best approach for production**