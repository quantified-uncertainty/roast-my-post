<!-- Created: 2025-06-23 -->
# Making Multiple Entity Types Evaluatable

## Current State
Currently, only Documents can be evaluated. The evaluation system is well-architected with:
- Versioning support (DocumentVersion → EvaluationVersion)
- Async job processing
- Rich UI with highlighting and comments
- Multiple agent evaluations per document

## Goal
Enable evaluation of other entities, starting with Agents themselves. This would allow:
- Agents evaluating other agents' configurations
- Quality assessment of agent instructions
- Meta-analysis of agent performance
- Comparative agent analysis

## Quick/Cheap Implementation Options

### Option 1: Convert Agent Data to Document (Minimal Change)
**Time: 2-4 hours**

The fastest approach - convert agent data into a Document that can be evaluated using the existing system.

```typescript
// Simple conversion function
async function createAgentDocument(agentId: string) {
  const agent = await getAgentWithVersion(agentId);
  
  const content = `
# Agent: ${agent.name}

## Purpose
${agent.purpose}

## Description
${agent.description}

## Generic Instructions
${agent.genericInstructions || 'None provided'}

## Self-Critique Instructions
${agent.selfCritiqueInstructions || 'None provided'}

## README
${agent.readme || 'No README'}

## Metadata
- Version: ${agent.version}
- Created: ${agent.createdAt}
- Updated: ${agent.updatedAt}
`;

  // Create document with special type
  return await createDocument({
    title: `Agent Config: ${agent.name}`,
    content,
    type: 'AGENT_CONFIG', // New document type
    sourceId: agentId,
    importUrl: `/agents/${agentId}`
  });
}
```

**Pros:**
- Uses existing evaluation infrastructure
- No schema changes needed
- Can start immediately
- Agents can evaluate agent configs as documents

**Cons:**
- Loses structured data (just markdown)
- Duplicate data storage
- Manual sync needed when agent updates

### Option 2: Generic "Evaluatable" Interface (Medium Effort)
**Time: 8-16 hours**

Create a generic interface that both Documents and Agents implement.

```typescript
// 1. Add to Prisma schema
model Evaluation {
  // ... existing fields ...
  
  // Make document optional
  document      Document? @relation(...)
  documentId    String?
  
  // Add generic evaluatable fields
  evaluatableType  String  // "DOCUMENT" | "AGENT" | etc
  evaluatableId    String  // ID of the entity
  
  @@index([evaluatableType, evaluatableId])
}

// 2. Create interface
interface Evaluatable {
  id: string;
  type: 'DOCUMENT' | 'AGENT';
  title: string;
  content: string;
  metadata: Record<string, any>;
  version: number;
}

// 3. Adapter functions
function documentToEvaluatable(doc: Document): Evaluatable {
  return {
    id: doc.id,
    type: 'DOCUMENT',
    title: doc.title,
    content: doc.content,
    metadata: { author: doc.author, url: doc.url },
    version: doc.currentVersion
  };
}

function agentToEvaluatable(agent: Agent): Evaluatable {
  return {
    id: agent.id,
    type: 'AGENT',
    title: agent.name,
    content: formatAgentAsMarkdown(agent),
    metadata: { 
      purpose: agent.purpose,
      hasGradeInstructions: !!agent.gradeInstructions 
    },
    version: agent.version
  };
}
```

**Pros:**
- Clean abstraction
- Minimal schema changes
- Reuses most existing code
- Extensible to other types

**Cons:**
- Requires updating evaluation logic
- Need to handle UI routing
- Some refactoring of existing code

### Option 3: Agent-Specific Quick Win (Fastest)
**Time: 4-6 hours**

Add a simple "Evaluate Agent" feature that creates evaluations specifically for agents.

```typescript
// 1. Add new API endpoint
// /api/agents/[agentId]/evaluate
export async function POST(req: Request, { params }) {
  const { evaluatorAgentId } = await req.json();
  
  // Create a special evaluation job
  const job = await createJob({
    type: 'AGENT_EVALUATION',
    targetAgentId: params.agentId,
    evaluatorAgentId,
    status: 'PENDING'
  });
  
  return Response.json({ jobId: job.id });
}

// 2. Simple UI addition
// Add "Evaluate" button to agent detail page
<Button onClick={() => evaluateAgent(agentId)}>
  Evaluate This Agent
</Button>

// 3. Process in existing job handler
if (job.type === 'AGENT_EVALUATION') {
  const agent = await getAgent(job.targetAgentId);
  const evaluator = await getAgent(job.evaluatorAgentId);
  
  // Format agent data as content
  const content = formatAgentForEvaluation(agent);
  
  // Use existing analyzeDocument with special prompt
  const result = await analyzeDocument(content, evaluator, {
    systemPrompt: "You are evaluating an AI agent configuration..."
  });
  
  // Store in new simple table
  await createAgentEvaluation({
    agentId: job.targetAgentId,
    evaluatorId: job.evaluatorAgentId,
    result
  });
}
```

**Pros:**
- Very quick to implement
- No changes to existing document system
- Can start getting feedback immediately

**Cons:**
- Separate system from document evaluations
- Limited UI (no highlighting)
- Not as feature-rich

### Option 4: Hybrid Approach (Recommended)
**Time: 6-10 hours**

Combine the best of Options 1 and 3:

1. **Phase 1 (2 hours)**: Add "Convert to Document" button on agent pages
   - Creates a formatted document from agent data
   - Marks it with special type/tags
   - Immediate evaluation capability

2. **Phase 2 (4 hours)**: Add dedicated agent evaluation
   - Simple API endpoint
   - Basic results display
   - Specialized prompts for agent evaluation

3. **Phase 3 (4 hours)**: Enhanced UI
   - Agent evaluation history
   - Comparison views
   - Batch agent evaluation

## Other Evaluatable Entities

Using the same patterns, you could make evaluatable:

### 1. **Evaluation Results**
- Evaluate the quality of evaluations themselves
- Meta-evaluation for quality control

### 2. **User Prompts/Queries**
- Evaluate prompt quality
- Suggest improvements

### 3. **Code Snippets**
- Evaluate code from the codebase
- Security/quality reviews

### 4. **Conversations**
- Evaluate chat threads
- Analyze interaction quality

### 5. **Batches/Collections**
- Evaluate groups of documents
- Aggregate analysis

## Recommended Implementation Path

### Week 1: Quick Win
1. **Day 1**: Implement "Convert Agent to Document" (2 hours)
2. **Day 2**: Add special handling for agent-documents (2 hours)
3. **Day 3**: Create "Agent Evaluator" agent specialized in reviewing agents

### Week 2: Enhance
1. Add dedicated agent evaluation API
2. Create simple results viewer
3. Add batch evaluation for all agents

### Month 2: Generalize
1. Implement generic Evaluatable interface
2. Migrate existing code
3. Add support for other entity types

## Cost-Benefit Analysis

### Quick Implementation (4-6 hours)
- **Benefit**: Immediate agent evaluation capability
- **Cost**: Some technical debt, limited features
- **ROI**: High - enables new use cases quickly

### Full Implementation (40-60 hours)
- **Benefit**: Clean, extensible architecture
- **Cost**: Significant refactoring
- **ROI**: Good long-term, but delayed value

### Recommendation
Start with the **Hybrid Approach**:
1. Get agent evaluation working today (2-4 hours)
2. Gather user feedback
3. Invest in proper architecture only if proven valuable

This provides immediate value while keeping options open for future expansion.