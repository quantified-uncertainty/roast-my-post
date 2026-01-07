# Fact-Check & Fallacy-Check Improvements

## Part 1: Agent Improvements

### 1.1 "Principle of Charity" Step (Fallacy-Check)

Force LLM to first interpret the author's argument charitably before critiquing:

```
1. "Articulate the strongest interpretation of this argument. Assume good faith."
2. [LLM outputs charitable interpretation]
3. "Now, are there still significant fallacies that undermine this interpretation?"
```

### 1.2 Non-Examples in Few-Shot

Add examples of text that looks like a fallacy but isn't:

```
Non-Fallacy Example:
"The data suggests climate is warming rapidly; therefore we must act now."
→ Reasoned conclusion, not hasty generalization. Structure is sound.
```

### 1.3 Simpler Severity Scale

Replace 0-100 with 1-5:

| Score | Meaning |
|-------|---------|
| 5 | Invalidates the argument |
| 4 | Significantly weakens |
| 3 | Weakens but doesn't destroy |
| 2 | Minor issue |
| 1 | Pedantic/stylistic |

### 1.4 Cleaner Taxonomy

| Category | Examples |
|----------|----------|
| Logical Fallacy | Ad Hominem, Strawman, False Dilemma |
| Rhetorical Manipulation | Loaded Language, Emotional appeals |
| Evidentiary Weakness | Hasty generalization, Missing context |

### 1.5 Fact Trumps Fallacy

If Fact-check flags something as false, suppress Fallacy-check on same span.

### 1.6 Drop "Likely" Prefix

Use confidence scores instead: `{ type: "Missing context", confidence: 0.7 }`

---

## Part 2: Meta-Evaluation System

### 2.1 Quality Dimensions

Per-comment dimensions:
- **Accuracy** - Is the issue real? Not hallucinated?
- **Importance** - Worth reader's attention?
- **Clarity** - Punchy, unambiguous?
- **Surprise** - Non-obvious? Adds value?
- **Verifiability** - Can reader check it?
- **Tone** - Constructive? Not hostile?

Per-collection dimensions:
- **Coverage** - Caught the important issues?
- **Redundancy** - Minimal overlap? (higher = better)

### 2.2 Two Evaluation Modes

**Scoring** - Rate single output on all dimensions (1-10 each)
- Use for: monitoring quality over time, identifying weak spots

**Ranking** - Compare N versions, rank relatively
- Use for: A/B testing, tracking improvement across versions
- More efficient than pairwise for many versions
- Enables visualization of trends

### 2.3 Integration

- Meta-eval logic lives in `@roast/ai` (reusable from app)
- Results stored in DB (`MetaEvaluation` table)
- CLI shell in `meta-evals/` for dev/testing
- Future: run in production, show to users, enable voting

---

## Part 3: Fallacy Checker Refactor (2025-01)

Based on user feedback (LessWrong/EA Forum): too aggressive, flags intro claims supported later, misses rhetorical context.

### Architecture

```
Extract (single-pass, wide net)
    ↓
Filter (multi-stage)
  - Principle of Charity
  - Supported Elsewhere?
  - Dedup / severity threshold
    ↓
Comment (pure transformation)
    ↓
Review (summarize only — no filtering)
```

### 3.1 Single-Pass Extraction

Replace chunked extraction with single LLM call on full document. Cast wide net.

### 3.2 Filter: Principle of Charity

Separate filtering step. For each issue: "Does this hold under the strongest interpretation of the argument?"

### 3.3 Filter: Supported Elsewhere?

"Is this claim supported, explained, or qualified elsewhere in the document?"

### 3.4 Simplify Review

Remove filtering logic from review prompt. Focus only on generating summaries.

### 3.5 Model Testing Results (2025-01-04)

**Supported-Elsewhere Filter - Model Comparison:**

| Model | Issues Kept | Cost | Notes |
|-------|-------------|------|-------|
| Claude Opus | 0/5 | ~$0.06 | Most aggressive filtering |
| Claude Sonnet | 1-2/5 | ~$0.02 | Too conservative |
| Gemini 3 Flash | 0/5 | $0.003 | Agrees with Opus, very fast |
| Gemini 3 Pro | 0/5 | $0.054 | Agrees with Opus, detailed explanations |

**Conclusion:** Opus, Gemini Flash, and Gemini Pro all agree that intro claims justified by later technical sections should be filtered. Sonnet is the outlier - too conservative. **Gemini 3 Flash is the best choice** for the filter: cheap ($0.003), fast, and accurate.

