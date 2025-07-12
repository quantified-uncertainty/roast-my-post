# Cost Breakdown: Iterative Evaluation

## What We Ran

Looking at the logs and working document, we completed 6 iterations:

1. **Iteration 1**: Initial document creation + claim extraction
2. **Iteration 2**: Fact-checking with source verification  
3. **Iteration 3**: Logical flow and writing style analysis
4. **Iteration 4**: Assumptions and evidence quality
5. **Iteration 5**: Highlights and draft evaluation
6. **Iteration 6**: Final comprehensive evaluation

## Token Usage Estimates

### Per Iteration
- **Blog post**: ~25,000 characters (~6,250 tokens)
- **Working document**: Started small, grew to ~15,000 chars (~3,750 tokens)
- **Prompts + outputs**: ~2,000 tokens per iteration
- **System prompts**: ~10,000 tokens (Claude Code overhead)

### Total Estimates
- Iteration 1: ~18,000 tokens (fresh start)
- Iterations 2-5: ~22,000 tokens each (reading growing doc)
- Iteration 6: ~25,000 tokens (largest working doc)
- **Total**: ~130,000 tokens

## Cost Calculation

Using Claude 3.5 Sonnet pricing:
- Input: $3 per million tokens
- Output: $15 per million tokens
- Assuming 80/20 input/output ratio

**Estimated cost**: 
- Input: ~104,000 tokens × $3/M = $0.31
- Output: ~26,000 tokens × $15/M = $0.39
- **Total: ~$0.70**

## Comparison

1. **Single-shot evaluation** (735 words): ~$0.10-0.15
2. **Iterative evaluation** (6 iterations, 1000+ words): ~$0.70
3. **Your current RoastMyPost approach**: ~$0.02-0.05

## Was It Worth It?

**Pros of iterative approach:**
- More thorough analysis (claims → facts → logic → synthesis)
- Resumable if interrupted
- Clear audit trail of thinking
- Better for complex documents

**Cons:**
- 5-7x more expensive than single-shot
- 14-35x more expensive than your current approach
- Takes longer (multiple API calls)
- Complexity of orchestration

## Bottom Line

At $0.70 per evaluation, the iterative Claude Code approach is:
- Too expensive for routine evaluations
- Potentially valuable for high-stakes documents
- Good for debugging/developing new evaluation approaches
- Not cost-competitive with your current system

The real benefit would come from combining this with:
- Prompt caching (could reduce to ~$0.10-0.15)
- Better orchestration (fewer iterations)
- More focused prompts (less token usage)