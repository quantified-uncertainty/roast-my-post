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

### 1. **Evaluation Results** (Meta-Evaluation)
This is particularly powerful - evaluating the quality of evaluations themselves:

```typescript
// Convert EvaluationVersion to evaluatable Document
class DocumentAdapter {
  static async fromEvaluationVersion(evaluationVersionId: string): Promise<Document> {
    const evalVersion = await prisma.evaluationVersion.findUnique({
      where: { id: evaluationVersionId },
      include: {
        evaluation: {
          include: {
            agent: { include: { versions: true } },
            document: { include: { versions: true } }
          }
        },
        agentVersion: true,
        documentVersion: true,
        comments: { include: { highlight: true } },
        job: { include: { tasks: true } }
      }
    });
    
    // Format evaluation as rich content
    const content = `
# Evaluation Analysis

## Context
- **Document**: ${evalVersion.documentVersion.title}
- **Evaluator**: ${evalVersion.agentVersion.name} v${evalVersion.agentVersion.version}
- **Date**: ${evalVersion.createdAt}

## Evaluation Summary
${evalVersion.summary || 'No summary provided'}

## Analysis
${evalVersion.analysis || 'No analysis provided'}

## Grade
${evalVersion.grade ? `Score: ${evalVersion.grade}/100` : 'No grade provided'}

## Self-Critique
${evalVersion.selfCritique || 'No self-critique provided'}

## Comments (${evalVersion.comments.length})
${evalVersion.comments.map(comment => `
### ${comment.title}
- **Importance**: ${comment.importance || 'N/A'}
- **Quote**: "${comment.highlight.quotedText}"
- **Description**: ${comment.description}
`).join('\n')}

## Performance Metrics
- **Cost**: $${(evalVersion.job?.costInCents || 0) / 100}
- **Duration**: ${evalVersion.job?.durationInSeconds || 0}s
- **Tokens**: ${calculateTokens(evalVersion.job)}

## Raw Thinking
\`\`\`
${evalVersion.job?.llmThinking || 'No thinking recorded'}
\`\`\`
`;
    
    return await DocumentModel.create({
      title: `Evaluation: ${evalVersion.agentVersion.name} on "${evalVersion.documentVersion.title}"`,
      content,
      authors: 'System',
      platforms: ['evaluation-meta'],
      importUrl: `internal://evaluation-version/${evaluationVersionId}`,
      metadata: {
        sourceType: 'EVALUATION_VERSION',
        evaluationId: evalVersion.evaluationId,
        evaluationVersionId: evaluationVersionId,
        agentId: evalVersion.agentVersion.agentId,
        documentId: evalVersion.evaluation.documentId
      }
    });
  }
}
```

**Use Cases for Meta-Evaluation:**
- **Quality Control**: Have a "Quality Auditor" agent evaluate other agents' evaluations
- **Consistency Check**: Compare evaluations across different versions
- **Improvement Analysis**: Identify patterns in low-quality evaluations
- **Training Data**: Use high-quality evaluations as examples

**Example Meta-Evaluation Agents:**
- **Evaluation Quality Auditor**: Checks if evaluations are thorough, accurate, and helpful
- **Consistency Checker**: Compares multiple evaluations for consistency
- **Bias Detector**: Identifies potential biases in evaluations
- **Comment Quality Reviewer**: Specifically evaluates the quality of inline comments

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

### 6. **Evaluation Comparisons**
- Compare two evaluations side-by-side
- Identify improvements or regressions

## Key Consideration: AgentVersion Relationships

When making AgentVersions evaluatable, we need to consider:

1. **Version Specificity**: Evaluations should target specific AgentVersions, not just Agents
2. **Storage Efficiency**: Creating full database rows for each AgentVersion as content would be expensive
3. **Update Handling**: When new AgentVersions are created, they should be evaluatable without duplication

### Lightweight Reference Approach

Instead of converting entire AgentVersions to Documents, we could:

```typescript
// Option 1: Reference-based evaluation
model Evaluation {
  id          String   @id
  
  // Polymorphic reference
  evaluatableType  String  // "DOCUMENT_VERSION", "AGENT_VERSION", etc.
  evaluatableId    String  // ID of the specific version
  
  // Keep agent relationship for the evaluator
  evaluatorAgentId String
  evaluatorAgent   Agent
}

