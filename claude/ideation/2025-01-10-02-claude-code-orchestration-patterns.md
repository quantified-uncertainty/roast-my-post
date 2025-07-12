# Claude Code Orchestration Patterns for RoastMyPost

## The Opportunity: Composing Claude Code Instances

While a single Claude Code instance is expensive for document analysis, new orchestration patterns enable composing multiple instances to overcome the "giving up quickly" problem identified in PR #58.

## Available Orchestration Solutions

### 1. Claude-Flow v2.0.0 Alpha
**What it is**: Enterprise-grade orchestration platform with swarm intelligence

**Key Features**:
- Hive-mind architecture with Queen AI coordinating specialized workers
- 87 MCP tools integrated
- Parallel execution of multiple agents
- 84.8% SWE-Bench solve rate
- 32.3% token reduction through efficient task breakdown

**Example for RoastMyPost**:
```bash
# Deploy evaluation swarm
npx claude-flow@alpha hive-mind spawn \
  "Evaluate blog post from multiple perspectives" \
  --agents 5 \
  --strategy parallel \
  --memory-namespace roastmypost

# Agent roles could be:
# - Document Analyzer (extracts key points)
# - Fact Checker (verifies claims)
# - Writing Critic (evaluates style)
# - Logic Reviewer (checks arguments)
# - Synthesizer (combines all feedback)
```

### 2. Claude-Swarm
**What it is**: Simpler orchestration focusing on tree-like agent hierarchies

**Key Features**:
- MCP-based communication between agents
- Directory-scoped agents
- Configuration-driven setup
- Specialized role assignment

**Example configuration**:
```yaml
version: 1
swarm:
  name: "RoastMyPost Evaluation Team"
  main: coordinator
  instances:
    coordinator:
      description: "Manages document evaluation workflow"
      directory: ./evaluations
      tools: [mcp__roast-my-post__import_article]
    
    analyzer:
      description: "Deep content analysis"
      directory: ./analysis
      context_limit: 50000
    
    critic:
      description: "Provides specific critiques"
      directory: ./critiques
      retry_on_failure: true
```

### 3. Unix-Style Composition
**What it is**: Using Claude Code's Unix philosophy for simple pipelines

**Examples**:
```bash
# Chain evaluations with retry logic
claude -p "Extract main claims from document" --max-turns 5 | \
  claude -p "Fact-check these claims" --max-turns 10 | \
  claude -p "Synthesize into evaluation" --max-turns 5

# Parallel evaluation with process substitution
{
  claude -p "Analyze writing style" --max-turns 8 &
  claude -p "Check logical consistency" --max-turns 8 &
  claude -p "Evaluate evidence quality" --max-turns 8 &
} | claude -p "Combine these evaluations into final assessment"
```

## Solving the "Giving Up" Problem

### 1. Retry Orchestration Pattern
```python
def evaluate_with_retries(document, max_attempts=3):
    for attempt in range(max_attempts):
        result = subprocess.run([
            "claude", "-p", 
            f"Evaluate this document (attempt {attempt+1})",
            "--max-turns", "15",
            "--allowedTools", "mcp__roast-my-post__*"
        ], capture_output=True)
        
        if "evaluation complete" in result.stdout:
            return result
        
        # Feed failure back to next attempt
        context = f"Previous attempt failed: {result.stdout}"
```

### 2. Progressive Refinement Pattern
```bash
# Start with high-level analysis
INITIAL=$(claude -p "Identify key themes in document" --max-turns 5)

# Deep dive on each theme
for theme in $INITIAL; do
  claude -p "Analyze theme: $theme in detail" --max-turns 10
done

# Combine results
claude -p "Synthesize all theme analyses" --max-turns 8
```

### 3. Fallback Chain Pattern
```javascript
// Try specialized agent first, fall back to general
const evaluationChain = [
  { agent: "expert-critic", maxTurns: 20 },
  { agent: "general-reviewer", maxTurns: 15 },
  { agent: "basic-analyzer", maxTurns: 10 }
];

for (const config of evaluationChain) {
  const result = await runClaude(config);
  if (result.success) break;
}
```

## Cost Optimization with Orchestration

### Combined with Prompt Caching
1. **Document Cache**: Cache the document once (90% savings)
2. **Specialized Agents**: Each agent only processes relevant parts
3. **Parallel Processing**: Reduce wall-clock time
4. **Smart Retries**: Only retry failed components

### Expected Cost Reduction
- Base Claude Code: $76/million chars
- With prompt caching: $7.60/million chars
- With orchestration + caching: ~$2-3/million chars (estimated)
  - Document cached once, reused by all agents
  - Smaller context per agent
  - Efficient task distribution

## Implementation Recommendations

### For RoastMyPost Specifically

1. **Start Simple**: Unix-style composition
   - Easy to implement
   - No new dependencies
   - Can be added to existing scripts

2. **Progress to Claude-Swarm**: For structured evaluations
   - Better error handling
   - Configuration-driven
   - MCP integration built-in

3. **Consider Claude-Flow**: For production scale
   - Best performance metrics
   - Sophisticated coordination
   - But adds complexity

### Example Implementation
```bash
#!/bin/bash
# roast-my-post-orchestrated.sh

URL=$1
DOC_ID=$(claude -p "Import article from $URL" \
  --allowedTools mcp__roast-my-post__import_article \
  --output-format json | jq -r '.document_id')

# Parallel evaluation with different agents
{
  claude -p "Evaluate factual accuracy of document $DOC_ID" \
    --max-turns 15 \
    --allowedTools mcp__roast-my-post__* > eval_facts.json &
  
  claude -p "Evaluate argumentation quality of document $DOC_ID" \
    --max-turns 15 \
    --allowedTools mcp__roast-my-post__* > eval_logic.json &
  
  claude -p "Evaluate writing style of document $DOC_ID" \
    --max-turns 15 \
    --allowedTools mcp__roast-my-post__* > eval_style.json &
  
  wait
}

# Combine evaluations
claude -p "Synthesize evaluations from eval_*.json files" \
  --max-turns 10 \
  --allowedTools Read,Write,mcp__roast-my-post__* \
  > final_evaluation.json
```

## Conclusion

Orchestrating multiple Claude Code instances solves both the cost problem (through efficient task distribution and caching) and the "giving up" problem (through retries and specialized agents). The Unix philosophy built into Claude Code makes this surprisingly straightforward to implement.

## References
- Claude-Flow: https://github.com/ruvnet/claude-flow
- Claude-Swarm: https://github.com/parruda/claude-swarm
- Adrian Cockcroft's experience: https://adrianco.medium.com/vibe-coding-is-so-last-month