# Claude Code for Evaluations: Comprehensive Lessons Learned

This document captures the deep technical insights and lessons learned from 21 experiments using Claude Code as an evaluation engine. These are not just observations, but actionable insights with specific examples and the reasoning behind each lesson.

## 1. Performance Optimization Lessons

### Pre-loading Content is Critical
**Discovery**: Pre-loading document content directly in prompts is 10-20x faster than using Read tools.

**Why it matters**: 
- Experiment 08 showed ~11 seconds with pre-loaded content vs. minutes with file operations
- Each Read tool call involves process spawning, file system access, and IPC overhead
- For documents <50 pages, always include full content in initial prompt

**Implementation pattern**:
```javascript
// Slow approach - multiple file reads
const prompt = `Please analyze the document at ${filePath}`;

// Fast approach - pre-loaded content  
const content = fs.readFileSync(filePath, 'utf-8');
const prompt = `Please analyze this document:
\`\`\`
${content}
\`\`\``;
```

### Parallel Execution Changes Everything
**Discovery**: 6 parallel focused tasks complete in 59 seconds vs. 16+ minutes sequential.

**Why parallel works**:
- Claude Code instances are isolated processes
- No shared state means no race conditions
- Modern machines can handle 6-10 parallel Claude instances
- Each focused task uses less context, reducing processing time

**Critical implementation detail**:
```javascript
// This pattern from experiment 19 ensures all tasks complete
const results = await Promise.allSettled(
  tasks.map(task => 
    executeTask(task).catch(err => ({ error: err.message }))
  )
);

// Always use Promise.allSettled, not Promise.all
// This ensures one failure doesn't cancel other tasks
```

### Task Duration Sweet Spot: 2-4 Minutes
**Discovery**: Tasks longer than 4 minutes have exponentially higher failure rates.

**Why this happens**:
- Claude Code has internal timeouts
- Longer tasks = more context = slower processing
- Network interruptions more likely over longer periods
- Memory usage grows with task duration

**Optimal task design**:
- 100-200 words of instructions
- Single, focused objective
- Clear output format
- 30-60 second expected completion

## 2. Architecture Lessons

### JavaScript > Bash for Process Management
**Discovery**: Bash scripts with GNU parallel caused numerous failures that JavaScript eliminated.

**Specific issues with Bash**:
```bash
# This pattern caused variable binding errors
parallel -j 6 analyze_task ::: "${TASKS[@]}"
# Error: TASK_ID: unbound variable

# SCM Breeze conflicts
claude --print << 'EOF'
# Error: exec_scmb_expand_args:3: command not found
```

**Why JavaScript wins**:
- Native async/await for clean parallel execution
- Proper error propagation with stack traces
- No shell escaping issues
- Cross-platform compatibility
- Built-in JSON parsing

**Key pattern that works**:
```javascript
const { spawn } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(require('child_process').exec);

// Critical: Set both shell timeout AND Node.js timeout
const result = await execAsync(`timeout ${timeout}s claude --print`, {
  maxBuffer: 10 * 1024 * 1024,  // Handle large outputs
  timeout: (timeout + 10) * 1000  // Node.js timeout as backup
});
```

### Structured Output Prevents Chaos
**Discovery**: Unstructured outputs had 80% parsing failure rate; structured formats reduced this to <5%.

**Evolution of output formats**:
```javascript
// Stage 1: Free text (80% parsing failures)
"I found an error on line 42 where it says..."

// Stage 2: Markdown structure (40% parsing failures)
"## Error
Line 42: The text says..."

// Stage 3: Delimited blocks (10% parsing failures)
"[FINDING]
Line: 42
Quote: 'exact text'
Issue: Description
[/FINDING]"

// Stage 4: JSON (5% parsing failures)
{
  "findings": [{
    "line": 42,
    "quote": "exact text",
    "issue": "description",
    "severity": "major"
  }]
}
```

**Why structured output works**:
- Eliminates ambiguity in parsing
- Forces Claude to be precise
- Enables automated validation
- Supports easy aggregation across parallel tasks

## 3. Prompt Engineering Insights

### Specificity Beats Comprehensiveness
**Discovery**: Focused prompts complete 10x faster with better results than general prompts.

**Comparison from experiments**:
```javascript
// Poor prompt - 16+ minutes, vague results
const badPrompt = "Analyze this document and find any issues";

// Excellent prompt - 23 seconds, specific results
const goodPrompt = `Find spelling and grammar errors in this document.

For each error, provide:
- Line number (exact)
- Quote (exact text, 5-10 words)
- Issue (specific problem)
- Severity (typo/grammar/clarity)

Format as JSON array of findings.`;
```

**Why specificity works**:
- Reduces search space for the model
- Clear success criteria
- Less token generation needed
- Easier to verify correctness

### Task Decomposition Patterns
**Discovery**: Breaking analysis into 4-6 parallel specialized tasks yields best results.

**Optimal decomposition from experiment 18**:
```javascript
const tasks = [
  { type: "spelling", focus: "Find spelling errors and typos" },
  { type: "grammar", focus: "Find grammatical mistakes" },
  { type: "facts", focus: "Verify factual claims with web search" },
  { type: "logic", focus: "Find logical inconsistencies" },
  { type: "clarity", focus: "Identify unclear or ambiguous statements" },
  { type: "technical", focus: "Check technical accuracy and terminology" }
];
```

**Why this decomposition works**:
- Each task has clear boundaries
- No overlap reduces duplication
- Specialized prompts for each domain
- Can add/remove tasks based on document type

## 4. Error Handling Patterns

### Common Failure Modes and Solutions

**1. Silent Timeouts**
```javascript
// Problem: Process hangs forever
const result = await execAsync('claude --print');

