# Claude Code Integration: Lessons Learned

**Date**: 2025-07-06  
**Author**: Claude  
**Status**: Post-Implementation Analysis  
**Related**: [Claude Code Agent Prototype](./2025-07-06-01-claude-code-agent-prototype.md)

## Executive Summary

We implemented a Claude Code SDK integration for document analysis in the RoastMyPost application. While the implementation technically works, it revealed fundamental mismatches between Claude Code's design (optimized for coding tasks) and our needs (multi-turn document analysis). This document captures key lessons learned and recommendations for future approaches.

## Implementation Overview

### What We Built

1. **Initial Approach**: Direct Claude Code SDK integration
   - Single prompt with multi-turn capability
   - Budget tracking and cost monitoring
   - Output parsing for analysis, comments, and grades

2. **Iterative Approach**: File-based editing system
   - Multiple Claude Code sessions editing a markdown file
   - Progress monitoring via temporary files
   - Structured template for analysis sections

### Key Files Created

```
/src/lib/documentAnalysis/claudeCodeAnalysis/
├── index.ts                 # Main entry point
├── budgetTracker.ts        # Cost tracking (works well)
├── prompts.ts              # Prompt generation
├── outputParser.ts         # Extract structured data
├── iterativeAnalysis.ts    # File-based iterative approach
└── types.ts                # TypeScript interfaces
```

## Lessons Learned

### 1. Claude Code SDK is Task-Oriented, Not Conversation-Oriented

**Problem**: Claude Code SDK is designed to complete specific tasks (like writing code) and naturally terminates after 2-3 turns, even when `maxTurns` is set higher.

**Evidence**:
- Set `maxTurns: 8` but conversations ended after 2 turns
- The SDK includes a "result" message type indicating task completion
- No built-in mechanism for continuation prompts

**Implication**: Claude Code SDK is not suitable for exploratory, multi-turn analysis where we want the model to gradually build up insights.

### 2. Tool Restrictions Don't Change Core Behavior

**Problem**: Even when disabling all tools (`disallowedTools: ["*"]`), Claude Code still behaves as a task-completion system rather than an analytical assistant.

**What We Tried**:
```typescript
options: {
  maxTurns,
  disallowedTools: ["*"], // Disable all tools
}
```

**Result**: The system still completed quickly without engaging in extended analysis.

### 3. File-Based Iteration Shows Promise but Has Overhead

**Innovation**: We created an iterative approach where Claude Code edits a markdown file over multiple sessions.

**Pros**:
- Allows progress monitoring (`tail -f /tmp/claude-code-analysis/analysis-*.md`)
- Maintains state between iterations
- Could theoretically build up complex analyses

**Cons**:
- Claude Code often didn't actually edit the template sections
- High overhead for simple analysis tasks
- Complexity of file management

**Key Insight**: The Edit tool in Claude Code seems optimized for code changes, not prose editing.

### 4. Cost Tracking Works Well

**Success**: The budget tracking system successfully:
- Calculated costs accurately using Sonnet 4 pricing ($3/$15 per M tokens)
- Tracked cumulative costs across turns
- Enforced budget limits
- Typical cost: $0.002-0.02 per analysis (very reasonable)

**Implementation**:
```typescript
const turnCost = tracker.calculateCost(
  usage.input_tokens || 0,
  usage.output_tokens || 0
);
```

### 5. SDK Message Structure Requires Careful Parsing

**Challenge**: Claude Code SDK messages have a nested structure:
```javascript
{
  type: "assistant",
  message: {
    content: [...],
    usage: {...}
  }
}
```

**Solution**: We had to adapt our parsers to handle both direct content and nested message structures.

### 6. Document Analysis Needs Different Primitives

**Mismatch**: Claude Code provides coding primitives (Read, Write, Edit, Bash) but document analysis needs:
- Structured thinking phases
- Quote extraction with context
- Iterative refinement of arguments
- Grading rubrics

**Current Workaround**: Trying to force these needs into file editing paradigm is awkward.

## Comparison: Claude Code vs Standard API

| Aspect | Claude Code SDK | Standard Anthropic API |
|--------|----------------|----------------------|
| **Cost** | Same (uses Sonnet 4) | Same |
| **Multi-turn** | Limited (2-3 turns) | Full control |
| **Task Focus** | Completion-oriented | Conversation-oriented |
| **Complexity** | High (SDK overhead) | Low (direct API calls) |
| **State Management** | Via file system | In conversation history |
| **Suited For** | Coding tasks | Document analysis |

## Recommendations

### 1. Short Term: Revert to Standard API

For document analysis, the standard Anthropic API with explicit multi-turn management would be more suitable:

```typescript
// Pseudo-code for better approach
const messages = [];
messages.push({ role: "user", content: initialPrompt });

for (let turn = 0; turn < maxTurns; turn++) {
  const response = await anthropic.messages.create({
    model: "claude-4-sonnet-20250514",
    messages,
    max_tokens: 4096,
  });
  
  messages.push({ role: "assistant", content: response.content });
  messages.push({ role: "user", content: continuationPrompts[turn] });
}
```

### 2. Medium Term: Hybrid Approach

Use Claude Code SDK only for specific sub-tasks that match its strengths:
- Extracting structured data from documents
- Generating code examples in technical reviews
- File system operations for report generation

### 3. Long Term: Custom Agent Framework

Build a purpose-built framework for document analysis that:
- Supports true multi-phase analysis
- Has built-in comment extraction primitives
- Manages conversation state elegantly
- Provides real-time progress updates

## Technical Debt Created

1. **Unused Complexity**: The iterative file-based system adds complexity without proportional benefit
2. **Type Mismatches**: Force-fitting Claude Code types into document analysis types
3. **Hardcoded Toggle**: `useClaudeCode = true` hardcoded in `analyzeDocument.ts`

## Positive Outcomes

Despite the challenges, we achieved:

1. **Working Integration**: The system does produce analyses, summaries, and grades
2. **Cost Visibility**: Excellent cost tracking and budget management  
3. **Learning**: Deep understanding of Claude Code SDK capabilities and limitations
4. **Reusable Components**: Budget tracker and parts of the output parser are reusable

## Conclusion

Claude Code SDK is a powerful tool for its intended purpose - automated coding tasks. However, for document analysis requiring extended analytical reasoning, the standard Anthropic API with custom multi-turn orchestration would be more appropriate.

The key lesson: **Match the tool to the task**. Claude Code excels at discrete, tool-using tasks but struggles with open-ended analytical conversations.

## Next Steps

1. **Immediate**: Document the current state and limitations
2. **Soon**: Implement a cleaner multi-turn solution using standard API
3. **Future**: Consider Claude Code only for specific, well-defined subtasks

## Code Snippets for Future Reference

### Working Budget Tracker
```typescript
export class BudgetTracker {
  calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = inputTokens * this.SONNET_4_PRICING.input;
    const outputCost = outputTokens * this.SONNET_4_PRICING.output;
    return inputCost + outputCost;
  }
}
```

### Message Parsing Pattern
```typescript
// Handle Claude Code's nested message structure
const content = anyMsg.message?.content || anyMsg.content;
if (Array.isArray(content)) {
  return content
    .filter(block => block.type === "text")
    .map(block => block.text)
    .join("\n");
}
```

### Cost-Effective Settings
```typescript
const options = {
  model: "claude-4-sonnet-20250514", // 5x cheaper than Opus
  budget: 0.06, // Reasonable per-evaluation budget
  maxTurns: 5, // Balance depth vs cost
};
```

---

This document serves as a reference for future AI integration decisions and highlights the importance of understanding tool capabilities before implementation.