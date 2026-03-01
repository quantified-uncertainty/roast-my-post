# Agentic Analysis: Recall & Reliability Research

Date: 2026-03-01

## Problem

Running the same document through our multi-agent analysis pipeline (fact-checker, fallacy-checker, reviewer) produces significantly different findings each time. The core issue is **recall** — catching all important fallacies and errors, not missing them. Variance between runs is a symptom of incomplete coverage.

## Key Research Findings

### Tier 1: Strongly Supported, Directly Applicable

#### 1. Ensemble/Union Aggregation
- **Paper**: "Can ensembles improve evidence recall?" (Beckh et al., Fraunhofer IAIS, Dec 2025) — [arxiv.org/html/2511.07055](https://arxiv.org/html/2511.07055)
- Run 3-5 diverse analysis passes, take the UNION of findings
- Single model recall: 0.60 → Ensemble recall: 0.87 (+45%)
- Precision drops from 0.70 to 0.49, but manageable via confidence scoring
- Diminishing returns suggest 3-5 passes is the sweet spot

#### 2. Generative Self-Aggregation (GSA)
- **Paper**: "LLMs Can Generate a Better Answer by Aggregating Their Own Responses" (Li et al., Georgia Tech/Microsoft/Amazon, Mar 2025) — [arxiv.org/html/2503.04104v1](https://arxiv.org/html/2503.04104v1)
- Sample 3-4 diverse responses, then present ALL to a synthesis agent to generate merged analysis
- Can find correct answers even when ALL individual passes were wrong
- Works on open-ended tasks where majority voting doesn't apply (our case)
- Cost: 4-5x (3-4 samples + 1 aggregation)

#### 3. Diverse Perspective Prompting
- **Paper**: "How Far Can We Extract Diverse Perspectives from LLMs?" — [arxiv.org/html/2311.09799v3](https://arxiv.org/html/2311.09799v3)
- Criteria-based prompting: enumerate issue types FIRST, then check each
- Iterative recall: "Given you found X, Y, Z — what ADDITIONAL issues exist?"
- Criteria-based is the best diversity extraction method across models

#### 4. Multi-Perspective Augmentation for Fallacy Detection
- **Paper**: "Large Language Models Are Better Logical Fallacy Reasoners with Counterargument, Explanation, and Goal-Aware Prompt Formulation" (Jeong et al., Mar 2025) — [arxiv.org/html/2503.23363v1](https://arxiv.org/html/2503.23363v1)
- Generate counterarguments, explanations, and goals before judging fallacies
- Accuracy 0.84, Macro-F1 0.83 (zero-shot GPT-4) on ARGOTARIO
- ~4x cost per item (3 perspective augmentations + ranking)

#### 5. Dual-Perspective Evidence Retrieval
- **Paper**: "Contradiction to Consensus: Dual-Perspective, Multi-Source Retrieval Based Claim Verification" (Feb 2026) — [arxiv.org/abs/2602.18693](https://arxiv.org/abs/2602.18693)
- For each claim, generate its NEGATED counterpart and retrieve evidence for BOTH
- +10.4% accuracy and +8.1% F1 on SciFact
- Combats confirmation bias in evidence retrieval

### Tier 2: Supported, Worth Considering

#### 6. Anthropic Parallelization Pattern
- **Source**: [anthropic.com/research/building-effective-agents](https://www.anthropic.com/research/building-effective-agents)
- 3-5 sub-agents in parallel, each specialized, lead synthesizes
- Anthropic's own multi-agent research system: 90.2% improvement on breadth-first tasks
- 15x token consumption vs single chat

#### 7. Claimify-Style Claim Extraction
- **Source**: Microsoft, 2025 — [microsoft.com/en-us/research/blog/claimify](https://www.microsoft.com/en-us/research/blog/claimify-extracting-high-quality-claims-from-language-model-outputs/)
- Four-stage pipeline for extracting all verifiable claims
- 99% of extracted claims entailed by source sentences
- High-quality claim extraction is prerequisite to high recall

#### 8. Distinct Agent Personalities (DelphiAgent)
- **Paper**: "DelphiAgent: A trustworthy multi-agent verification framework" (2025) — [sciencedirect.com](https://www.sciencedirect.com/science/article/abs/pii/S0306457325001827)
- Multiple agents with distinct personalities (skeptic, domain expert, devil's advocate)
- +6.84% MacroF1 on RAWFC over LLM-only baselines

#### 9. Logical Structure Trees
- **Paper**: "Boosting Logical Fallacy Reasoning in LLMs via Logical Structure Tree" (Lei & Huang, EMNLP 2024) — [aclanthology.org/2024.emnlp-main.730](https://aclanthology.org/2024.emnlp-main.730/)
- Make argument structure explicit before analysis
- Constituency parsing + 10 logical relation types

### Tier 3: Caution / Anti-Patterns

#### 10. Multi-Agent Debate — Often Counterproductive
- **Source**: "Multi-LLM-Agents Debate — Performance, Efficiency, and Scaling Challenges" (ICLR Blog, Apr 2025)
- Most MAD frameworks FAIL to beat simple self-consistency
- Debate drives toward CONSENSUS, which HURTS recall
- We want divergence — each pass finding different things

#### 11. Claim Decomposition — Use Carefully
- **Paper**: "The Alignment Bottleneck in Decomposition-Based Claim Verification" (Feb 2026) — [arxiv.org/html/2602.10380](https://arxiv.org/html/2602.10380)
- Decomposition ONLY helps when evidence aligns with sub-claims
- Naive decomposition can degrade F1 from 0.59 to 0.44

## Discussion & Conclusions

### We already have #1 (Ensemble Union) at the extraction layer

Our MCP fallacy pipeline's multi-extractor component is essentially Ensemble Union — multiple extractors (different models/prompts) analyze the same document, results are deduplicated and merged. So #1 is already implemented at the extraction level.

### #2 (GSA) is the natural next step, applied at the agent level

The difference between #1 and #2: Ensemble Union is mechanical (collect all findings, deduplicate, take the union). GSA is intelligent synthesis — a synthesis agent sees ALL outputs and generates a new, better analysis. It can combine weak versions of the same finding from different runs into one strong version, connect dots across runs, and even produce correct findings when all individual runs were wrong.

Since we already have #1 at extraction, the bigger improvement comes from applying GSA at the agent level — where findings are more complex and semantic.

### The reviewer is already a natural GSA synthesis agent

Our existing reviewer sub-agent already reads all reports and cross-validates. It's essentially doing GSA — just on a single set of inputs. The key insight: give it MORE diverse inputs by running the fallacy analysis multiple times with different perspectives.

## Proposed Next Step: Multi-Perspective Fallacy Analysis

### How it maps to existing architecture

Instead of one `fallacy-checker` sub-agent, run 2-3 with different perspective prompts:

| Agent | Perspective | Prompt Focus |
|-------|------------|--------------|
| `fallacy-checker` (default) | Balanced analysis | Current prompt — map arguments, check reasoning, apply charity |
| `fallacy-checker-skeptic` | Adversarial | "Assume the author is trying to persuade you — what are they hiding?" |
| `fallacy-checker-structural` | Formal logic | "Map every argument to its premises and conclusions — where do the logical connections fail?" |

### Pipeline changes

```
Current:
  fact-checker → fallacy-checker → [clarity + math parallel] → reviewer

Proposed:
  fact-checker → [fallacy-1 + fallacy-2 + fallacy-3 parallel] → [clarity + math parallel] → reviewer
```

- All 3 fallacy-checkers run the same MCP pipeline (extract → charity → supported-elsewhere) + own analysis
- Each writes `fallacy-report-1.json`, `fallacy-report-2.json`, `fallacy-report-3.json`
- They run in **parallel** (independent of each other, all depend on fact-checker)
- The reviewer reads all reports and synthesizes — it already does cross-validation

### What changes in code

- `orchestrator.ts`: add 2 more fallacy-checker agent definitions with different prompts
- Pipeline stages: move fallacy-checkers to parallel stage (same as clarity/math)
- Reviewer prompt: minor update to expect multiple fallacy reports
- Profile config: make number of fallacy passes configurable (1-3)

### Cost impact

- Fact-checker: unchanged (1x)
- Fallacy analysis: ~3x (3 parallel passes, but each shares MCP extraction cache if we implement that)
- Reviewer: slightly more work (more reports to read), ~1.2x
- Overall: ~2x total cost for the full pipeline

### Confidence signal

- Finding appears in 3/3 reports → high confidence
- Finding appears in 1/3 reports → lower confidence, still included
- This naturally emerges from the reviewer's cross-validation — no new mechanism needed

### Expected improvement

Based on ensemble recall research (0.60 → 0.87 with union), expect ~40-50% recall improvement on fallacy detection. The fact-checker is more deterministic by nature (web search based) and less likely to benefit from multi-pass.
