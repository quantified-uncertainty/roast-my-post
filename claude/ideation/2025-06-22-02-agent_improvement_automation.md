<!-- Created: 2025-06-22 11:30:58 -->
# 2025-06-22 Agent Improvement Automation

## Current Manual Process
1. Modify agent instructions
2. Run batch test on documents
3. Export evaluation data via "Export Evaluation Data" tab (copies YAML to clipboard)
4. Feed YAML to external LLM with prompt asking for improvements
5. LLM suggests instruction changes
6. Manually apply changes and repeat

## Pain Points
- Time consuming manual loop
- Context switching between UI, clipboard, external LLM
- No tracking of improvement iterations
- Hard to compare performance across versions
- Manual interpretation of LLM suggestions

## Proposed Automation

### Architecture

#### 1. Agent Improvement Job Type
```prisma
model AgentImprovementJob {
  id              String   @id @default(uuid())
  agentId         String
  sourceVersionId String   // Current agent version
  targetVersionId String?  // New version if improvements accepted
  batchId         String   // Eval batch to analyze
  
  improvementPrompt    String?  // Custom prompt for LLM
  llmModel            String   // Which LLM to use
  
  status          JobStatus
  analysis        String?  // LLM's analysis
  suggestedChanges Json?   // Structured improvements
  
  createdAt       DateTime @default(now())
  completedAt     DateTime?
}
```

#### 2. Improvement Workflow

```typescript
async function runAgentImprovement(job: AgentImprovementJob) {
  // 1. Gather evaluation data
  const evalData = await exportAgentEvaluations({
    agentId: job.agentId,
    batchId: job.batchId,
    includeInteractions: true
  });
  
  // 2. Analyze with LLM
  const analysis = await analyzeAgentPerformance(evalData, {
    model: job.llmModel,
    customPrompt: job.improvementPrompt,
    focusAreas: ['clarity', 'accuracy', 'coverage', 'grading']
  });
  
  // 3. Generate structured improvements
  const improvements = await generateImprovements(analysis, {
    currentInstructions: evalData.agent.instructions,
    outputFormat: 'structured' // Returns specific field changes
  });
  
  // 4. Create new agent version with changes
  if (approved) {
    await createAgentVersion({
      ...improvements,
      parentVersion: job.sourceVersionId
    });
  }
}
```

### UI Components

#### Improvement Tab in Agent Detail
```tsx
<ImprovementTab>
  <ImprovementHistory agentId={agent.id} />
  
  <StartImprovementForm>
    - Select batch to analyze
    - Choose improvement strategy:
      * "Make grading more consistent"
      * "Improve comment quality"
      * "Reduce false positives"
      * Custom prompt
    - Select LLM model (Claude Opus, GPT-4, etc)
    - Run improvement job
  </StartImprovementForm>
  
  <ImprovementResults>
    - Show LLM analysis
    - Diff view of suggested changes
    - Performance predictions
    - Accept/Reject/Modify buttons
  </ImprovementResults>
</ImprovementTab>
```

### Advanced Features

#### 1. A/B Testing
- Automatically create small test batch with new version
- Compare performance metrics
- Statistical significance testing

#### 2. Improvement Metrics
```typescript
interface ImprovementMetrics {
  gradeConsistency: number;     // Std dev of grades
  commentRelevance: number;      // Based on highlight accuracy
  falsePositiveRate: number;     // Comments on non-issues
  coverageScore: number;         // Important points missed
  instructionClarity: number;    // LLM-judged clarity score
}
```

#### 3. Multi-Round Improvements
- Chain multiple improvement rounds
- Track performance trajectory
- Automatic rollback if performance degrades

#### 4. Cross-Agent Learning
- Identify patterns from successful agents
- Suggest improvements based on similar agents
- Build library of effective instruction patterns

### Implementation Phases

**Phase 1: Basic Automation**
- Add improvement job type
- Create LLM analysis endpoint
- Simple approve/reject UI

**Phase 2: Structured Improvements**
- Parse LLM suggestions into field-specific changes
- Diff visualization
- Version comparison tools

**Phase 3: Advanced Analytics**
- A/B testing framework
- Performance metrics
- Improvement prediction

**Phase 4: ML-Powered Optimization**
- Learn from improvement history
- Suggest improvements proactively
- Cross-agent pattern recognition

### Benefits
1. **Speed**: 10x faster iteration cycles
2. **Tracking**: Full history of improvements and their impacts
3. **Data-Driven**: Quantitative performance metrics
4. **Consistency**: Standardized improvement process
5. **Learning**: Build knowledge base of what works

### Challenges
1. **LLM Costs**: Each improvement cycle uses significant tokens
2. **Evaluation Quality**: Need good test sets for meaningful improvements
3. **Overfitting**: Agents might optimize for test set rather than general performance
4. **Human Oversight**: Some improvements need human judgment

### MVP Implementation
Start with:
1. Simple "Improve Agent" button that runs current batch through LLM
2. Show suggested changes in a modal
3. One-click to create new version with changes
4. Basic before/after comparison on next batch