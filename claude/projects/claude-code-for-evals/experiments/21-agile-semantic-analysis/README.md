# Agile Semantic Analysis - Experiment 21

## MVP Implementation

This experiment implements a minimal viable version of the semantic analysis system you proposed, starting simple and building up incrementally.

### Current Features (MVP)

1. **Basic Semantic Chunking**
   - Header-based splitting (h1, h2, h3)
   - Preserves line numbers for each chunk
   - Simple and predictable

2. **Two Analysis Types**
   - **Factual Claims**: Identifies claims that need verification
   - **Logical Consistency**: Finds contradictions and reasoning errors
   - Both use structured output formats for easy parsing

3. **Sequential Processing**
   - Processes one chunk at a time
   - Simple error handling per analysis
   - No complexity from parallelism yet

4. **Simple Result Aggregation**
   - Combines findings from all chunks
   - Sorts by line number
   - Generates readable report + structured issue list

### Usage

```bash
# Make executable
chmod +x simple-semantic-analyzer.js

# Run on a document
./simple-semantic-analyzer.js test-document.md

# Output will be in outputs/analysis-[timestamp]/
```

### Output Files

- `chunks.json` - Document chunks with metadata
- `analysis-results.json` - Raw analysis results per chunk
- `all-findings.json` - Aggregated findings
- `report.md` - Human-readable report
- `issue-list.json` - Structured list of all issues

### Next Incremental Steps

Here's how we can build this up incrementally:

#### Phase 1: Enhanced Analysis Types
- Add context generation (summary of each chunk)
- Add mathematical verification type
- Add source/citation checking

#### Phase 2: Tool Integration
```javascript
// Add simple tool functions
const TOOLS = {
    web_search: async (query) => {
        // Use Claude to search and summarize
    },
    calculate: async (expression) => {
        // Use math.js or similar
    },
    verify_fact: async (claim) => {
        // Structured web verification
    }
};
```

#### Phase 3: Smarter Chunking
- Paragraph-based chunking for long sections
- Context-aware boundaries (don't split mid-argument)
- Chunk size optimization

#### Phase 4: Parallel Processing
- Process multiple chunks concurrently
- Budget-aware execution (stop when limit reached)
- Progress tracking

#### Phase 5: Investigation System
- Flag suspicious areas in first pass
- Deep dive on high-priority issues
- Cross-chunk contradiction detection

#### Phase 6: Advanced Features
- Deduplication of similar findings
- Severity scoring system
- Integration with existing roast-my-post infrastructure

### Example Enhancement: Adding Math Verification

```javascript
// Add to ANALYSIS_TYPES
mathematical_verification: {
    name: "Mathematical Verification",
    prompt: `Check mathematical claims and calculations in this section.

Section: {header}
Lines {startLine}-{endLine}:
{content}

For each mathematical claim, output:
MATH_CHECK: [line] | "[expression or claim]" | [verified/error/needs_data] | [explanation]

Example:
MATH_CHECK: 45 | "2+2=5" | error | Incorrect: 2+2=4`,
    
    tools: ['calculate'] // Future: will use calculator tool
}
```

### Architecture Benefits

1. **Incremental Development**
   - Each phase adds value independently
   - Can stop at any point with working system
   - Easy to test and debug

2. **Clear Separation**
   - Chunking logic separate from analysis
   - Analysis types are modular
   - Aggregation is independent

3. **Extensible**
   - Easy to add new analysis types
   - Simple to integrate tools
   - Can swap chunking strategies

### Comparison with Full System

| Feature | MVP | Full System |
|---------|-----|-------------|
| Chunking | Headers only | Semantic + context |
| Analysis Types | 2 | 6+ with specialization |
| Processing | Sequential | Parallel with budgets |
| Tools | None | Web, math, Claude Code |
| Investigation | Single pass | Two-phase with deep dives |
| Results | Simple aggregation | Deduplication + severity |

This MVP gives us a working foundation to build on!