**Extraction - Model Comparison:**

| Model | Issues Found | Notes |
|-------|--------------|-------|
| Claude Sonnet | 5 | Standard extraction |
| Gemini 3 Flash | 4 | Slightly different profile - missed 2 issues but found 1 different one |

Both sets of extracted issues were 100% false positives (all filtered by supported-elsewhere). The extraction differences don't matter in practice since the filter catches them all.

### 3.6 OpenRouter Integration

Added OpenRouter support for multi-model testing:

```bash
# Environment variables for model override
FALLACY_EXTRACTOR_MODEL=google/gemini-3-flash-preview
FALLACY_FILTER_MODEL=google/gemini-3-flash-preview
```

**Implemented:**
- `callOpenRouterWithTool<T>()` - Generic wrapper for OpenRouter tool calling
- Temperature normalization per provider (Anthropic 0-1, others 0-2)
- Auto-detection of OpenRouter models (contains `/` in model ID)
- Added Gemini 3 Pro/Flash model IDs to `OPENROUTER_MODELS`

### 3.7 Next Steps

#### Extraction
- Try specialized prompts per issue type (logical fallacies, missing context, rhetorical manipulation)
- Test more models (Flash, others) individually and in combination

#### Filtering
- **Principle of Charity filter** (not yet implemented) - "Does this hold under the strongest interpretation?"
- **Dedup / severity threshold** (not yet implemented) - consolidate similar issues, enforce minimum severity
- Consider per-claim verification (separate LLM calls) - batch approach works but may miss nuances
- Consider Gemini 3 Flash for production (16x cheaper, same accuracy)

#### Review
- No changes needed - already simplified to summary-only

#### Cross-Cutting: Multi-Expert Aggregation
- Run multiple models in parallel, aggregate by majority vote or confidence-weighted
- Reduces both false positives and false negatives
- Cost-effective: cheap models (Flash) + one premium model
- Alternative: same model at different temperatures for diversity

#### Cross-Cutting: Pipeline Observability
- Add metrics/logging per stage: issues in → issues out, time, cost
- Enable tracing through full pipeline for debugging
- Start with structured logs, consider dedicated metrics later
- Goal: understand where issues are caught/missed, identify bottlenecks

#### Cross-Cutting: Validation & Regression Testing
- **Use meta-evals infrastructure** - already has UI for quick iteration and process parts implemented
- Run against recent unique docs in dev DB (imported from prod), compare to previous results
- Find cases with genuine fallacies that should NOT be filtered (validate filter accuracy)
- Track: issues found, issues filtered, final comments generated
- Measure delta from original to understand impact of changes
- Don't need meta-evals scoring/rating yet - just use the execution framework
- Goal: ensure changes are improvements, catch regressions early

---

### 3.8 Prioritized Implementation Plan

**Principle: Measure before changing. Validate before deploying.**

#### Phase 1: Foundation (do this first)
*Can't improve what we can't measure. Can't validate without a baseline.*

1. **Pipeline observability** - Add structured logging per stage (issues in/out, time, cost). Quick win, enables everything else.
2. **Validation framework** - Set up meta-evals to run against dev DB documents. Establish baseline of current behavior before making changes.

#### Phase 2: Filter Improvements (one at a time, measured)
*Each change validated against baseline. Stop if regressions detected.*

3. **Dedup/severity threshold** - Mechanical, low risk. Consolidate similar issues, enforce minimums.
4. **Principle of Charity filter** - LLM-based, higher complexity. "Does this hold under strongest interpretation?"
5. **Per-claim verification** - Only if batch approach shows accuracy issues in validation.

#### Phase 3: Extraction Improvements
*Filters are solid, now refine the input.*

6. **Specialized prompts** - Split by issue type (logical fallacies, missing context, rhetorical). Measure each variant.
7. **Model testing** - Compare Flash vs Claude for extraction quality/cost tradeoff.

#### Phase 4: Optimizations
*Core pipeline works well, now optimize for cost and accuracy.*

8. **Gemini Flash for production** - 16x cheaper, validated as accurate. Easy win.
9. **Multi-expert aggregation** - Run multiple models, aggregate results. Higher accuracy, diminishing returns.

#### Key Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Filter too aggressive (misses real issues) | Users see fewer issues than they should | Validation with known-fallacy documents |
| Filter too lenient (keeps false positives) | User trust eroded | Regression testing against baseline |
| Changes make things worse silently | Wasted effort, user harm | Observability + regression framework (Phase 1) |
| Over-engineering before validating | Wasted effort | Phase 1 first, measure before building |
