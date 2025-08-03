# Simplified Comment Standardization Plan

## The Problem
We currently have multiple comment types and interfaces when we should just have one comprehensive type that all plugins use consistently.

## The Solution: One Comment Type To Rule Them All

### 1. Update the Base Comment Interface
**File:** `/internal-packages/ai/src/shared/types.ts`

```typescript
/**
 * The ONE comment structure for all document annotations
 * All fields that might be used by any plugin should be here
 */
export interface Comment {
  // Required core fields
  header: string;                    // Brief summary (max 80 chars)
  description: string;               // Full formatted explanation  
  source: string;                    // Plugin name that created this
  level: 'error' | 'warning' | 'info' | 'success';
  importance: number;                // 0-10 scale
  isValid: boolean;                 // Always true for valid comments
  
  // Required location data
  highlight: {
    startOffset: number;
    endOffset: number;
    quotedText: string;
    isValid: boolean;
    prefix?: string;
    error?: string;
  };
  
  // Structured content fields (all optional but recommended)
  title?: string;                   // One-line title
  observation?: string;             // What was found
  significance?: string;            // Why it matters
  
  // Scoring fields
  grade?: number;                   // 0-1 quality score (if applicable)
  
  // Rich metadata (required but content varies by plugin)
  metadata: {
    // Base fields ALL plugins must provide
    pluginName: string;
    pluginVersion: string;
    timestamp: string;              // ISO 8601
    chunkId: string;
    processingTimeMs: number;
    confidence: number;             // 0-100
    severity: 'critical' | 'high' | 'medium' | 'low';
    
    // Plugin-specific fields go here
    [key: string]: any;
  };
  
  // Legacy fields kept for compatibility
  id?: string;
  content?: string;                 // Deprecated - use description
  startLine?: number;               // Deprecated - use highlight
  endLine?: number;                 // Deprecated - use highlight
  startChar?: number;               // Deprecated - use highlight
  endChar?: number;                 // Deprecated - use highlight
  agentId?: string;
  type?: string;                    // Deprecated - use level
  category?: string;
  severity?: string;                // Deprecated - use metadata.severity
}
```

### 2. Single Unified Comment Builder
**File:** `/internal-packages/ai/src/analysis-plugins/utils/CommentBuilder.ts`

```typescript
import type { Comment, DocumentLocation } from '../../shared/types';

export interface CommentBuildOptions {
  // Required
  plugin: string;
  location: DocumentLocation;
  chunkId: string;
  processingStartTime: number;
  
  // Semantic content (what was found)
  finding: string;                  // What was found
  issue?: string;                   // What's wrong (if applicable)
  impact?: string;                  // Why it matters
  
  // Raw descriptive text (for backwards compatibility)
  rawDescription?: string;          // Plugin's formatted description
  
  // Scoring/Assessment
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;               // 0-100
  importance?: number;              // 0-10, auto-calculated if not provided
  grade?: number;                   // 0-1 if applicable
  
  // Plugin-specific metadata
  pluginMetadata: Record<string, any>;
}

export class CommentBuilder {
  private static readonly PLUGIN_VERSIONS: Record<string, string> = {
    'spelling': '1.0.0',
    'math': '1.0.0',
    'forecast': '1.0.0',
    'fact-check': '1.0.0'
  };

  /**
   * Build a comment - THE ONLY WAY to create comments
   * Focuses on capturing semantic information, not formatting
   */
  static build(options: CommentBuildOptions): Comment {
    const processingTimeMs = Date.now() - options.processingStartTime;
    
    // Auto-calculate importance if not provided
    const importance = options.importance ?? this.calculateImportance(options);
    
    // Determine level from severity and confidence
    const level = this.severityToLevel(options.severity, options.confidence);
    
    // Build the ONE TRUE COMMENT
    const comment: Comment = {
      // Core semantic fields
      header: options.finding,  // Just the finding, no formatting
      description: options.rawDescription || options.finding,
      source: options.plugin,
      level,
      importance,
      isValid: true,
      
      // Location
      highlight: {
        startOffset: options.location.startOffset ?? 0,
        endOffset: options.location.endOffset ?? 0,
        quotedText: options.location.quotedText ?? '',
        isValid: true,
        prefix: (options.location as any).prefix,
      },
      
      // Structured semantic content
      title: options.finding,
      observation: options.issue,
      significance: options.impact,
      
      // Scoring
      grade: options.grade,
      
      // Metadata - all the semantic information
      metadata: {
        // Base metadata
        pluginName: options.plugin,
        pluginVersion: this.PLUGIN_VERSIONS[options.plugin] || '1.0.0',
        timestamp: new Date().toISOString(),
        chunkId: options.chunkId,
        processingTimeMs,
        confidence: options.confidence,
        severity: options.severity,
        
        // Semantic content (duplicated for easy access)
        finding: options.finding,
        issue: options.issue,
        impact: options.impact,
        
        // Plugin-specific metadata
        ...options.pluginMetadata
      }
    };
    
    return comment;
  }
  
  private static calculateImportance(options: CommentBuildOptions): number {
    const severityScores = {
      critical: 8,
      high: 6,
      medium: 4,
      low: 2
    };
    
    let score = severityScores[options.severity];
    
    // Adjust for confidence
    const confidenceMultiplier = 0.5 + (options.confidence / 200);
    score *= confidenceMultiplier;
    
    // Add plugin-specific bonuses
    const contextScore = options.pluginMetadata.contextImportanceScore;
    if (contextScore !== undefined) {
      score += (contextScore / 100) * 2;
    }
    
    return Math.min(10, Math.max(0, Math.round(score * 10) / 10));
  }
  
  private static severityToLevel(
    severity: string, 
    confidence: number
  ): 'error' | 'warning' | 'info' | 'success' {
    // Low confidence downgrades severity
    if (confidence < 50) {
      return severity === 'critical' ? 'warning' : 'info';
    }
    
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      default:
        return 'info';
    }
  }
}
```

