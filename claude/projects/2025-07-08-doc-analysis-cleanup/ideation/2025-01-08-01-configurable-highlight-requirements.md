# Configurable Comment Requirements for Agents

## Investigation Summary

After examining the agent system in roast-my-post, I've identified how agents are currently configured and where comment requirements are hardcoded.

### Current Agent Configuration

Agents are stored in the database with the following configurable fields:
- `name`: Agent name
- `description`: What the agent does
- `primaryInstructions`: Main evaluation instructions (includes analysis, comment, and summary instructions)
- `selfCritiqueInstructions`: Optional quality control criteria
- `providesGrades`: Boolean for whether agent provides numerical grades (0-100)
- `extendedCapabilityId`: Optional special capabilities identifier
- `readme`: Human-readable documentation

### Current Comment Generation Flow

1. **Hardcoded Target**: The number of comments is currently hardcoded to 5 in multiple places:
   - Default parameter in `analyzeDocument()`: `targetComments: number = 5`
   - Default parameter in `generateComprehensiveAnalysis()`: `targetComments: number = 5`
   - Not specified when called from `processJob()`, so defaults to 5

2. **Comment Generation Process**:
   - `generateComprehensiveAnalysis()` creates "comment insights" based on the target number
   - The prompt explicitly tells the AI to generate "approximately X specific comments"
   - `extractCommentsFromAnalysis()` then converts these insights into actual comments with highlights

3. **Agent Types** (from documentation):
   - **ASSESSOR**: Provides grades and detailed assessments
   - **ADVISOR**: Offers recommendations and improvement suggestions
   - **ENRICHER**: Adds context and supplementary content
   - **EXPLAINER**: Clarifies complex content

## Proposed Solution: Add Comment Configuration to Agents

### 1. Database Schema Change

Add new fields to the `AgentVersion` model:

```prisma
model AgentVersion {
  // ... existing fields ...
  
  // Comment configuration
  targetCommentCount    Int?     @default(5)  // Target number of comments
  minCommentCount       Int?     @default(3)  // Minimum acceptable comments
  maxCommentCount       Int?     @default(10) // Maximum comments allowed
  commentStrategy       String?  @default("balanced") // "minimal", "balanced", "comprehensive"
}
```

### 2. Update Agent Schema Types

```typescript
// In agentSchema.ts
export const AgentVersionSchema = z.object({
  // ... existing fields ...
  targetCommentCount: z.number().min(1).max(20).optional().default(5),
  minCommentCount: z.number().min(0).max(20).optional().default(3),
  maxCommentCount: z.number().min(1).max(30).optional().default(10),
  commentStrategy: z.enum(["minimal", "balanced", "comprehensive"]).optional().default("balanced"),
});
```

### 3. Update Agent Form Fields

Add configuration fields to the agent creation/edit form:

```typescript
// In agentFormFields.ts
{
  name: "targetCommentCount",
  label: "Target Comment Count",
  type: "number",
  placeholder: "5",
  description: "Ideal number of comments for this agent to generate (1-20)",
},
{
  name: "commentStrategy",
  label: "Comment Strategy",
  type: "select",
  options: [
    { value: "minimal", label: "Minimal (Focus on critical issues only)" },
    { value: "balanced", label: "Balanced (Mix of important and minor points)" },
    { value: "comprehensive", label: "Comprehensive (Detailed coverage)" },
  ],
  description: "How thoroughly should this agent comment on documents?",
},
```

### 4. Update Analysis Functions

Modify the analysis flow to use agent-specific comment configuration:

```typescript
// In Job.ts processJob()
const analysisResult = await analyzeDocument(
  documentForAnalysis, 
  agent,
  500, // targetWordCount (could also be configurable)
  agent.targetCommentCount || 5 // Use agent's target or default
);

// In analyzeDocument()
export async function analyzeDocument(
  document: Document,
  agentInfo: Agent,
  targetWordCount: number = 500,
  targetComments?: number, // Make optional
  anthropicApiKey?: string
): Promise<...> {
  // Use agent's target if not explicitly provided
  const commentTarget = targetComments ?? agentInfo.targetCommentCount ?? 5;
  
  // Pass to comprehensive analysis
  const analysisResult = await generateComprehensiveAnalysis(
    document,
    agentInfo,
    targetWordCount,
    commentTarget
  );
```

### 5. Update Prompts Based on Strategy

Enhance the prompt generation to consider the comment strategy:

```typescript
// In prompts.ts
const commentGuidance = getCommentGuidance(
  agentInfo.commentStrategy || "balanced",
  targetComments
);

const systemMessage = `You are ${agentInfo.name}, ${agentInfo.description}.

${agentInfo.primaryInstructions}

${commentGuidance}

Structure your response as a markdown document...`;

function getCommentGuidance(strategy: string, targetCount: number): string {
  switch (strategy) {
    case "minimal":
      return `Focus on ${targetCount} critical issues only. Each comment should address a significant problem or opportunity.`;
    case "comprehensive":
      return `Provide ${targetCount} detailed comments covering all aspects. Include both major insights and minor observations.`;
    default:
      return `Provide approximately ${targetCount} balanced comments focusing on the most valuable insights.`;
  }
}
```

## Benefits

1. **Flexibility**: Different agents can have different comment densities based on their purpose
2. **User Control**: Users can create agents that match their needs (quick scan vs detailed review)
3. **Quality over Quantity**: Agents can be configured to focus on fewer, higher-quality comments
4. **Backward Compatible**: Existing agents continue to work with default values

## Implementation Considerations

1. **Migration**: Existing agents would get default values (5 comments, balanced strategy)
2. **Validation**: Ensure min/max bounds are respected in the UI and API
3. **Cost Impact**: More comments = higher token usage, should be reflected in cost estimates
4. **UI Updates**: Agent detail pages should show comment configuration
5. **Testing**: Need to test various comment counts and strategies

## Example Use Cases

- **Quick Review Agent**: 2-3 comments, minimal strategy - for fast document scanning
- **Academic Reviewer**: 8-10 comments, comprehensive strategy - for thorough paper reviews
- **Code Reviewer**: 5-7 comments, balanced strategy - for PR reviews
- **Executive Summary**: 3-4 comments, minimal strategy - for high-level insights only

This approach gives users fine-grained control over agent behavior while maintaining simplicity through sensible defaults.