// Option 2: Lazy document creation
// Only create Document when evaluation is requested
async function evaluateAgentVersion(agentVersionId: string, evaluatorAgentId: string) {
  // Check if document already exists for this version
  const existingDoc = await prisma.document.findFirst({
    where: { 
      importUrl: `internal://agent-version/${agentVersionId}`
    }
  });
  
  if (!existingDoc) {
    // Create document on-demand
    await DocumentAdapter.fromAgentVersion(agentVersionId);
  }
  
  // Proceed with evaluation
}
```

This approach:
- Avoids creating Documents for every AgentVersion
- Only creates Documents when evaluation is actually needed
- Maintains referential integrity
- Keeps storage costs low

## Architecture Refactoring: Document vs DocumentVersion

The current architecture has unnecessary complexity with both Document and DocumentVersion tables. Here are detailed options for simplification:

### Option A: Remove Document Table (Recommended)
**Effort: Medium (16-24 hours)**

Consolidate everything into DocumentVersion as the primary entity:

```prisma
model DocumentVersion {
  id            String    @id @default(uuid())
  documentId    String    @default(nanoid(16)) // Groups versions
  version       Int       @default(1)
  
  // Core fields (moved from Document)
  publishedDate DateTime
  submittedById String
  submittedBy   User      @relation(...)
  
  // Content fields (already here)
  title         String
  content       String
  authors       String[]
  urls          String[]
  platforms     String[]
  intendedAgents String[]
  importUrl     String?
  
  // Relationships
  evaluations   Evaluation[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@unique([documentId, version])
  @@index([documentId])
}

// Update Evaluation to point directly to version
model Evaluation {
  id          String   @id @default(uuid())
  
  documentVersion    DocumentVersion @relation(...)
  documentVersionId  String
  
  agent       Agent @relation(...)
  agentId     String
  
  // ... rest stays the same
}
```

**Benefits:**
- Simpler mental model
- One less join in queries
- Clearer versioning story
- Easier to make other entities evaluatable

**Migration Path:**
1. Update schema to add fields to DocumentVersion
2. Migrate data from Document to DocumentVersion
3. Update all queries to use DocumentVersion
4. Drop Document table

### Option B: Generic Content Model
**Effort: High (32-40 hours)**

Create a unified content model for all evaluatable entities:

```prisma
enum ContentType {
  DOCUMENT
  AGENT_CONFIG
  PROMPT
  CONVERSATION
}

model Content {
  id            String       @id @default(uuid())
  contentId     String       @default(nanoid(16)) // Groups versions
  version       Int          @default(1)
  contentType   ContentType
  
  // Common metadata
  title         String
  body          String       // Main content (was "content")
  publishedDate DateTime
  submittedById String
  submittedBy   User        @relation(...)
  
  // Type-specific data
  metadata      Json        // Flexible field for type-specific data
  
  // Relationships
  evaluations   Evaluation[]
  
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  
  @@unique([contentId, version])
  @@index([contentType, contentId])
}

// Example metadata for different types:
// DOCUMENT: { authors: [], urls: [], platforms: [], importUrl: "" }
// AGENT_CONFIG: { agentId: "", purpose: "", instructions: {} }
// PROMPT: { model: "", temperature: 0.7, systemPrompt: "" }
```

**Benefits:**
- Ultimate flexibility
- Single evaluation system for everything
- Easy to add new content types
- Unified querying and UI components

**Drawbacks:**
- Loss of type safety in database
- More complex queries
- Need careful validation
- Significant refactoring

### Option C: Parallel Entity Models
**Effort: Low initially, Medium over time (8-16 hours per entity)**

Keep current pattern but apply consistently:

```prisma
// Pattern: Entity + EntityVersion

model Document {
  id            String    @id
  publishedDate DateTime
  submittedBy   User
  versions      DocumentVersion[]
  evaluations   Evaluation[]
}

model Agent {
  id            String    @id
  createdAt     DateTime
  submittedBy   User
  versions      AgentVersion[]
  evaluations   Evaluation[]  // Add this
}

model Prompt {
  id            String    @id
  createdAt     DateTime
  submittedBy   User
  versions      PromptVersion[]
  evaluations   Evaluation[]
}

// Update Evaluation to be polymorphic
model Evaluation {
  id          String   @id
  
  // Polymorphic reference
  entityType  String   // "DOCUMENT", "AGENT", "PROMPT"
  entityId    String   // ID of the entity
  
  // Optional specific relations for type safety
  document    Document? @relation(...)
  documentId  String?
  
  agent       Agent?    @relation(...)
  agentId     String?   // This would be the config being evaluated
  
  evaluatorAgentId String // The agent doing the evaluation
  evaluatorAgent   Agent  @relation("EvaluatorAgent", ...)
}
```

**Benefits:**
- Type safety maintained
- Gradual migration possible
- Clear separation of concerns

**Drawbacks:**
- Continued complexity
- Duplicate patterns
- More tables to maintain

### Option D: Document Adapters (Quick Win)
**Effort: Very Low (2-4 hours)**

Keep current structure but create adapters to convert other entities to documents:

```typescript
// Simple adapters that create Documents from other entities
class DocumentAdapter {
  static async fromAgentVersion(agentVersionId: string): Promise<Document> {
    const agentVersion = await prisma.agentVersion.findUnique({
      where: { id: agentVersionId },
      include: { agent: true }
    });
    
    return await DocumentModel.create({
      title: `Agent Config: ${agentVersion.name} v${agentVersion.version}`,
      content: formatAgentVersionAsMarkdown(agentVersion),
      authors: agentVersion.agent.submittedBy.name,
      platforms: ['agent-config'],
      importUrl: `internal://agent-version/${agentVersionId}`, // Track source
      metadata: {
        sourceType: 'AGENT_VERSION',
        agentId: agentVersion.agentId,
        agentVersionId: agentVersionId,
        version: agentVersion.version
      }
    });
  }
  
  static async fromPrompt(prompt: Prompt): Promise<Document> {
    // Similar conversion
  }
}

// Usage
const agentDoc = await DocumentAdapter.fromAgentVersion(agentVersionId);
// Now can be evaluated like any document
```

**Benefits:**
- No schema changes
- Immediate functionality
- Low risk
- Can evolve later
- Tracks specific version evaluated

**Drawbacks:**
- Data duplication
- Sync issues
- Not a long-term solution

## Recommended Implementation Path

### Phase 1: Quick Win (Week 1)
1. **Day 1**: Implement DocumentAdapter pattern (2 hours)
2. **Day 2**: Add "Convert to Document" UI for agents (2 hours)
3. **Day 3**: Create specialized evaluation agents for different content types

### Phase 2: Simplify Architecture (Week 2-3)
1. **Option A**: Remove Document table
   - Most bang for buck
   - Cleaner architecture
   - Easier future extensions

### Phase 3: Future Vision (Month 2+)
1. Consider Option B (Generic Content) only if:
   - Multiple new entity types needed
   - Cross-type analysis required
   - Team buy-in for major refactor

## Cost-Benefit Analysis

### Quick Implementation (4-6 hours)
- **Benefit**: Immediate agent evaluation capability
- **Cost**: Some technical debt, limited features
- **ROI**: High - enables new use cases quickly

### Architecture Simplification (16-24 hours)
- **Benefit**: Cleaner codebase, easier maintenance, better foundation
- **Cost**: Medium refactoring effort
- **ROI**: Very high - pays dividends in development speed

### Full Generic System (40-60 hours)
- **Benefit**: Ultimate flexibility, unified system
- **Cost**: Significant refactoring and testing
- **ROI**: Good only if many entity types needed

### Recommendation
1. **Immediate**: Use DocumentAdapter pattern (Option D) to unblock agent evaluation
2. **Next Sprint**: Implement Option A (Remove Document table) for cleaner architecture
3. **Future**: Consider Option B only if expanding to many entity types

This provides immediate value while setting up for a cleaner long-term architecture.