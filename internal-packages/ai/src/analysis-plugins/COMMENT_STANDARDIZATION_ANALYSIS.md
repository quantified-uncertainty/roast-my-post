# Analysis Plugin Comment Standardization Analysis

## Current State Analysis

### 1. Spelling Plugin
**Consistency Level: GOOD** ✅

**What it does well:**
- Uses `generateSpellingComment()` for consistent formatting
- Includes structured metadata: `errorType`, `confidence`, `context`, `lineNumber`
- Has clear header format: `"error → correction"`
- Uses HTML styling with severity-based colors
- Always sets `level: 'error'` (appropriate for spelling/grammar)
- Includes confidence indicators with emojis (❓❔)

**What could be improved:**
- Missing: `timestamp`, `chunkId`, `pluginVersion`
- Could add: `suggestionType` (spelling vs grammar), `languageConvention` used
- No `severity` field (relies on importance score instead)

### 2. Math Plugin  
**Consistency Level: MODERATE** ⚠️

**What it does well:**
- Two separate comment generators for different error types
- Rich metadata: `verifiedBy`, `status`, `mathJsResult`, `contextImportanceScore`
- Dynamic level setting: 'error' for failures, 'success' for verified, 'info' otherwise
- Clear headers with error indication

**What could be improved:**
- Inconsistent metadata between ExtractedMathExpression and HybridMathErrorWrapper
- Missing: `timestamp`, `chunkId`, `pluginVersion`
- Could add: `expressionType`, `verificationMethod`, `computationDetails`
- No standardized severity scoring

### 3. Forecast Plugin
**Consistency Level: GOOD** ✅

**What it does well:**
- Comprehensive metadata including all forecast scores
- Includes both author's and plugin's predictions
- Dynamic level based on quality scores
- Good header generation with quality indicators

**What could be improved:**
- Missing: `timestamp`, `chunkId`, `pluginVersion`
- Could add: `forecastType`, `timeHorizon`, `resolutionMethod`
- No severity field (uses level instead)

### 4. Fact-Check Plugin
**Consistency Level: EXCELLENT** ✅✅

**What it does well:**
- Most comprehensive metadata of all plugins
- Includes verification status, confidence, research indicators
- Uses both `title`, `observation`, and `significance` fields
- Dynamic header based on verification status
- Clear severity mapping to comment levels
- Includes `grade` field for scoring

**What could be improved:**
- Missing: `timestamp`, `chunkId`, `pluginVersion`
- Could add: `sourceReliability`, `evidenceQuality`

## Inconsistencies Across Plugins

### 1. **Metadata Fields**
- **Spelling**: Basic metadata (errorType, confidence, context)
- **Math**: Medium metadata (verifiedBy, status, scores)
- **Forecast**: Rich metadata (all scores, predictions)
- **Fact-check**: Richest metadata (verdict, confidence, research status)

### 2. **Header Generation**
- **Spelling**: Simple arrow format
- **Math**: "Math Error:" prefix
- **Forecast**: Quality-based emojis
- **Fact-check**: Verdict-based with icons (✓✗⚠️)

### 3. **Level Assignment**
- **Spelling**: Always 'error'
- **Math**: Dynamic (error/success/info)
- **Forecast**: Dynamic based on quality
- **Fact-check**: Dynamic based on verdict

### 4. **Use of Additional Fields**
- Only **Fact-check** uses `title`, `observation`, `significance`
- Only **Fact-check** and **Math** use `grade`
- All use `importance` but calculate differently

## Recommendations for Standardization

### 1. **Core Metadata Standard**
Every plugin should include these base fields in metadata:
```typescript
metadata: {
  // Plugin identification
  pluginName: string;        // 'spelling', 'math', etc.
  pluginVersion: string;     // '1.0.0'
  
  // Processing context
  timestamp: string;         // ISO timestamp
  chunkId: string;          // Which chunk this came from
  processingTimeMs: number; // How long analysis took
  
  // Error/confidence tracking
  confidence?: number;       // 0-100 confidence score
  severity?: 'critical' | 'high' | 'medium' | 'low';
  
  // Plugin-specific fields...
}
```

### 2. **Standardized Comment Interface Extension**
```typescript
interface EnhancedComment extends Comment {
  // Required fields
  header: string;           // Brief summary (max 80 chars)
  level: 'error' | 'warning' | 'info' | 'success';
  source: string;           // Plugin name
  importance: number;       // 0-10 scale
  
  // Rich description
  description: string;      // Full formatted explanation
  
  // Optional structured fields
  title?: string;          // One-line title
  observation?: string;    // What was found
  significance?: string;   // Why it matters
  recommendation?: string; // What to do about it
  
  // Scoring
  grade?: number;         // 0-1 quality score
  
  // Enhanced metadata
  metadata: BaseMetadata & PluginSpecificMetadata;
}
```

