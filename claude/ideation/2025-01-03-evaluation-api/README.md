# Proposed Evaluation Library API Design

## Overview

The evaluation library provides a clean, flexible API for analyzing documents with AI agents. It abstracts away database dependencies, job queuing, and infrastructure concerns while maintaining the core functionality.

## Core Concepts

### 1. Configuration
```typescript
// Configuration object for the library
interface EvaluationConfig {
  // API Keys
  anthropicApiKey?: string;      // Falls back to env var ANTHROPIC_API_KEY
  openRouterApiKey?: string;     // Falls back to env var OPENROUTER_API_KEY
  
  // Model Configuration
  models?: {
    analysis?: string;           // Default: "claude-sonnet-4-20250514"
    search?: string;             // Default: "openai/gpt-4.1"
  };
  
  // Timeouts
  timeouts?: {
    comprehensive?: number;      // Default: 600000 (10 min)
    commentExtraction?: number;  // Default: 300000 (5 min)
    selfCritique?: number;       // Default: 180000 (3 min)
  };
  
  // Callbacks for progress updates
  onProgress?: (progress: EvaluationProgress) => void;
  onTaskComplete?: (task: TaskResult) => void;
}

// Initialize the library
const evaluator = new Evaluator(config: EvaluationConfig);
```

### 2. Core Types
```typescript
// Input types
interface DocumentInput {
  id: string;
  title: string;
  content: string;
  author?: string;
  publishedDate?: Date | string;
  url?: string;
  platforms?: string[];
  metadata?: Record<string, any>;
}

interface AgentDefinition {
  id: string;
  name: string;
  purpose: "ASSESSOR" | "ADVISOR" | "ENRICHER" | "EXPLAINER";
  version?: string;
  description: string;
  primaryInstructions?: string;
  selfCritiqueInstructions?: string;
  providesGrades?: boolean;
  extendedCapabilityId?: string;  // e.g., "simple-link-verifier"
}

// Output types
interface EvaluationResult {
  // Core outputs
  summary: string;
  analysis: string;
  grade?: number;
  selfCritique?: string;
  
  // Comments with highlights
  comments: Array<{
    description: string;
    importance?: "low" | "medium" | "high";
    grade?: number;
    highlight: {
      startOffset: number;
      endOffset: number;
      quotedText: string;
      prefix?: string;
    };
  }>;
  
  // Metadata
  metadata: {
    model: string;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    costInCents: number;
    durationSeconds: number;
    workflow: "comprehensive" | "link-analysis" | string;
  };
  
  // Task breakdown (optional, for detailed tracking)
  tasks?: TaskResult[];
  
  // Raw LLM thinking (optional, for debugging)
  thinking?: string;
}

interface EvaluationProgress {
  stage: "thinking" | "analyzing" | "extracting-comments" | "self-critique" | "complete";
  message: string;
  percentComplete: number;
}
```

## JavaScript/TypeScript API

### Basic Usage
```typescript
import { Evaluator } from '@roastmypost/evaluator';

// Initialize
const evaluator = new Evaluator({
  anthropicApiKey: 'your-key',
  onProgress: (progress) => console.log(`${progress.percentComplete}% - ${progress.message}`)
});

// Simple evaluation
const result = await evaluator.evaluate(document, agent);
console.log(result.summary);
console.log(result.comments);

// With options
const result = await evaluator.evaluate(document, agent, {
  targetWordCount: 800,
  targetComments: 10,
  includeThinking: true,
  includeTasks: true
});
```

### Advanced Usage
```typescript
// Batch evaluation
const results = await evaluator.evaluateBatch(documents, agents, {
  concurrency: 3,  // Process 3 evaluations in parallel
  onEvaluationComplete: (docId, agentId, result) => {
    console.log(`Completed ${docId} with ${agentId}`);
  }
});

// Stream results
const stream = evaluator.evaluateStream(document, agent);
for await (const chunk of stream) {
  if (chunk.type === 'progress') {
    console.log(chunk.progress);
  } else if (chunk.type === 'partial') {
    console.log('Partial result:', chunk.data);
  } else if (chunk.type === 'complete') {
    console.log('Final result:', chunk.data);
  }
}

// Different workflows
const linkResult = await evaluator.analyzeLinkDocument(document, agent);
const comprehensiveResult = await evaluator.analyzeComprehensive(document, agent);

// Agent management
const agents = await evaluator.loadAgentsFromDirectory('./agents');
const agent = await evaluator.loadAgentFromTOML('./agents/my-agent.toml');
```

### Error Handling
```typescript
try {
  const result = await evaluator.evaluate(document, agent);
} catch (error) {
  if (error instanceof EvaluationError) {
    console.error('Evaluation failed:', error.message);
    console.error('Stage:', error.stage);
    console.error('Retryable:', error.retryable);
  } else if (error instanceof ValidationError) {
    console.error('Invalid input:', error.details);
  } else if (error instanceof APIError) {
    console.error('API error:', error.statusCode, error.message);
  }
}
```

