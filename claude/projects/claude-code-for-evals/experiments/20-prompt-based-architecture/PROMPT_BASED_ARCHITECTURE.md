# Prompt-Based Architecture

## Core Concept: Standardized Analysis Prompts

Instead of custom code for each analysis type, we have a **library of reusable prompt templates** that can be applied to any document chunk.

## Example Prompt Library

```javascript
ANALYSIS_PROMPTS = {
    logical_errors: {
        name: "Logical Error Detection",
        prompt: "Find logical errors in this text...",
        tools: ["verify_claim", "check_definition"],
        estimatedTokens: 2000
    },
    
    factual_claims: {
        name: "Factual Claim Verification", 
        prompt: "Identify all factual claims...",
        tools: ["web_search", "verify_statistic"],
        estimatedTokens: 2500
    },
    
    statistical_analysis: {
        name: "Statistical Claim Analysis",
        prompt: "Analyze statistical claims...", 
        tools: ["calculate", "verify_statistic"],
        estimatedTokens: 2000
    }
    // ... 10+ more prompt types
}
```

## Job Creation Process

```
Document → Chunks → Prompts → Jobs

Example with 3 chunks and 5 prompts = 15 jobs:

┌─────────────────────────────────────────────┐
│ Chunk 1 (lines 1-500)                       │
├─────────────────────────────────────────────┤
│ Job 1:  logical_errors     on chunk-1       │
│ Job 2:  factual_claims     on chunk-1       │
│ Job 3:  statistical_analysis on chunk-1      │
│ Job 4:  argument_structure on chunk-1        │
│ Job 5:  citation_verification on chunk-1     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Chunk 2 (lines 450-950)                     │
├─────────────────────────────────────────────┤
│ Job 6:  logical_errors     on chunk-2       │
│ Job 7:  factual_claims     on chunk-2       │
│ Job 8:  statistical_analysis on chunk-2      │
│ Job 9:  argument_structure on chunk-2        │
│ Job 10: citation_verification on chunk-2     │
└─────────────────────────────────────────────┘
```

## Benefits of Prompt-Based Architecture

### 1. Standardization
- Each prompt type is consistent across all documents
- Easy to add new analysis types (just add a prompt)
- No custom code per analysis type

### 2. Tool Integration
```javascript
// Each prompt declares what tools it needs
factual_claims: {
    tools: ["web_search", "verify_statistic"],
    prompt: "For each claim, use web_search to verify..."
}

// Claude knows it can call these tools
VERIFY: "US population is 400M" | web_search("US population 2025")
```

### 3. Structured Output
Each prompt enforces specific output formats:
```
FINDING: [line] | [severity] | [quote] | [issue]
VERIFY: [claim] | [search query] | [expected source]
CALCULATE: [expression] | [expected result]
```

### 4. Selective Analysis
```bash
# Run all 10 prompt types
./prompt-based-analyzer.js document.md

# Run only specific analyses
./prompt-based-analyzer.js document.md --prompts logical_errors,factual_claims

# Add custom prompts for specific needs
./prompt-based-analyzer.js document.md --prompts financial_analysis,legal_compliance
```

## Example Usage Flow

### 1. Initial Run
```bash
$ ./prompt-based-analyzer.js research-paper.md --prompts logical_errors,factual_claims,statistical_analysis

📋 Prompt-Based Document Analysis
==================================================
Document: research-paper.md
Selected prompts: 3
Output: outputs/research-paper-1234567-abcd

1️⃣  Chunking document...
   Created 10 chunks

2️⃣  Creating jobs from prompt templates...
   Creating 30 jobs (10 chunks × 3 prompts)

📊 Job Summary by Prompt Type:
   Logical Error Detection: 10 jobs
   Factual Claim Verification: 10 jobs
   Statistical Claim Analysis: 10 jobs

   Estimated time: 15 minutes
   Estimated cost: $0.45

3️⃣  Running analysis jobs...
   Progress: 5/30
   Progress: 10/30
   Job job-15 failed: Timeout
   Progress: 29/30

📊 Job Status:
Total Jobs: 30
✅ Completed: 29 (97%)
❌ Failed: 1
```

### 2. Review Results
```bash
$ cat outputs/research-paper-1234567-abcd/dashboard.md

# Analysis Dashboard

## Findings by Prompt Type

| Prompt | Findings | Jobs |
|--------|----------|------|
| Logical Error Detection | 23 | 10 |
| Factual Claim Verification | 45 | 10 |
| Statistical Claim Analysis | 18 | 10 |

## Verification Requests

### Top verification needs:
- "GDP grew by 15% in 2024" (verify_stat)
- "Study shows 90% improvement" (verify_citation)
- "Population doubled since 2000" (verify_claim)
```

### 3. Process Verifications
```bash
# Extract all verification requests
$ cat outputs/research-paper-*/verification-requests.json

[
  {
    "type": "verify_stat",
    "claim": "GDP grew by 15% in 2024",
    "query": "GDP growth rate 2024 official statistics",
    "context": "BEA or World Bank data"
  },
  {
    "type": "verify_citation",
    "claim": "Smith et al. (2023) found 90% improvement",
    "query": "Smith 2023 study improvement metrics",
    "context": "Check if study exists and claims match"
  }
]

# Could feed these to a verification pipeline
```

## Adding New Analysis Types

Super easy to add new prompt types:

```javascript
// In ANALYSIS_PROMPTS object:
financial_analysis: {
    name: "Financial Claim Analysis",
    description: "Analyze financial claims and calculations",
    prompt: `Check all financial claims in this text.
    
For each financial claim:
FINANCIAL: [line] | [amount/percentage] | [context] | [issue if any]

For calculations:
CALC_CHECK: [line] | [calculation] | [your result] | [matches: yes/no]

Text section (lines {startLine}-{endLine}):
{content}`,
    tools: ["calculate", "verify_market_data"],
    estimatedTokens: 2000
}
```

## Extending with Custom Tools

```javascript
// Define new tools
AVAILABLE_TOOLS = {
    verify_market_data: {
        description: "Check stock prices, market data",
        implementation: "Yahoo Finance API"
    },
    check_regulation: {
        description: "Verify regulatory compliance",
        implementation: "Legal database search"
    }
}

// Use in prompts
regulatory_compliance: {
    tools: ["check_regulation", "search_legal"],
    prompt: "Check regulatory compliance claims..."
}
```

## Why This Architecture Works

1. **Modular**: Each prompt is independent
2. **Reusable**: Same prompts work on any document
3. **Extensible**: Easy to add new analysis types
4. **Tool-Ready**: Prompts can request specific tools
5. **Resumable**: Failed jobs can be retried
6. **Transparent**: Clear what each job is doing
7. **Scalable**: Can run 100s of jobs in parallel

## Comparison

| Feature | Old Architecture | Prompt-Based |
|---------|-----------------|--------------|
| Adding new analysis | Write new code | Add prompt template |
| Consistency | Varies by implementation | Standardized format |
| Tool integration | Complex | Declarative |
| Debugging | Check multiple files | Check one prompt |
| Customization | Modify code | Select prompts |
| Output format | Varies | Structured |