### 3. **Header Format Guidelines**
- Max 80 characters
- Use consistent emoji indicators:
  - ✓ Verified/correct
  - ✗ False/incorrect  
  - ⚠️ Warning/partially correct
  - 📊 Informational
  - 🎯 High confidence
  - ❓ Low confidence
- Format: `[Emoji] [Type]: [Brief description]`

### 4. **Importance Score Calculation**
Standardize importance calculation across plugins:
```typescript
function calculateStandardImportance(factors: {
  baseSeverity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;      // 0-100
  documentRelevance?: number; // 0-100
  userImpact?: number;     // 0-100
}): number {
  const severityScores = {
    critical: 8,
    high: 6,
    medium: 4,
    low: 2
  };
  
  let score = severityScores[factors.baseSeverity];
  
  // Adjust for confidence
  score *= (factors.confidence / 100);
  
  // Add bonuses
  if (factors.documentRelevance) {
    score += (factors.documentRelevance / 100) * 2;
  }
  if (factors.userImpact) {
    score += (factors.userImpact / 100) * 2;
  }
  
  return Math.min(10, Math.max(0, score));
}
```

### 5. **Missing Information to Add**

#### All Plugins Should Track:
- **Processing metadata**: When/how the analysis was done
- **Confidence scores**: How sure the plugin is about findings
- **Context references**: Which chunk/section generated the comment
- **Version info**: For debugging and compatibility

#### Plugin-Specific Enhancements:

**Spelling Plugin**:
- Add `suggestionAlternatives`: Other possible corrections
- Add `commonMistake`: Boolean if this is a known common error
- Add `contextualCorrectness`: Whether it might be correct in context

**Math Plugin**:
- Add `calculationSteps`: Show work for complex calculations
- Add `assumptionsMade`: What the plugin assumed (units, etc.)
- Add `alternativeInterpretations`: Other ways to read the expression

**Forecast Plugin**:
- Add `bettingOdds`: Convert probability to betting format
- Add `similarForecasts`: Reference to similar predictions
- Add `updateHistory`: If this updates a previous forecast

**Fact-Check Plugin**:
- Add `evidenceSources`: URLs or references checked
- Add `factCheckHistory`: Previous checks of similar claims
- Add `relatedClaims`: Other claims that depend on this

### 6. **Unified Comment Builder**
Create a shared comment builder that all plugins use:
```typescript
class UnifiedCommentBuilder extends StandardCommentBuilder {
  static buildPluginComment(options: {
    // Required
    plugin: string;
    description: string;
    location: DocumentLocation;
    
    // Structured content
    finding: string;        // What was found
    issue?: string;        // What's wrong (if applicable)
    impact?: string;       // Why it matters
    suggestion?: string;   // How to fix it
    
    // Scoring
    severity: 'critical' | 'high' | 'medium' | 'low';
    confidence: number;    // 0-100
    
    // Plugin-specific
    pluginMetadata: Record<string, any>;
  }): Comment {
    // Generate standardized header
    const header = this.generateHeader(options);
    
    // Calculate importance
    const importance = this.calculateStandardImportance({
      baseSeverity: options.severity,
      confidence: options.confidence,
      documentRelevance: options.pluginMetadata.contextImportanceScore,
      userImpact: options.pluginMetadata.userImpactScore
    });
    
    // Build rich description
    const description = this.buildRichDescription(options);
    
    return {
      header,
      description,
      level: this.severityToLevel(options.severity),
      source: options.plugin,
      importance,
      
      // Structured fields
      title: options.finding,
      observation: options.issue,
      significance: options.impact,
      recommendation: options.suggestion,
      
      // Metadata
      metadata: {
        ...this.getBaseMetadata(options.plugin),
        ...options.pluginMetadata,
        confidence: options.confidence,
        severity: options.severity
      },
      
      // Location
      highlight: {
        startOffset: options.location.startOffset ?? 0,
        endOffset: options.location.endOffset ?? 0,
        quotedText: options.location.quotedText ?? '',
        isValid: true
      }
    };
  }
}
```

## Implementation Priority

1. **Phase 1**: Add base metadata to all plugins (timestamp, chunkId, version)
2. **Phase 2**: Standardize importance calculation across plugins
3. **Phase 3**: Implement unified comment builder
4. **Phase 4**: Add rich structured fields (observation, significance, recommendation)
5. **Phase 5**: Enhance plugin-specific metadata based on recommendations

This standardization will ensure:
- Consistent user experience across all plugins
- Better debugging and tracking capabilities
- Richer information for downstream processing
- Easier addition of new plugins following the standard