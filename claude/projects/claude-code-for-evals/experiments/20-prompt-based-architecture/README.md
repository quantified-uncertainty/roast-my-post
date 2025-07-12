# Experiment 20: Prompt-Based Document Analysis Architecture

A complete rewrite of the document analysis system with a focus on robustness, resumability, and modularity.

## Overview

This experiment introduces four new architectures that address the fragility issues in previous versions:

1. **Simple Analyzer** - Single-file, minimal complexity
2. **Resumable Analyzer** - Chunk-based with job tracking
3. **Prompt-Based Analyzer** - Modular prompt templates with tool integration
4. **Semantic Analyzer** - Smart chunking with investigation flagging and background research

## Quick Start

### Option 1: Simple Analyzer (Best for small documents)
```bash
./simple-analyzer.js document.md

# Output: outputs/document-[timestamp]/
# - report.md
# - findings.json
# - summary.md
```

### Option 2: Resumable Analyzer (Best for large documents)
```bash
# First run
./resumable-analyzer.js large-document.md

# Resume if interrupted
./resumable-analyzer.js large-document.md outputs/large-document-*/

# Check status
cat outputs/large-document-*/dashboard.md
```

### Option 3: Prompt-Based Analyzer (Most flexible)
```bash
# List available analysis types
./prompt-based-analyzer.js --list

# Run with specific analyses
./prompt-based-analyzer.js document.md --prompts logical_errors,factual_claims

# Resume failed jobs
./prompt-based-analyzer.js document.md outputs/document-*/
```

### Option 4: Semantic Analyzer (Smartest approach)
```bash
# Analyze with smart chunking and investigation flagging
./semantic-analyzer.js document.md

# Use different chunking strategies
./semantic-analyzer.js document.md --strategy headers
./semantic-analyzer.js document.md --strategy hybrid

# View what needs investigation
cat outputs/semantic-*/investigations-needed.json
```

## Architecture Comparison

| Feature | Simple | Resumable | Prompt-Based | Semantic |
|---------|--------|-----------|--------------|----------|
| **Lines of code** | ~300 | ~600 | ~800 | ~700 |
| **Max document size** | ~50 pages | Unlimited | Unlimited | Unlimited |
| **Resume on failure** | No | Yes | Yes | No* |
| **Custom analyses** | Modify code | Modify code | Add prompts | Modify phases |
| **Job visibility** | No | Full dashboard | Full dashboard | Investigation tracking |
| **Tool integration** | Basic | Basic | Full support | Ready for tools |
| **Smart chunking** | No | No | No | Yes |
| **Background research** | No | No | No | Yes |
| **Investigation flagging** | No | No | No | Yes |
| **Best for** | Quick analysis | Large docs | Production use | Research papers |

*Can be added by combining with resumable architecture

## Key Improvements Over Previous Versions

### 1. No More Variable Binding Errors
- Pure JavaScript (no bash/parallel issues)
- Proper async/await handling
- Clean error propagation

### 2. Document Size Limitations Solved
- Chunking with overlaps
- Parallel chunk processing
- Memory-efficient streaming

### 3. Transparent Job Management
```
📊 Job Status:
Total Jobs: 60
✅ Completed: 57 (95%)
⏳ Pending: 0
🔄 Running: 0
❌ Failed: 3

Failed Jobs:
- job-15: Timeout after 300s
- job-32: Claude API error
- job-45: Timeout after 300s
```

### 4. Standardized Prompt Library
```javascript
// Easy to add new analysis types
ANALYSIS_PROMPTS = {
    logical_errors: { /* template */ },
    factual_claims: { /* template */ },
    statistical_analysis: { /* template */ },
    // ... 10+ more types
}
```

## Prompt-Based Architecture Details

### Available Analysis Types

Run `./prompt-based-analyzer.js --list` to see all available prompts:

- **logical_errors** - Find logical inconsistencies
- **factual_claims** - Identify claims needing verification
- **statistical_analysis** - Analyze statistical claims
- **argument_structure** - Evaluate argument quality
- **citation_verification** - Verify references
- **causal_claims** - Analyze cause-effect claims
- **temporal_claims** - Verify time-based claims
- **quantitative_analysis** - Check calculations
- ... and more

