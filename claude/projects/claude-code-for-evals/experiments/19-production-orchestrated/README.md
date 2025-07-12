# Experiment 19: Production-Ready Orchestrated Document Analysis

A complete system for parallel document analysis with web search verification and source citations.

## Key Features

✅ **Intelligent Document Classification**
- LLM-based classification (technical, empirical, policy, opinion)
- Automatic task assignment based on document type
- Effort allocation based on error potential

✅ **Web Search Integration**
- Automatic fact-checking with web searches
- Source URL inclusion in all findings
- Cross-reference verification

✅ **Cost Tracking**
- Token usage monitoring
- Per-task cost breakdown
- Total analysis cost reporting

✅ **Professional Reports**
- Executive summary
- Categorized findings with sources
- Actionable recommendations

## Quick Start

```bash
# Option 1: Use the JavaScript orchestrator (recommended - better error handling)
./orchestrate-analysis.js document.md
# or
./orchestrate-js.sh document.md

# Option 2: Use the original bash orchestrator
./orchestrate-analysis.sh document.md

# Check results
cat outputs/document-[timestamp]/final-report.md
cat outputs/document-[timestamp]/cost-summary.txt
```

## System Architecture

1. **Document Classification** (`lib/analyze-document.js`)
   - Uses Claude to classify document type and flaw density
   - Determines appropriate analysis tasks

2. **Task Generation** 
   - Creates 2-5 analysis tasks based on document type
   - Assigns effort levels (minimal, focused, comprehensive)

3. **Parallel Execution**
   - Runs analysis tasks concurrently using GNU parallel
   - Each task uses Claude with specific prompts
   - Factual verification performs web searches

4. **Synthesis** (`strategies/synthesis.sh`)
   - Combines findings from all tasks
   - Preserves source citations
   - Generates final report

## Cost Estimates

Based on Claude 4 Sonnet pricing (via Claude Code):

| Document Type | Typical Cost | Range |
|--------------|--------------|-------|
| Simple (1-2 claims) | $0.10-0.20 | Low complexity |
| Standard (5-10 claims) | $0.30-0.50 | Medium complexity |
| Complex (15+ claims) | $0.50-1.00 | High complexity |
| Research-heavy | $1.00-2.00 | Many web searches |

## Configuration

```bash
# Environment variables
export MAX_PARALLEL=4           # Concurrent tasks (default: 6)
export TIMEOUT_PER_TASK=600     # Task timeout in seconds (default: 600)
export TIMEOUT_SYNTHESIS=300    # Synthesis timeout (default: 300)
```

## Output Structure

```
outputs/
└── document-20250710-192627/
    ├── final-report.md         # Complete analysis report
    ├── all-findings.json       # All findings with sources
    ├── executive-summary.json  # Summary metrics
    ├── cost-summary.txt        # Cost breakdown
    ├── tasks/                  # Individual task results
    ├── prompts/                # Task prompts
    └── synthesis/              # Synthesis artifacts
```

## API Server

For integration with other systems:

```bash
# Start API server
node api-server.js

# Submit document
curl -X POST http://localhost:3001/analyze \
  -H "Content-Type: application/json" \
  -d '{"documentPath": "path/to/document.md"}'

# Check status
curl http://localhost:3001/status/{jobId}

# Get report
curl http://localhost:3001/report/{jobId}
```

## Troubleshooting

### GNU Parallel tty warnings
- Normal behavior, can be ignored
- Or suppress with: `2>&1 | grep -v "/dev/tty"`

### Task timeouts
- Increase `TIMEOUT_PER_TASK` for documents with many facts
- Web searches can take 30-60 seconds per claim

### Cost concerns
- Use `lib/estimate-costs.js` for pre-analysis estimates
- Check `cost-summary.txt` after each run
- Consider using Haiku 4 for lower-cost analyses

## Development

```bash
# Run cost estimate before analysis
node lib/estimate-costs.js document.md .

# Test web search functionality
./orchestrate-analysis.sh test-documents/comprehensive-test.md

# Check Claude CLI output format
./test-claude-output.sh
```

## Production Deployment

1. **Direct execution**: Run on server with Claude CLI installed
2. **API integration**: Use api-server.js with PM2/systemd
3. **Job queue**: Integrate with Bull/BullMQ for scaling
4. **Monitoring**: Track costs via usage reports

## Key Improvements from Experiment 18

- ✅ Enhanced web search prompts requiring complete URLs
- ✅ Source citations preserved through synthesis
- ✅ Cost tracking and reporting
- ✅ Cleaner code organization
- ✅ Production-ready API server
- ✅ Better error handling