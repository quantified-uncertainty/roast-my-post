# Agentic Document Analysis Design

**Date**: 2025-07-06  
**Author**: Claude  
**Status**: Design Proposal  
**Goal**: Create a truly agentic system for iterative document analysis

## The Problem with Current Approaches

Our current "multi-turn" system isn't agentic - it's just a scripted sequence:
- Turn 1: Overview
- Turn 2: Arguments
- Turn 3: Comments
- Turn 4: Grade

This is no different from the old system, just with different steps. A real agent would decide what to do based on the document and goals.

## Core Concept: Document as Living Artifact

Instead of generating analysis in one pass, the agent maintains a **living document** that it iteratively improves:

```
AnalysisDocument {
  summary: string
  analysis: string
  comments: Comment[]
  grade?: number
  metadata: {
    completeness: 0-100
    confidence: 0-100
    areasNeedingWork: string[]
  }
}
```

## Agentic Architecture

### 1. Goal-Oriented System
The agent receives a high-level goal: "Analyze this document thoroughly according to the agent's instructions"

### 2. Tool Suite
The agent has access to tools for:
- **examine_section**: Deep dive into a specific part of the document
- **add_comment**: Add a new comment with quote and analysis
- **revise_analysis**: Update/expand the analysis section
- **update_summary**: Refine the summary
- **assign_grade**: Set or update the grade with justification
- **check_completeness**: Self-evaluate what's missing
- **research_context**: (Future) Search for external context

### 3. Iterative Loop
```
while not satisfied and under_budget:
  1. Assess current state
  2. Decide what needs improvement
  3. Choose appropriate tool
  4. Execute improvement
  5. Update metadata
```

### 4. Self-Reflection Pattern
After each action, the agent:
- Reviews what was accomplished
- Identifies remaining gaps
- Adjusts strategy based on progress

## Example Flow

**Initial State**: Empty analysis document

**Turn 1**: Agent decides to start with overview
- Tool: `revise_analysis` 
- Action: Writes initial overview
- Reflection: "Need specific examples and evidence"

**Turn 2**: Agent identifies weak evidence
- Tool: `examine_section`
- Action: Deep dive into claims section
- Reflection: "Found 3 unsupported claims"

**Turn 3**: Agent adds specific comments
- Tool: `add_comment` (×3)
- Action: Adds quotes with critiques
- Reflection: "Analysis lacks structure"

**Turn 4**: Agent reorganizes analysis
- Tool: `revise_analysis`
- Action: Restructures into clear sections
- Reflection: "Ready for grading"

**Turn 5**: Agent assigns grade
- Tool: `assign_grade`
- Action: Calculates grade based on findings
- Reflection: "Analysis complete at 95% confidence"

## Key Advantages

1. **Dynamic**: Takes as many or few turns as needed
2. **Focused**: Each turn has a specific purpose chosen by the agent
3. **Transparent**: Clear record of what was done and why
4. **Extensible**: Easy to add new tools/capabilities
5. **Quality-driven**: Agent decides when analysis is complete

## Implementation Strategy

### Phase 1: Core Tools
- Implement basic tool suite
- Use Claude's function calling
- Track tool usage in tasks

### Phase 2: Memory & Context
- Add working memory for cross-turn context
- Implement completeness tracking
- Add confidence scoring

### Phase 3: Advanced Features
- External research tools
- Multi-agent collaboration
- Comparative analysis

## Success Metrics

1. **Quality**: Better analysis than scripted approach
2. **Efficiency**: Fewer unnecessary turns
3. **Adaptability**: Handles diverse documents well
4. **Transparency**: Clear audit trail of decisions

## Technical Considerations

### Tool Calling with Claude
```typescript
const tools = [
  {
    name: "revise_analysis",
    description: "Update or expand the analysis section",
    parameters: {
      section: "string", // which part to update
      content: "string", // new content
      operation: "append" | "replace" | "insert"
    }
  },
  // ... other tools
];
```

### State Management
- Maintain document state between turns
- Track which sections have been analyzed
- Record confidence levels per section

### Budget Management
- Allocate budget across potential turns
- Let agent decide when "good enough"
- Provide budget awareness to agent

## Comparison with Previous Attempts

Previous attempts likely failed because they:
- Tried to do too much in each tool call
- Lacked clear document structure
- Didn't give agent enough autonomy
- Had poor state management between turns

This design addresses these by:
- Small, focused tools
- Clear document schema
- Full agent autonomy
- Explicit state tracking

## Next Steps

1. Build prototype with 3-4 core tools
2. Test on variety of documents
3. Iterate on tool design based on results
4. Gradually add more sophisticated tools