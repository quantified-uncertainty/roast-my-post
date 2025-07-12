# Experiment 08: Optimized Claude Code

## Overview
This experiment tests the hypothesis that pre-loading file contents can dramatically speed up Claude Code while maintaining quality.

## Key Insight
The 16-minute runtime in experiment 07 was largely due to ~100 unnecessary file Read/Write operations. By pre-loading the document content and having Claude output directly, we can eliminate this overhead.

## Approaches

### 1. Optimized Claude Code (`optimized-claude-code.js`)
- Pre-loads document content into the prompt
- Eliminates all file Read/Write operations
- Only uses WebSearch when needed
- Expected runtime: **3-5 minutes** (vs 16 minutes)

### 2. Direct API with Tools (`direct-api-agent.js`) 
- Uses Anthropic SDK directly
- Implements custom tool handling
- More complex but gives full control
- Expected runtime: **2-4 minutes**

## Expected Results
- **Same quality** (25-30 specific errors found)
- **75% faster** (3-5 min vs 16 min)
- **Same or lower cost** (~$0.20-0.35)

## Usage

### Quick Test (Optimized Claude Code)
```bash
node optimized-claude-code.js > output.md
```

### Direct API Approach
```bash
ANTHROPIC_API_KEY=your-key node direct-api-agent.js
```

## Trade-offs

### Optimized Claude Code
✅ Simple - just one execSync call  
✅ Still uses Claude Code's intelligence  
✅ WebSearch still works  
❌ Output format less structured  
❌ No incremental progress saving  

### Direct API
✅ Full control over process  
✅ Can implement custom logic  
❌ Complex to implement properly  
❌ Need to handle all edge cases  

## Hypothesis
By eliminating file I/O overhead, we can get 75% speed improvement while maintaining the same quality of error detection. The key is giving Claude all the context upfront rather than making it request information through tools.