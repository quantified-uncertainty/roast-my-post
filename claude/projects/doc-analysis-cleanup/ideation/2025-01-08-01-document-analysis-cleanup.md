# Document Analysis System Cleanup

## Current Issues

### 1. Code Duplication
- API error handling is copy-pasted between `selfCritique/index.ts` and `comprehensiveAnalysis/index.ts`
- Identical 20+ line error handling blocks
- `formatFixing` function duplicated for JSON escaping

### 2. Schema Mismatch
- AI generates comments with rich structure:
  ```typescript
  {
    id: string,
    title: string,         // ❌ Lost
    location: string,      // ✅ Converted to highlight
    observation: string,   // ❌ Lost
    significance: string,  // ❌ Lost
    suggestedComment: string // ✅ Saved as description
  }
  ```
- Database only stores:
  ```typescript
  {
    description: string,
    highlight?: { startOffset, endOffset, quotedText }
  }
  ```
- We're throwing away 80% of the AI's structured output!

### 3. Confusing Terminology
- Prompt asks for "Key Highlights section with comments"
- Each item called "Highlight [#]" but contains a "comment"
- Mixed terminology likely confuses AI about what to generate

### 4. No Comment Count Enforcement + Extraction Mismatch
- System asks for "approximately 5" comments
- No minimum requirement
- No retry if AI generates too few
- **Critical Issue**: Agents write 5 highlights in markdown but only return 2-3 in `commentInsights` array
- Comment extraction uses structured array, ignores markdown highlights
- Result: User sees 5 highlights in analysis text but only 2-3 become actual comments

### 5. Inconsistent Code Patterns
- Mix of `logger.error` and `console.error`
- Type safety bypassed with `as any`
- Unused code paths (e.g., fallback title generation)

## Proposed Solutions

### Phase 1: Quick Fixes (Low Risk)

#### 1.1 Extract Shared Error Handler
```typescript
// lib/documentAnalysis/utils/apiErrorHandler.ts
export function handleAnthropicError(error: any): never {
  if (error?.status === 429) {
    throw new Error("Anthropic API rate limit exceeded. Please try again in a moment.");
  }
  if (error?.status === 402) {
    throw new Error("Anthropic API quota exceeded. Please check your billing.");
  }
  // ... rest of error handling
}
```

#### 1.2 Fix Terminology
- Choose either "highlights" OR "comments" consistently
- Update prompts to use single term throughout
- Rename variables/functions to match

#### 1.3 Fix Comment Extraction Mismatch
```typescript
// Option A: Validate structured output matches markdown
if (result.commentInsights.length < targetComments) {
  const highlightsInText = result.analysis.match(/### Highlight \[/g)?.length || 0;
  if (highlightsInText > result.commentInsights.length) {
    logger.warn(`Mismatch: ${highlightsInText} highlights in text but only ${result.commentInsights.length} in structured data`);
    // Could retry or parse from markdown
  }
}

// Option B: Always parse from markdown when count is low
if (result.commentInsights.length < targetComments - 1) {
  const extractedComments = await extractCommentsFromMarkdown(result.analysis);
  return extractedComments; // Use markdown parsing instead
}
```

### Phase 2: Schema Enhancement (Medium Risk)

#### 2.1 Extend Comment Model
Add fields to preserve AI insights:
```prisma
model EvaluationComment {
  id          String @id @default(cuid())
  description String // Current comment text
  title       String? // New: Short title
  observation String? // New: Detailed observation
  significance String? // New: Why it matters
  // ... existing fields
}
```

#### 2.2 Create Richer Comment Type
```typescript
interface EnhancedComment {
  description: string;
  title?: string;
  metadata?: {
    observation: string;
    significance: string;
    confidence?: number;
  };
  highlight?: Highlight;
}
```

### Phase 3: Architectural Improvements (Higher Risk)

#### 3.1 Unified Analysis Pipeline
```typescript
class DocumentAnalyzer {
  constructor(
    private anthropic: Anthropic,
    private config: AnalysisConfig
  ) {}
  
  async analyze(document: Document, agent: Agent): Promise<Analysis> {
    const comprehensiveResult = await this.generateComprehensive();
    const comments = await this.extractComments(comprehensiveResult);
    const critique = await this.generateCritique(comprehensiveResult);
    return this.assembleAnalysis(comprehensiveResult, comments, critique);
  }
}
```

#### 3.2 Comment Generation Strategy
```typescript
interface CommentStrategy {
  minComments: number;
  maxComments: number;
  targetComments: number;
  selectionCriteria: 'significance' | 'coverage' | 'critical';
}
```

#### 3.3 Better Prompt Engineering
```typescript
const COMMENT_GENERATION_PROMPT = `
Generate exactly ${targetComments} insights about this document.
Each insight MUST include:
- A specific line reference
- An observation about that section
- Why it matters

Quality over quantity - only highlight truly significant points.
`;
```

## Implementation Priority

1. **Immediate** (1-2 hours):
   - Extract error handler utility
   - Fix terminology inconsistency
   - Add basic comment count logging

2. **Short-term** (1 day):
   - Extend Comment model to preserve titles
   - Improve comment extraction to use all AI data
   - Add retry logic for low comment counts

3. **Long-term** (1 week):
   - Refactor into cohesive DocumentAnalyzer class
   - Implement per-agent comment strategies
   - Add comprehensive test suite

## Benefits

- **Less Code**: ~30% reduction through deduplication
- **Better Data**: Preserve AI's rich insights instead of discarding
- **More Reliable**: Consistent comment generation
- **Easier Maintenance**: Clear, single-responsibility modules
- **Enhanced UX**: Richer comments with titles and context

## Risks & Mitigation

- **Database Migration**: Add new fields as nullable initially
- **Backward Compatibility**: Keep old interfaces, deprecate gradually
- **AI Behavior Changes**: Test prompts extensively before deployment
- **Performance**: Monitor token usage with richer schemas