### 3. Example Plugin Updates

#### Spelling Plugin - Simplified
```typescript
private createComment(errorWithLocation: SpellingErrorWithLocation): Comment | null {
  const { error, chunk, location } = errorWithLocation;
  if (!location) return null;
  
  // Determine severity based on importance score
  const severity = error.importance >= 80 ? 'high' :
                  error.importance >= 50 ? 'medium' : 'low';
  
  // Keep the existing formatted description for now
  const formattedDescription = generateSpellingComment(error);
  
  return CommentBuilder.build({
    plugin: 'spelling',
    location,
    chunkId: chunk.id,
    processingStartTime: this.processingStartTime,
    
    // Semantic content
    finding: error.conciseCorrection || `${error.text} → ${error.correction}`,
    issue: `${error.type === 'spelling' ? 'Misspelling' : 'Grammar error'}: "${error.text}"`,
    impact: error.importance >= 50 ? 
            "Affects readability and professionalism" : undefined,
    
    // Raw description for backwards compatibility
    rawDescription: formattedDescription,
    
    severity,
    confidence: error.confidence || 100,
    
    pluginMetadata: {
      // Core spelling metadata
      errorType: error.type,
      originalText: error.text,
      correction: error.correction,
      conciseCorrection: error.conciseCorrection,
      
      // Context information
      context: error.context,
      lineNumber: error.lineNumber,
      description: error.description,
      
      // Language settings
      languageConvention: this.languageConvention?.convention,
      
      // Scoring
      importanceScore: error.importance
    }
  });
}
```

#### Math Plugin - Simplified
```typescript
public async getComment(): Promise<Comment | null> {
  // ... location finding code ...
  
  const severity = this.verificationResult.llmResult?.severity === 'critical' ? 'critical' :
                  this.verificationResult.llmResult?.severity === 'major' ? 'high' :
                  this.verificationResult.llmResult?.severity === 'minor' ? 'medium' : 'low';
  
  return CommentBuilder.build({
    plugin: 'math',
    location,
    chunkId: this.chunkId,
    processingStartTime: this.processingStartTime,
    
    finding: this.verificationResult.conciseCorrection || 
             `Math error: ${this.expression.originalText}`,
    issue: this.verificationResult.mathJsResult?.error ||
           this.verificationResult.llmResult?.explanation ||
           "Calculation error",
    impact: this.getImpactBySeverity(severity),
    
    severity,
    confidence: this.verificationResult.verifiedBy === 'mathjs' ? 95 : 80,
    
    pluginMetadata: {
      verifiedBy: this.verificationResult.verifiedBy,
      status: this.verificationResult.status,
      mathJsResult: this.verificationResult.mathJsResult,
      contextImportanceScore: this.expression.contextImportanceScore,
      complexityScore: this.expression.complexityScore
    }
  });
}
```

## Benefits of This Approach

1. **One Comment Type**: No confusion about which interface to use
2. **Consistent Structure**: Every comment has the same fields available
3. **Single Builder**: One way to create comments ensures consistency
4. **Flexible**: Plugins can still customize via metadata and formatted descriptions
5. **Future-Proof**: New fields can be added to the one Comment interface
6. **Simpler Testing**: Only one comment structure to validate

## Migration Strategy

1. Update the Comment interface in `shared/types.ts`
2. Create the single CommentBuilder
3. Update each plugin to use CommentBuilder.build()
4. Remove all other comment-related types and builders
5. Update tests to expect the unified structure

## What We're Eliminating

- `StandardCommentOptions`
- `EnhancedComment` 
- `BaseCommentMetadata` (merged into Comment)
- `StructuredCommentContent` (merged into build options)
- Multiple comment builder classes
- Separate comment generation functions

Everything is just `Comment` and `CommentBuilder.build()`.