### Adding Custom Prompts

Add to `ANALYSIS_PROMPTS` in `prompt-based-analyzer.js`:

```javascript
custom_analysis: {
    name: "Custom Analysis Type",
    description: "What this analysis does",
    prompt: `Your prompt template here...
    
    Use these formats:
    FINDING: [line] | [severity] | [quote] | [issue]
    VERIFY: [claim] | [search query]
    
    Text section (lines {startLine}-{endLine}):
    {content}`,
    tools: ["web_search", "calculate"],
    estimatedTokens: 2000
}
```

### Tool Integration

Each prompt can declare tools it needs:

```javascript
tools: ["web_search", "verify_claim", "calculate"]
```

Claude will know these tools are available and can use them as needed.

## Configuration

### Environment Variables

```bash
# Common settings
CHUNK_SIZE=2000        # Tokens per chunk (default: 2000)
CHUNK_OVERLAP=200      # Overlap between chunks (default: 200)
MAX_CONCURRENT=6       # Parallel jobs (default: 4)
TIMEOUT=600           # Seconds per job (default: 300)

# Examples
CHUNK_SIZE=3000 MAX_CONCURRENT=8 ./resumable-analyzer.js thesis.md
```

## Output Structure

### Simple Analyzer
```
outputs/document-[timestamp]/
├── report.md          # Final report
├── findings.json      # All findings
├── metadata.json      # Analysis metadata
└── summary.md         # Quick overview
```

### Resumable/Prompt-Based Analyzer
```
outputs/document-[timestamp]/
├── state.json         # Job state (for resuming)
├── dashboard.md       # Visual status overview
├── report.md          # Final report (if completed)
├── all-findings.json  # Aggregated findings
├── chunks/            # Document chunks
│   ├── chunk-1.txt
│   └── ...
├── job-results/       # Individual job outputs
│   ├── job-1.json
│   └── ...
└── verification-requests.json  # Claims needing verification
```

## Cost Estimates

Based on Claude 4 Sonnet pricing:

| Document Size | Simple Analyzer | Resumable | Prompt-Based (5 prompts) |
|--------------|-----------------|-----------|--------------------------|
| 10 pages | $0.10-0.20 | $0.15-0.25 | $0.25-0.40 |
| 50 pages | $0.30-0.50 | $0.40-0.60 | $0.60-1.00 |
| 200 pages | Not suitable | $1.00-1.50 | $1.50-2.50 |

## When to Use Each Architecture

### Simple Analyzer
- Documents < 50 pages
- Need quick results
- Don't need to resume
- Single-pass analysis is sufficient

### Resumable Analyzer
- Large documents (100+ pages)
- Unreliable environment
- Need failure recovery
- Want to see progress

### Prompt-Based Analyzer
- Need specific analysis types
- Want standardized outputs
- Building a production system
- Need tool integration
- Want to add custom analyses

## Development

### Running Tests
```bash
# Test with a small document
./simple-analyzer.js test-documents/simple-test.md

# Test resumability
./resumable-analyzer.js test-documents/comprehensive-test.md
# Ctrl+C to interrupt
./resumable-analyzer.js test-documents/comprehensive-test.md outputs/*/

# Test specific prompts
./prompt-based-analyzer.js test-documents/test.md --prompts logical_errors
```

### Adding New Features

1. **New analysis types**: Add to `ANALYSIS_PROMPTS`
2. **New tools**: Add to `AVAILABLE_TOOLS`
3. **Custom output formats**: Modify `parseResults()`
4. **Different chunking**: Modify `chunkDocument()`

## Migration from Previous Experiments

This experiment replaces the complex bash/node hybrid architecture with cleaner alternatives:

- No more GNU parallel issues
- No more variable binding errors
- No more file parsing problems
- Clear job status and resumability
- Modular, extensible design

## Next Steps

1. Choose the architecture that fits your needs
2. Run with test documents to verify setup
3. Customize prompts for your domain
4. Process verification requests as needed
5. Generate final reports with verified claims