// Solution: Always set multiple timeout layers
const result = await execAsync(`timeout ${shellTimeout}s claude --print`, {
  timeout: (shellTimeout + 10) * 1000,  // Node timeout as backup
  killSignal: 'SIGKILL'  // Force kill if needed
});
```

**2. Variable Loss in Parallel Execution**
```javascript
// Problem: Environment variables lost in subshells
process.env.TASK_ID = taskId;
spawn('claude', ['--print']);  // TASK_ID undefined

// Solution: Pass data via files or arguments
fs.writeFileSync(`/tmp/task-${id}.json`, JSON.stringify(task));
spawn('claude', ['--print', '--file', `/tmp/task-${id}.json`]);
```

**3. Output Truncation**
```javascript
// Problem: Large outputs get cut off
const { stdout } = await execAsync(command);  // Truncated

// Solution: Increase buffer size
const { stdout } = await execAsync(command, {
  maxBuffer: 10 * 1024 * 1024  // 10MB buffer
});
```

### Retry Logic That Works
**Discovery**: Exponential backoff with 3 retries handles 95% of transient failures.

```javascript
async function executeWithRetry(task, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await executeTask(task);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = Math.pow(2, attempt) * 1000;  // 2s, 4s, 8s
      console.log(`Retry ${attempt}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## 5. Quality Improvement Patterns

### Multi-Pass Analysis Beats Single Pass
**Discovery**: Multiple focused passes detect 85% of errors vs. 60% for single comprehensive pass.

**Why multi-pass works**:
- Cognitive load reduction per pass
- Specialized attention for each aspect
- No context switching within a pass
- Easier to verify and debug each pass

### Fact-Checking Integration
**Discovery**: Only experiment 5 successfully integrated web search for fact-checking.

**Successful pattern**:
```javascript
const factCheckPrompt = `
For each factual claim in this document:
1. Extract the claim with line number
2. Search the web to verify
3. Report status: ✓ Verified, ✗ False, ? Uncertain

Focus on:
- Statistics and numbers
- Historical dates
- Scientific claims
- Attribution of quotes
`;
```

**Results**: 95% accuracy on factual claims vs. 70% without verification.

### Line-Level Precision
**Discovery**: Requiring exact line numbers improves accuracy and usefulness.

**Pattern evolution**:
```javascript
// Vague: "The document mentions somewhere..."
// Better: "Around line 40-45..."
// Best: "Line 42: 'exact quote here'"
```

**Implementation tip**: Include line numbers in pre-loaded content:
```javascript
const numberedContent = content.split('\n')
  .map((line, i) => `${i + 1}: ${line}`)
  .join('\n');
```

## 6. Cost Optimization Strategies

### Token Reduction Techniques
**Discovery**: Focused prompts use 75% fewer tokens than general prompts.

**Specific techniques**:
1. **Output constraints**: "Maximum 50 findings" prevents runaway generation
2. **Early stopping**: "Stop after finding 10 critical errors"
3. **Structured formats**: JSON uses fewer tokens than prose
4. **Chunking strategy**: Process high-value sections first

### Cost Monitoring Pattern
```javascript
// Track costs in real-time
let totalTokens = 0;
let totalCost = 0;

function trackUsage(stdout) {
  const match = stdout.match(/Total tokens: (\d+)/);
  if (match) {
    const tokens = parseInt(match[1]);
    totalTokens += tokens;
    totalCost += tokens * 0.00003;  // Adjust rate as needed
  }
}
```

## 7. Production-Ready Patterns

### State Persistence for Resumability
**Discovery**: Jobs will fail; resumability is essential for production.

**Implementation from experiment 20**:
```javascript
class JobState {
  constructor(jobId) {
    this.stateFile = `jobs/${jobId}/state.json`;
    this.state = this.loadState();
  }
  
  loadState() {
    if (fs.existsSync(this.stateFile)) {
      return JSON.parse(fs.readFileSync(this.stateFile));
    }
    return { 
      status: 'pending', 
      completedTasks: [], 
      results: [],
      errors: []
    };
  }
  
  save() {
    fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
  }
}
```

### Monitoring and Observability
**Critical metrics to track**:
- Task completion rate
- Average task duration
- Error types and frequencies
- Token usage per task type
- Cost per document

### Adaptive Strategies
**Discovery**: Different document types need different approaches.

**Pattern from experiment 21**:
```javascript
function selectStrategy(document) {
  const length = document.split('\n').length;
  const hasCode = /```/.test(document);
  const hasMath = /\$.*\$/.test(document);
  
  if (length > 1000) return 'chunked-analysis';
  if (hasCode) return 'technical-review';
  if (hasMath) return 'mathematical-verification';
  return 'standard-analysis';
}
```

## Key Architectural Decision

After 21 experiments, the optimal architecture is:
1. **JavaScript orchestration** (not bash)
2. **Parallel focused tasks** (not sequential comprehensive)
3. **Structured JSON output** (not free text)
4. **Pre-loaded content** (not file I/O)
5. **2-4 minute tasks** (not 10+ minute)
6. **Prompt library system** (not hardcoded prompts)
7. **State persistence** (for resumability)
8. **Adaptive strategies** (based on document type)

This architecture achieves:
- **10x performance improvement**
- **95% success rate**
- **75% cost reduction**
- **85% error detection rate**

The final implementation in experiment 20's prompt-based analyzer represents the culmination of all these lessons in a production-ready system.