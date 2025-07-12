# Resumable Architecture Overview

## Key Features

### 1. Document Chunking
```
Original Document (10,000 lines)
    ↓
Chunk 1: Lines 1-500 (with 50 line overlap)
Chunk 2: Lines 450-950 (with 50 line overlap)
Chunk 3: Lines 900-1400 (with 50 line overlap)
... etc
```

**Benefits**:
- No token limits - can handle documents of ANY size
- Overlapping chunks ensure nothing is missed at boundaries
- Each chunk is independently analyzable

### 2. Job-Based Processing
```
3 chunks × 3 analysis types = 9 jobs

Job Status Board:
┌─────────────┬──────────────┬─────────────┐
│ job-1       │ job-2        │ job-3       │
│ chunk-1     │ chunk-1      │ chunk-1     │
│ factual     │ logical      │ statistical │
│ ✅ COMPLETE │ ✅ COMPLETE  │ ❌ FAILED   │
├─────────────┼──────────────┼─────────────┤
│ job-4       │ job-5        │ job-6       │
│ chunk-2     │ chunk-2      │ chunk-2     │
│ factual     │ logical      │ statistical │
│ ⏳ PENDING  │ ⏳ PENDING   │ ⏳ PENDING  │
└─────────────┴──────────────┴─────────────┘
```

### 3. State Persistence
```json
{
  "jobId": "doc-analysis-12345",
  "documentPath": "long-document.md",
  "chunks": [
    { "id": "chunk-1", "startLine": 1, "endLine": 500 },
    { "id": "chunk-2", "startLine": 450, "endLine": 950 }
  ],
  "jobs": [
    {
      "id": "job-1",
      "chunkId": "chunk-1",
      "analysisType": "factual_accuracy",
      "status": "completed",
      "findingsCount": 5
    },
    {
      "id": "job-3",
      "chunkId": "chunk-1", 
      "analysisType": "statistical_validity",
      "status": "failed",
      "error": "Timeout after 300s",
      "attempts": 2
    }
  ]
}
```

## Usage Examples

### First Run
```bash
$ ./resumable-analyzer.js long-document.md

📄 Resumable Document Analysis
==================================================
Document: long-document.md
Job ID: long-document-1704903600000-a1b2c3d4
Output: outputs/long-document-1704903600000-a1b2c3d4

1️⃣  Chunking document...
   Created 20 chunks (2000 tokens each with 200 token overlap)

2️⃣  Classifying document...
   Type: research
   Analysis types: factual_accuracy, statistical_validity, citation_accuracy

3️⃣  Creating analysis jobs...
   Created 60 jobs (20 chunks × 3 analysis types)

4️⃣  Running analysis jobs...
   Progress: 12/60 (20%)
   Progress: 24/60 (40%)
   Job job-15 failed: Timeout
   Progress: 36/60 (60%)
   ...

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

⚠️  Some jobs failed. Run again to retry failed jobs.
Resume command: ./resumable-analyzer.js "long-document.md" "outputs/long-document-1704903600000-a1b2c3d4"
```

### Resume/Retry
```bash
$ ./resumable-analyzer.js long-document.md outputs/long-document-1704903600000-a1b2c3d4

📄 Resumable Document Analysis
==================================================
Document: long-document.md
Job ID: long-document-1704903600000-a1b2c3d4
Output: outputs/long-document-1704903600000-a1b2c3d4

♻️  Resuming job from outputs/long-document-1704903600000-a1b2c3d4

📊 Job Status:
Total Jobs: 60
✅ Completed: 57 (95%)
⏳ Pending: 0
🔄 Running: 0
❌ Failed: 3

4️⃣  Running analysis jobs...
   Running 3 pending jobs...
   Progress: 58/60 (97%)
   Progress: 59/60 (98%)
   Progress: 60/60 (100%)

5️⃣  Synthesizing results...
   Total findings: 234 (245 before deduplication)

==================================================
📊 Job Status:
Total Jobs: 60
✅ Completed: 60 (100%)
⏳ Pending: 0
🔄 Running: 0
❌ Failed: 0
```

## Output Structure
```
outputs/long-document-1704903600000-a1b2c3d4/
├── state.json           # Complete job state (for resuming)
├── dashboard.md         # Visual overview of the analysis
├── report.md           # Final synthesized report
├── all-findings.json   # Deduplicated findings
├── chunks/
│   ├── chunk-1.txt     # Document chunks for inspection
│   ├── chunk-2.txt
│   └── ...
└── findings/
    ├── job-1.json      # Individual job results
    ├── job-2.json
    └── ...
```

## Key Advantages

1. **Resumable**: If it crashes, just run the same command to continue
2. **Transparent**: Can see exactly which jobs failed and why
3. **Scalable**: Can handle documents of ANY size
4. **Debuggable**: Each job's input/output is saved
5. **Parallelizable**: Can increase MAX_CONCURRENT for faster processing
6. **Retryable**: Failed jobs are automatically retried

## Configuration

```bash
# Environment variables
CHUNK_SIZE=3000           # Tokens per chunk (default: 2000)
CHUNK_OVERLAP=300         # Token overlap between chunks (default: 200)
MAX_CONCURRENT=8          # Parallel jobs (default: 4)
TIMEOUT=600               # Seconds per job (default: 300)

# Example for large documents
CHUNK_SIZE=4000 MAX_CONCURRENT=8 ./resumable-analyzer.js thesis.md
```

## Comparison with Current Architecture

| Feature | Current | Resumable |
|---------|---------|-----------|
| Max document size | ~8k tokens | Unlimited |
| Resume on failure | No | Yes |
| Visible progress | Limited | Full dashboard |
| Failed job retry | Manual | Automatic |
| Debugging | Hard | Easy (see individual jobs) |
| State management | Files everywhere | Single state.json |

## When to Use This

- **Large documents** (>50 pages)
- **Unreliable environment** (might timeout/crash)
- **Need visibility** into what's happening
- **Want to retry** specific failed analyses
- **Need to pause/resume** long analyses