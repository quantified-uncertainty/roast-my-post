# Semantic Analysis Guide

## Overview

The semantic analyzer implements three key improvements:

1. **Smart Chunking** - Splits documents at natural boundaries
2. **Investigation Flagging** - Two-phase analysis with targeted deep dives
3. **Background Research** - Identifies context needed before analysis

## How It Works

### Phase 1: Semantic Chunking

Instead of arbitrary line counts, we chunk based on document structure:

```
Original Document:
==================
# Introduction
Lorem ipsum dolor sit amet...

## Methodology
Our approach uses statistical analysis...
- Data collection from 2020-2024
- Sample size: n=10,000
- Statistical significance: p<0.05

## Results
The findings show a 45% increase...

### Economic Impact
GDP growth correlates with...
```

Becomes:
```
Chunk 1: "Introduction" (lines 1-3)
  - Type: section
  - Level: h1
  - Complexity: low
  - Metadata: {hasNumbers: false, hasCitations: false}

Chunk 2: "Methodology" (lines 5-9)
  - Type: section  
  - Level: h2
  - Complexity: high
  - Metadata: {hasNumbers: true, hasLists: true, hasCitations: true}

Chunk 3: "Results" (lines 11-20)
  - Type: section
  - Level: h2
  - Complexity: high
  - Metadata: {hasNumbers: true, hasStatistics: true}
```

### Phase 2: Background Research

Before diving into analysis, identify what context is needed:

```
RESEARCH_NEEDED: Keynesian multiplier | Document discusses fiscal impacts | "Keynesian multiplier economic theory"
RESEARCH_NEEDED: Sample size determination | Claims n=10,000 is sufficient | "statistical sample size calculation methods"
RESEARCH_NEEDED: P-value interpretation | Uses p<0.05 threshold | "statistical significance p-value meaning"
```

### Phase 3: Initial Scan with Flagging

Quick scan identifies areas needing deeper investigation:

```
Chunk: "Methodology"
INVESTIGATE: "Sample size: n=10,000" | suspicious_data | high | Sample seems too round, needs verification
INVESTIGATE: "Data collection from 2020-2024" | needs_verification | medium | Future date referenced (it's 2025)
SECTION_PRIORITY: high | Contains multiple statistical claims

Chunk: "Results"  
INVESTIGATE: "45% increase" | complex_claim | high | No baseline or context provided
INVESTIGATE: "GDP growth correlates" | causal_claim | high | Correlation presented as causation?
SECTION_PRIORITY: high | Core findings need verification
```

### Phase 4: Deep Investigation

For high-priority investigations, perform thorough analysis:

```
Investigation: "45% increase" - complex_claim
Deep Analysis:
- FINDING: major | Claim lacks baseline year or comparison group | No evidence provided
- VERIFICATION_NEEDED: "45% increase from when to when" | Search for original data source
- ALTERNATIVE: Could be 45% relative to control group rather than temporal increase
```

## Chunking Strategies

### 1. Header-Based (Default)
```javascript
headers: {
    // Splits at h1, h2, h3 boundaries
    // Preserves document structure
    // Good for: Academic papers, documentation
}
```

### 2. Paragraph-Based
```javascript
paragraphs: {
    // Groups paragraphs up to target size
    // Maintains paragraph integrity
    // Good for: Essays, blog posts
}
```

### 3. Hybrid (Recommended)
```javascript
hybrid: {
    // Starts with headers
    // Splits large sections at paragraph boundaries
    // Good for: Most documents
}
```

## Example Analysis Flow

```bash
$ ./semantic-analyzer.js research-paper.md --strategy hybrid

🧠 Semantic Document Analysis
==================================================

1️⃣  Semantic Chunking...
   Using strategy: Hybrid smart chunking
   Created 15 semantic chunks
   Chunk types: { section: 12, paragraphs: 3 }
   Complexity distribution: { high: 8, medium: 5, low: 2 }

2️⃣  Background Research...
   Identified 7 background topics
   - Keynesian multiplier: Document discusses fiscal impacts
   - Statistical power analysis: Referenced but not explained
   - Difference-in-differences methodology: Used without context

3️⃣  Initial Analysis Scan...
   Scanning 15 chunks...
   Found 23 areas needing investigation
   Priority breakdown: { high: 8, medium: 10, low: 5 }

4️⃣  Deep Investigation...
   Performing 8 deep investigations...
   Found 12 issues in deep investigation
   Severity breakdown: { critical: 2, major: 7, minor: 3 }

5️⃣  Synthesis...
   Generating final report...

✅ Analysis Complete!
Results: outputs/semantic-research-paper-1234567-abcd/
```

## Output Structure

```
outputs/semantic-[jobId]/
├── state.json                    # Analysis state
├── report.md                     # Final report
├── dashboard.json                # Analysis metrics
├── background-research.json      # Topics needing context
├── investigations-needed.json    # Flagged areas
├── chunks/
│   ├── chunk-1.json             # Individual chunks with metadata
│   └── ...
└── investigations/
    ├── chunk-2-investigation.json   # Deep investigation results
    └── ...
```

## Key Benefits

### 1. **Contextual Understanding**
- Chunks maintain semantic coherence
- Related content stays together
- Document structure is preserved

### 2. **Efficient Resource Use**
- Not everything gets deep analysis
- High-priority sections get more attention
- Background research prevents misunderstandings

### 3. **Transparent Process**
```json
// You can see exactly what was flagged and why
{
  "chunkId": "chunk-5",
  "chunkHeader": "Statistical Analysis",
  "investigations": [
    {
      "location": "lines 45-47",
      "concernType": "suspicious_data",
      "priority": "high",
      "reason": "P-values seem selectively reported"
    }
  ]
}
```

## Configuration Options

```javascript
const analyzer = new SemanticAnalyzer({
    chunkingStrategy: 'hybrid',        // headers|paragraphs|hybrid
    maxConcurrent: 4,                  // Parallel analyses
    deepInvestigationThreshold: 0.7    // Priority score threshold
});
```

## When to Use This

**Best for:**
- Academic papers with clear structure
- Technical documentation
- Research reports
- Long-form articles with sections

**Advantages over simple chunking:**
- Preserves logical flow
- Identifies what needs attention
- Gathers necessary context first
- More efficient use of resources

## Extending the System

### Add New Chunking Strategy
```javascript
CHUNKING_STRATEGIES.semantic_paragraphs = {
    name: "Semantic paragraph grouping",
    chunk: function(content) {
        // Use NLP to group related paragraphs
        // Even without LLM, can use:
        // - Keyword similarity
        // - Sentence embedding distance
        // - Topic modeling
    }
}
```

### Add New Investigation Type
```javascript
ANALYSIS_PHASES.methodology_check = {
    name: "Methodology Verification",
    prompt: `Check if methodology is sound...`,
    processResults: function(results) {
        // Parse specific methodology issues
    }
}
```

### Add Background Research Tools
```javascript
// Actually perform searches
async function gatherBackground(topics) {
    const background = {};
    for (const topic of topics) {
        background[topic.topic] = await webSearch(topic.query);
    }
    return background;
}
```

## Comparison with Previous Approaches

| Feature | Old (Arbitrary Chunks) | New (Semantic) |
|---------|------------------------|----------------|
| Chunk boundaries | Every N lines | Natural sections |
| Context preservation | Often split | Maintained |
| Analysis efficiency | Same effort everywhere | Targeted deep dives |
| Background context | Not considered | Gathered first |
| Document structure | Lost | Preserved |

This approach is much smarter about how it analyzes documents!