## CLI API

### Installation
```bash
npm install -g @roastmypost/cli
# or
npx @roastmypost/cli
```

### Basic Commands
```bash
# Evaluate a single document
roastmypost evaluate <document-file> --agent <agent-file>

# Evaluate from URL
roastmypost evaluate-url https://example.com/article --agent my-agent.toml

# Batch evaluation
roastmypost evaluate-batch documents/*.json --agents agents/*.toml

# List available agents
roastmypost agents list

# Validate agent configuration
roastmypost agents validate my-agent.toml
```

### Examples
```bash
# Simple evaluation with output to console
roastmypost evaluate article.md --agent assessor.toml

# Save results to file
roastmypost evaluate article.md --agent advisor.toml --output results.json

# Evaluate with multiple agents
roastmypost evaluate article.md --agents assessor.toml,advisor.toml

# Stream results with progress
roastmypost evaluate article.md --agent assessor.toml --stream --progress

# Use custom configuration
roastmypost evaluate article.md --agent assessor.toml \
  --api-key $ANTHROPIC_API_KEY \
  --model claude-3-opus-20240229 \
  --timeout 300 \
  --word-count 1000 \
  --comments 15
```

### Configuration File
```yaml
# .roastmypost.yml
api:
  anthropic_key: ${ANTHROPIC_API_KEY}
  openrouter_key: ${OPENROUTER_API_KEY}

models:
  analysis: claude-sonnet-4-20250514
  search: openai/gpt-4.1

defaults:
  word_count: 500
  comment_count: 5
  include_thinking: false
  include_tasks: false

agents_directory: ./agents
output_directory: ./evaluations
```

## Programmatic Integration Examples

### Express/Next.js Route
```typescript
import { Evaluator } from '@roastmypost/evaluator';

const evaluator = new Evaluator();

app.post('/api/evaluate', async (req, res) => {
  const { document, agentId } = req.body;
  
  try {
    const agent = await evaluator.loadAgent(agentId);
    const result = await evaluator.evaluate(document, agent);
    
    res.json({
      success: true,
      evaluation: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

### Worker/Queue Integration
```typescript
import { Evaluator } from '@roastmypost/evaluator';
import { Queue } from 'bull';

const evaluator = new Evaluator();
const evaluationQueue = new Queue('evaluations');

evaluationQueue.process(async (job) => {
  const { document, agent } = job.data;
  
  // Update job progress
  const result = await evaluator.evaluate(document, agent, {
    onProgress: (progress) => {
      job.progress(progress.percentComplete);
    }
  });
  
  return result;
});
```

### Database Adapter
```typescript
// Example adapter for saving results to database
interface EvaluationStorage {
  saveResult(documentId: string, agentId: string, result: EvaluationResult): Promise<string>;
  getResult(evaluationId: string): Promise<EvaluationResult>;
}

class PrismaAdapter implements EvaluationStorage {
  async saveResult(documentId: string, agentId: string, result: EvaluationResult) {
    const evaluation = await prisma.evaluation.create({
      data: {
        documentId,
        agentId,
        summary: result.summary,
        analysis: result.analysis,
        grade: result.grade,
        // ... map other fields
      }
    });
    return evaluation.id;
  }
  
  async getResult(evaluationId: string) {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId }
    });
    // ... map to EvaluationResult
  }
}

// Use with evaluator
const storage = new PrismaAdapter();
const result = await evaluator.evaluate(document, agent);
const id = await storage.saveResult(document.id, agent.id, result);
```

## Migration Guide

### From Current System
```typescript
// Before (tightly coupled)
import { JobModel } from '@/models/Job';
import { analyzeDocument } from '@/lib/documentAnalysis';

const job = await jobModel.processJob(jobData);

// After (clean API)
import { Evaluator } from '@roastmypost/evaluator';

const evaluator = new Evaluator();
const result = await evaluator.evaluate(
  {
    id: document.id,
    title: document.title,
    content: document.content,
    // ... other fields
  },
  {
    id: agent.id,
    name: agent.name,
    purpose: agent.purpose,
    // ... other fields
  }
);
```

## Benefits

1. **Decoupled**: No database dependencies, works anywhere
2. **Flexible**: Multiple usage patterns (sync, async, stream)
3. **Testable**: Easy to mock and test
4. **Extensible**: Plugin system for custom workflows
5. **Observable**: Progress callbacks and streaming
6. **Type-safe**: Full TypeScript support
7. **CLI-friendly**: Works great in scripts and automation
8. **Framework-agnostic**: Use with any Node.js framework