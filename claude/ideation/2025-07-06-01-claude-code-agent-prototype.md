# Claude Code Agent Integration Prototype

**Date**: 2025-01-06  
**Author**: Claude  
**Status**: Ideation/Planning  
**Issue**: [#56](https://github.com/quantified-uncertainty/roast-my-post/issues/56)

## Executive Summary

This document outlines a prototype implementation plan for using Claude Code as an AI agent for document evaluations. The goal is to test whether Claude Code's multi-step reasoning and tool use capabilities can significantly improve evaluation quality, despite the 5-10x cost increase.

## Current State Analysis

### Existing System

- **Single Claude API call** per evaluation using Sonnet 4
- **Average cost**: $0.08-0.09 per evaluation
- **Token usage**: ~3,000 input, ~2,000 output
- **Processing**: PostgreSQL-based job queue
- **Success rate**: High (90%+)

### Proposed Claude Code System

- **Multi-turn agent** with reasoning steps
- **Target budget**: $0.06-0.10 per evaluation
- **Model**: Claude Sonnet 4 ($3/$15 per million tokens)
- **Capabilities**: Tool use, self-correction, iterative refinement

## Implementation Plan

### Phase 1: Core Integration (Days 1-3)

#### 1.1 Dependencies

```bash
npm install @anthropic-ai/claude-code
```

#### 1.2 New Files Structure

```
/src/lib/documentAnalysis/claudeCodeAnalysis/
├── index.ts                 # Main Claude Code agent implementation
├── prompts.ts              # System prompts and agent conversion
├── budgetTracker.ts        # Cost tracking and budget enforcement
├── outputParser.ts         # Extract structured data from conversations
└── types.ts                # TypeScript interfaces
```

#### 1.3 Core Implementation

**`/src/lib/documentAnalysis/claudeCodeAnalysis/index.ts`**

```typescript
import { claude, type SDKMessage } from "@anthropic-ai/claude-code";
import { BudgetTracker } from "./budgetTracker";
import { buildPrompt } from "./prompts";
import { parseAgentOutput } from "./outputParser";
import type { Document } from "@/types/documents";
import type { Agent } from "@/types/agentSchema";
import { logger } from "@/lib/logger";

export interface ClaudeCodeAnalysisResult {
  analysis: string;
  summary: string;
  grade?: number;
  comments: Comment[];
  conversation: SDKMessage[];
  totalCost: number;
  turnCount: number;
  budgetUsed: number;
  abortReason?: "budget" | "max_turns" | "completion";
}

export async function analyzeWithClaudeCode(
  document: Document,
  agent: Agent,
  options: {
    budget?: number;
    maxTurns?: number;
    verbose?: boolean;
  } = {}
): Promise<ClaudeCodeAnalysisResult> {
  const { budget = 0.06, maxTurns = 10, verbose = false } = options;

  const tracker = new BudgetTracker(budget);
  const conversation: SDKMessage[] = [];
  const abortController = new AbortController();

  try {
    // Build initial prompt with document and agent instructions
    const prompt = buildPrompt(document, agent);

    if (verbose) {
      logger.info("Starting Claude Code analysis", {
        agentName: agent.name,
        documentId: document.id,
        budget,
        maxTurns,
      });
    }

    // Run Claude Code agent
    for await (const message of claude.query({
      prompt,
      abortController,
      options: {
        maxTurns,
        model: "claude-4-sonnet-20250514",
        temperature: 0.7,
        onMessage: (msg) => {
          if (verbose) {
            logger.info("Claude Code message", {
              type: msg.type,
              length: msg.content?.length,
            });
          }

          // Track costs in real-time
          if (msg.usage) {
            const turnCost = tracker.calculateCost(
              msg.usage.input_tokens,
              msg.usage.output_tokens
            );
            tracker.addTurn(turnCost, msg.usage);

            if (tracker.isOverBudget()) {
              logger.warn("Budget exceeded, aborting", {
                used: tracker.getTotalCost(),
                budget,
              });
              abortController.abort();
            }
          }
        },
      },
    })) {
      conversation.push(message);
    }

    // Parse final output
    const result = parseAgentOutput(conversation);

    return {
      ...result,
      conversation,
      totalCost: tracker.getTotalCost(),
      turnCount: tracker.getTurnCount(),
      budgetUsed: tracker.getBudgetUtilization(),
      abortReason: tracker.isOverBudget() ? "budget" : "completion",
    };
  } catch (error) {
    logger.error("Claude Code analysis failed", error);
    throw error;
  }
}
```

**`/src/lib/documentAnalysis/claudeCodeAnalysis/budgetTracker.ts`**

```typescript
interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}

interface Turn {
  cost: number;
  usage: TokenUsage;
  timestamp: Date;
}

export class BudgetTracker {
  private turns: Turn[] = [];
  private readonly budgetLimit: number;

  // Claude Sonnet 4 pricing
  private readonly SONNET_4_PRICING = {
    input: 3 / 1_000_000, // $3 per million
    output: 15 / 1_000_000, // $15 per million
  };

  constructor(budgetLimit: number) {
    this.budgetLimit = budgetLimit;
  }

  calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = inputTokens * this.SONNET_4_PRICING.input;
    const outputCost = outputTokens * this.SONNET_4_PRICING.output;
    return inputCost + outputCost;
  }

  addTurn(cost: number, usage: TokenUsage): void {
    this.turns.push({
      cost,
      usage,
      timestamp: new Date(),
    });
  }

  getTotalCost(): number {
    return this.turns.reduce((sum, turn) => sum + turn.cost, 0);
  }

  getTurnCount(): number {
    return this.turns.length;
  }

  isOverBudget(): boolean {
    return this.getTotalCost() >= this.budgetLimit;
  }

  getBudgetUtilization(): number {
    return (this.getTotalCost() / this.budgetLimit) * 100;
  }

  getDetailedBreakdown() {
    return {
      turns: this.turns,
      totalCost: this.getTotalCost(),
      totalInputTokens: this.turns.reduce(
        (sum, t) => sum + t.usage.input_tokens,
        0
      ),
      totalOutputTokens: this.turns.reduce(
        (sum, t) => sum + t.usage.output_tokens,
        0
      ),
      averageCostPerTurn: this.getTotalCost() / this.turns.length,
      budgetRemaining: Math.max(0, this.budgetLimit - this.getTotalCost()),
    };
  }
}
```

### Phase 2: Integration Points (Days 4-5)

#### 2.1 Modify Core Analysis Router

**`/src/lib/documentAnalysis/analyzeDocument.ts`** (additions)

```typescript
import { analyzeWithClaudeCode } from "./claudeCodeAnalysis";

export async function analyzeDocument(
  document: Document,
  agentInfo: Agent,
  targetWordCount: number = 500,
  targetComments: number = 5,
  anthropicApiKey?: string
): Promise<AnalysisResult> {
  // Check if agent should use Claude Code
  if (agentInfo.useClaudeCode) {
    logger.info(`Using Claude Code workflow for agent ${agentInfo.name}`);

    const result = await analyzeWithClaudeCode(document, agentInfo, {
      budget: agentInfo.claudeCodeBudget || 0.06,
      verbose: true,
    });

    // Convert to standard format
    return {
      thinking: "", // Claude Code doesn't separate thinking
      analysis: result.analysis,
      summary: result.summary,
      grade: result.grade,
      comments: result.comments,
      tasks: [
        {
          name: "Claude Code Analysis",
          status: "completed",
          duration: result.turnCount * 2000, // Estimate
          cost: Math.round(result.totalCost * 100), // Convert to cents
          interactions: result.conversation.map((msg) => ({
            request: msg.type === "user" ? msg : undefined,
            response: msg.type === "assistant" ? msg : undefined,
            model: "claude-4-sonnet-20250514",
          })),
        },
      ],
    };
  }

  // ... existing code for standard analysis
}
```

#### 2.2 Update Agent Schema

**`/src/types/agentSchema.ts`** (additions)

```typescript
export const agentSchema = z.object({
  // ... existing fields
  useClaudeCode: z.boolean().optional().default(false),
  claudeCodeBudget: z.number().min(0.02).max(0.5).optional().default(0.06),
  claudeCodeConfig: z
    .object({
      maxTurns: z.number().min(1).max(20).optional().default(10),
      includeTools: z.array(z.string()).optional(), // Future: web search, calculator
      requireStructuredOutput: z.boolean().optional().default(true),
    })
    .optional(),
});
```

#### 2.3 Database Schema Updates

**`prisma/schema.prisma`** (additions)

```prisma
model Agent {
  // ... existing fields
  useClaudeCode      Boolean   @default(false)
  claudeCodeBudget   Decimal   @default(0.06) @db.Decimal(10, 2)
  claudeCodeConfig   Json?
}

model Job {
  // ... existing fields
  claudeCodeMetadata Json?     // Stores conversation, turn details
}
```

### Phase 3: Testing & Monitoring (Days 6-7)

#### 3.1 Test Script

**`/src/scripts/test-claude-code.ts`**

```typescript
import { prisma } from "@/lib/prisma";
import { analyzeWithClaudeCode } from "@/lib/documentAnalysis/claudeCodeAnalysis";
import { logger } from "@/lib/logger";

async function testClaudeCodeAgent() {
  // Get a test document and agent
  const document = await prisma.documentVersion.findFirst({
    where: { current: true },
    include: { document: true },
  });

  const agent = await prisma.agent.findFirst({
    where: { name: "EA Epistemic Auditor" }, // High-value agent for testing
  });

  if (!document || !agent) {
    throw new Error("Test data not found");
  }

  // Run standard analysis
  logger.info("Running standard analysis...");
  const standardStart = Date.now();
  // ... run standard analysis
  const standardDuration = Date.now() - standardStart;

  // Run Claude Code analysis
  logger.info("Running Claude Code analysis...");
  const claudeCodeStart = Date.now();
  const result = await analyzeWithClaudeCode(
    document,
    { ...agent, useClaudeCode: true },
    { budget: 0.06, verbose: true }
  );
  const claudeCodeDuration = Date.now() - claudeCodeStart;

  // Compare results
  console.log("=== COMPARISON ===");
  console.log("Standard Analysis:");
  console.log(`- Duration: ${standardDuration}ms`);
  console.log(`- Cost: $0.02`);
  console.log(`- Comments: 5`);

  console.log("\nClaude Code Analysis:");
  console.log(`- Duration: ${claudeCodeDuration}ms`);
  console.log(`- Cost: $${result.totalCost.toFixed(2)}`);
  console.log(`- Turns: ${result.turnCount}`);
  console.log(`- Comments: ${result.comments.length}`);
  console.log(`- Budget used: ${result.budgetUsed.toFixed(1)}%`);

  // Save results for analysis
  await prisma.job.create({
    data: {
      type: "CLAUDE_CODE_TEST",
      status: "COMPLETED",
      claudeCodeMetadata: result,
    },
  });
}

// Run with: npm run test:claude-code
testClaudeCodeAgent().catch(console.error);
```

#### 3.2 Monitoring Updates

**`/src/app/monitor/jobs/[jobId]/page.tsx`** (additions)

```typescript
// Add Claude Code execution viewer
{job.claudeCodeMetadata && (
  <div className="mt-8">
    <h3 className="text-lg font-semibold mb-4">Claude Code Execution</h3>
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Stat
          label="Total Cost"
          value={`$${job.claudeCodeMetadata.totalCost.toFixed(2)}`}
        />
        <Stat
          label="Turns"
          value={job.claudeCodeMetadata.turnCount}
        />
        <Stat
          label="Budget Used"
          value={`${job.claudeCodeMetadata.budgetUsed.toFixed(0)}%`}
        />
      </div>

      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-2">Conversation Flow</h4>
        {job.claudeCodeMetadata.conversation.map((msg, i) => (
          <div key={i} className="mb-2 p-2 bg-gray-50 rounded">
            <div className="text-sm text-gray-600">
              Turn {i + 1} - {msg.type}
            </div>
            <div className="text-sm mt-1">
              {msg.content?.substring(0, 200)}...
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)}
```

### Phase 4: Rollout Strategy

#### 4.1 Feature Flags

**`/src/lib/featureFlags.ts`**

```typescript
export const CLAUDE_CODE_FLAGS = {
  enabled: process.env.ENABLE_CLAUDE_CODE === "true",
  maxBudget: parseFloat(process.env.CLAUDE_CODE_MAX_BUDGET || "0.10"),
  allowedAgents: (process.env.CLAUDE_CODE_AGENTS || "").split(","),
  debugMode: process.env.CLAUDE_CODE_DEBUG === "true",
};
```

#### 4.2 Gradual Rollout

1. **Week 1**: Test with single agent on test documents
2. **Week 2**: Enable for 10% of evaluations for specific agents
3. **Week 3**: A/B test quality improvements
4. **Week 4**: Decision on full rollout

### Cost Projections

#### Current System (per 1000 evaluations)

- Average cost: $0.02
- Total: $20
- Processing time: ~5 seconds each

#### Claude Code System (per 1000 evaluations)

- Average cost: $0.06
- Total: $60
- Processing time: ~20 seconds each
- Quality improvement: Expected 2-3x

#### Hybrid Approach (Recommended)

- Use Claude Code for premium agents (20%)
- Standard analysis for basic agents (80%)
- Blended cost: $84 per 1000 evaluations
- Cost reduction of 7% with significant quality boost

### Success Metrics

1. **Quality Metrics**

   - User satisfaction scores
   - Depth of analysis (word count, insight count)
   - Accuracy of extracted comments
   - Relevance of observations

2. **Operational Metrics**

   - Cost per evaluation
   - Processing time
   - Success rate
   - Budget adherence

3. **Technical Metrics**
   - Average turns per analysis
   - Token efficiency
   - Error rates
   - Retry frequency

### Risk Mitigation

1. **Budget Overruns**

   - Hard budget limits per evaluation
   - Daily spending caps
   - Automatic fallback to standard analysis

2. **Performance Issues**

   - Timeout limits (60 seconds max)
   - Concurrent execution limits
   - Queue depth monitoring

3. **Quality Control**
   - Human review of first 100 evaluations
   - Automated quality scoring
   - User feedback collection

### Next Steps

1. **Immediate Actions**

   - Create feature branch
   - Install dependencies
   - Implement basic prototype

2. **Testing Phase**

   - Run 50 test evaluations
   - Compare quality metrics
   - Analyze cost/benefit ratio

3. **Decision Points**
   - Go/No-go on further development
   - Budget allocation decisions
   - Agent selection for Claude Code

This prototype will provide concrete data on whether Claude Code's advanced capabilities justify the increased cost for document evaluation tasks.
