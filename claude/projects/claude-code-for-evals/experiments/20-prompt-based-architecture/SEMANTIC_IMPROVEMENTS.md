# Semantic Analyzer: Key Improvements

## Summary of Your Three Requested Features

### 1. ✅ Semantic Chunking
**Implemented:** Multiple strategies for intelligent document splitting

- **Header-based**: Splits at h1/h2/h3 boundaries
- **Paragraph-based**: Groups paragraphs maintaining context
- **Hybrid**: Combines both approaches (recommended)

**Benefits:**
- Preserves document structure
- Keeps related content together
- No arbitrary line-count splits
- Metadata extraction (complexity, citations, numbers)

### 2. ✅ Investigation Flagging System
**Implemented:** Two-phase analysis with smart prioritization

**Phase 1 - Initial Scan:**
```
INVESTIGATE: "45% increase" | complex_claim | high | No baseline provided
INVESTIGATE: "p<0.05" | suspicious_data | medium | Multiple testing not addressed
SECTION_PRIORITY: high | Contains unverified statistical claims
```

**Phase 2 - Deep Investigation:**
- Only investigates flagged areas
- Prioritizes high-concern sections
- Saves compute resources
- More thorough analysis where needed

### 3. ✅ Background Research Phase
**Implemented:** Identifies context needed before analysis

```
RESEARCH_NEEDED: Keynesian multiplier | Document discusses fiscal impacts | "Keynesian multiplier theory"
RESEARCH_NEEDED: GARCH models | Used without explanation | "GARCH volatility modeling"
```

**Benefits:**
- Prevents misunderstanding technical terms
- Identifies missing context
- Could be extended to actually perform searches
- Informs subsequent analysis

## How They Work Together

```
Document → Smart Chunks → Background Research → Initial Scan → Investigation Flags → Deep Analysis

Example Flow:
1. Chunk by headers (Methodology, Results, etc.)
2. Identify "GARCH model" needs background
3. Initial scan flags "suspicious p-values" in Results
4. Deep investigation focuses only on flagged statistics
```

## Practical Example

### Input Document
```markdown
## Methodology
We used GARCH(1,1) models to analyze volatility...
Sample size was n=10,000 with p<0.05 significance...

## Results  
Returns increased by 45% during the study period...
The effect was statistically significant across all models...
```

### Semantic Chunking Output
```
Chunk 1: "Methodology" (high complexity, has statistics)
Chunk 2: "Results" (high complexity, has numbers)
```

### Background Research Identifies
```
- GARCH models need explanation
- Statistical power for n=10,000
```

### Investigation Flags
```
Methodology chunk:
- "p<0.05" needs investigation (multiple comparisons?)
- "n=10,000" seems arbitrary (power analysis?)

Results chunk:
- "45%" needs context (from what baseline?)
- "all models" is vague (which models?)
```

### Deep Investigation (only on flagged items)
```
Finding: Major issue with "45% increase" - no baseline year specified
Finding: Critical issue with p-values - no correction for multiple testing
```

## Advantages Over Previous Approach

### Old Way (Arbitrary Chunks)
- Split at line 500 (middle of methodology)
- Analyze everything with same intensity
- No context about GARCH models
- Might miss connection between method and results

### New Way (Semantic)
- Keeps methodology together
- Identifies what needs deep analysis
- Gathers necessary background first
- Focuses effort where needed

## Extension Ideas

### 1. Combine with Prompt-Based System
```javascript
// After investigation flagging, assign specific prompts
if (investigation.concernType === 'statistical_claim') {
  assignPrompt('statistical_analysis');
} else if (investigation.concernType === 'causal_claim') {
  assignPrompt('causal_analysis');
}
```

### 2. Actually Perform Background Research
```javascript
async function gatherBackground(topics) {
  for (const topic of topics) {
    const context = await webSearch(topic.query);
    const summary = await summarize(context);
    background[topic.topic] = summary;
  }
  return background;
}
```

### 3. Learning System
```javascript
// Track which flags led to actual findings
const flagAccuracy = {
  'suspicious_data': { flagged: 100, confirmed: 78 }, // 78% accurate
  'complex_claim': { flagged: 50, confirmed: 45 },    // 90% accurate
};
// Adjust flagging thresholds based on accuracy
```

## Testing the System

```bash
# Test chunking strategies
node test-chunking.js

# Run semantic analysis
./semantic-analyzer.js test-documents/structured-paper.md

# Compare outputs
ls outputs/semantic-*/
cat outputs/semantic-*/investigations-needed.json
cat outputs/semantic-*/report.md
```

## Key Insight

This approach mimics how a human expert would analyze a document:
1. **Skim for structure** (semantic chunking)
2. **Identify unfamiliar concepts** (background research)  
3. **Flag suspicious areas** (investigation flagging)
4. **Deep dive on problems** (targeted investigation)

Much more efficient and intelligent than analyzing every line with equal intensity!