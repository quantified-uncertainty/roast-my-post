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
