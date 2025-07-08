# Document Analysis System - Current State Analysis

## Investigation Summary

### What We Discovered

#### 1. The Comment Extraction Bug
The most critical issue affecting user experience:
- Agents write 5 highlights in their markdown analysis (as requested)
- But the `commentInsights` array often only contains 2-3 items
- The extraction logic uses the array exclusively, ignoring markdown
- **Result**: Users see 5 highlights in the analysis but only get 2-3 actual comments

#### 2. Lost Data Problem
The AI generates rich structured data that we throw away:
```typescript
// What AI provides:
{
  id: "insight-1",
  title: "Unclear methodology section",        // ❌ LOST
  location: "Lines 45-52",                    // ✅ Saved
  observation: "The methodology lacks...",     // ❌ LOST  
  significance: "This weakens the...",        // ❌ LOST
  suggestedComment: "Consider clarifying..."  // ✅ Saved
}

// What we save:
{
  description: "Consider clarifying...",
  highlight: { startOffset: 1234, endOffset: 1456 }
}
```

#### 3. Code Quality Issues

**Duplication Example**: API Error Handling
```typescript
// This exact code appears in both:
// - src/lib/documentAnalysis/selfCritique/index.ts (lines 122-144)
// - src/lib/documentAnalysis/comprehensiveAnalysis/index.ts (lines 137-163)

if (error?.status === 429) {
  throw new Error("Anthropic API rate limit exceeded. Please try again in a moment.");
}
if (error?.status === 402) {
  throw new Error("Anthropic API quota exceeded. Please check your billing.");
}
// ... 20 more lines of identical code
```

**Inconsistent Patterns**:
- Some files use `logger.error`, others use `console.error`
- Type safety bypassed with `as any` casts
- Unused code paths (title fallback that never executes)

#### 4. Terminology Confusion
The prompts mix "highlights" and "comments":
- "Key Highlights section with approximately 5 specific comments"
- "For the Key Highlights section, use this format for each comment"
- "### Highlight [#]"

This likely confuses the AI about what to generate.

### Impact on Users

1. **Missing Comments**: Users expect 5 comments but often get 2-3
2. **Lost Context**: Rich insights from AI are reduced to simple text
3. **Inconsistent Results**: Different agents behave unpredictably
4. **Poor UX**: Mismatch between what users see and what they get

### Root Causes

1. **No Validation**: System accepts whatever AI returns without checking
2. **Schema Evolution**: Database schema hasn't kept up with AI capabilities
3. **Technical Debt**: Quick fixes and workarounds accumulated over time
4. **Unclear Requirements**: Mixed terminology and soft constraints