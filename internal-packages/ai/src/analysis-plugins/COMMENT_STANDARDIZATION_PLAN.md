# Comment Standardization Implementation Plan

## Overview
This plan details the exact changes needed to standardize comment generation across all analysis plugins (spelling, math, forecast, fact-check).

## Phase 1: Create Unified Base Types and Builder

### 1.1 Create Enhanced Comment Types
**File:** `/internal-packages/ai/src/analysis-plugins/types.ts`

```typescript
// Add to existing types
export interface BaseCommentMetadata {
  // Plugin identification
  pluginName: string;
  pluginVersion: string;
  
  // Processing context
  timestamp: string;         // ISO 8601 format
  chunkId: string;
  processingTimeMs: number;
  
  // Confidence and severity
  confidence?: number;       // 0-100
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

export interface StructuredCommentContent {
  finding: string;          // What was found (required)
  issue?: string;          // What's wrong/problematic
  impact?: string;         // Why it matters
}

export interface EnhancedComment extends Comment {
  // These become required
  header: string;
  level: 'error' | 'warning' | 'info' | 'success';
  source: string;
  importance: number;
  
  // Structured content fields
  title?: string;
  observation?: string;
  significance?: string;
  
  // Enhanced metadata
  metadata: BaseCommentMetadata & Record<string, any>;
}
```

### 1.2 Create Unified Comment Builder
**File:** `/internal-packages/ai/src/analysis-plugins/utils/UnifiedCommentBuilder.ts`

```typescript
import { StandardCommentBuilder } from './StandardCommentBuilder';
import type { BaseCommentMetadata, StructuredCommentContent, EnhancedComment } from '../types';

export class UnifiedCommentBuilder extends StandardCommentBuilder {
  private static pluginVersions: Record<string, string> = {
    'spelling': '1.0.0',
    'math': '1.0.0',
    'forecast': '1.0.0',
    'fact-check': '1.0.0'
  };

  static buildPluginComment(options: {
    // Required fields
    plugin: string;
    location: DocumentLocation;
    chunkId: string;
    processingStartTime: number;
    
    // Structured content
    content: StructuredCommentContent;
    
    // Scoring
    severity: 'critical' | 'high' | 'medium' | 'low';
    confidence: number;
    
    // Plugin-specific metadata
    pluginMetadata: Record<string, any>;
  }): EnhancedComment {
    const processingTimeMs = Date.now() - options.processingStartTime;
    
    // Generate header
    const header = this.generateStandardHeader({
      plugin: options.plugin,
      finding: options.content.finding,
      severity: options.severity,
      confidence: options.confidence
    });
    
    // Calculate importance
    const importance = this.calculateStandardImportance({
      baseSeverity: options.severity,
      confidence: options.confidence,
      documentRelevance: options.pluginMetadata.contextImportanceScore,
      userImpact: options.pluginMetadata.userImpactScore
    });
    
    // Build description
    const description = this.buildStructuredDescription(options.content);
    
    // Determine level from severity
    const level = this.severityToLevel(options.severity, options.confidence);
    
    // Build base metadata
    const baseMetadata: BaseCommentMetadata = {
      pluginName: options.plugin,
      pluginVersion: this.pluginVersions[options.plugin] || '1.0.0',
      timestamp: new Date().toISOString(),
      chunkId: options.chunkId,
      processingTimeMs,
      confidence: options.confidence,
      severity: options.severity
    };
    
    return {
      // Core fields
      header,
      description,
      level,
      source: options.plugin,
      importance,
      isValid: true,
      
      // Structured content
      title: options.content.finding,
      observation: options.content.issue,
      significance: options.content.impact,
      
      // Location
      highlight: {
        startOffset: options.location.startOffset ?? 0,
        endOffset: options.location.endOffset ?? 0,
        quotedText: options.location.quotedText ?? '',
        isValid: true
      },
      
      // Combined metadata
      metadata: {
        ...baseMetadata,
        ...options.pluginMetadata
      }
    };
  }
  
  private static generateStandardHeader(params: {
    plugin: string;
    finding: string;
    severity: string;
    confidence: number;
  }): string {
    const emoji = this.getHeaderEmoji(params.plugin, params.severity, params.confidence);
    const prefix = this.getHeaderPrefix(params.plugin);
    const text = this.truncateHeader(params.finding, 60);
    
    return `${emoji} ${prefix}: ${text}`;
  }
  
  private static getHeaderEmoji(plugin: string, severity: string, confidence: number): string {
    // High confidence emojis
    if (confidence >= 80) {
      switch (severity) {
        case 'critical': return '🚨';
        case 'high': return '⚠️';
        case 'medium': return '📝';
        case 'low': return 'ℹ️';
      }
    }
    
    // Low confidence
    if (confidence < 50) return '❓';
    
    // Medium confidence
    return '❔';
  }
  
  private static getHeaderPrefix(plugin: string): string {
    const prefixes = {
      'spelling': 'Spelling',
      'math': 'Math',
      'forecast': 'Forecast',
      'fact-check': 'Fact'
    };
    return prefixes[plugin] || plugin;
  }
  
  private static calculateStandardImportance(factors: {
    baseSeverity: 'critical' | 'high' | 'medium' | 'low';
    confidence: number;
    documentRelevance?: number;
    userImpact?: number;
  }): number {
    const severityScores = {
      critical: 8,
      high: 6,
      medium: 4,
      low: 2
    };
    
    let score = severityScores[factors.baseSeverity];
    
    // Adjust for confidence (0.5-1.0 multiplier)
    const confidenceMultiplier = 0.5 + (factors.confidence / 200);
    score *= confidenceMultiplier;
    
    // Add context bonuses
    if (factors.documentRelevance !== undefined) {
      score += (factors.documentRelevance / 100) * 1.5;
    }
    if (factors.userImpact !== undefined) {
      score += (factors.userImpact / 100) * 1.5;
    }
    
    return Math.min(10, Math.max(0, Math.round(score * 10) / 10));
  }
  
  private static severityToLevel(
    severity: string, 
    confidence: number
  ): 'error' | 'warning' | 'info' | 'success' {
    // Low confidence always gets downgraded
    if (confidence < 50) {
      return severity === 'critical' ? 'warning' : 'info';
    }
    
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
      default:
        return 'info';
    }
  }
  
  private static buildStructuredDescription(content: StructuredCommentContent): string {
    const parts: string[] = [];
    
    // Always include the finding
    parts.push(`**Finding:** ${content.finding}`);
    
    // Add issue if present
    if (content.issue) {
      parts.push(`**Issue:** ${content.issue}`);
    }
    
    // Add impact if present
    if (content.impact) {
      parts.push(`**Impact:** ${content.impact}`);
    }
    
    return parts.join('\n\n');
  }
}
```

## Phase 2: Update Each Plugin

### 2.1 Spelling Plugin Changes
**File:** `/internal-packages/ai/src/analysis-plugins/plugins/spelling/index.ts`

#### Change in constructor:
```typescript
private processingStartTime: number = 0;
```

#### Change in analyze method:
```typescript
async analyze(chunks: TextChunk[], documentText: string): Promise<AnalysisResult> {
  this.processingStartTime = Date.now();
  // ... rest of method
}
```

#### Replace createComment method:
```typescript
private createComment(errorWithLocation: SpellingErrorWithLocation): Comment | null {
  const { error, chunk, location } = errorWithLocation;
  
  if (!location) return null;
  
  // Determine severity based on error type and importance
  let severity: 'critical' | 'high' | 'medium' | 'low';
  if (error.importance >= 80) {
    severity = error.type === 'grammar' ? 'high' : 'medium';
  } else if (error.importance >= 50) {
    severity = 'medium';
  } else {
    severity = 'low';
  }
  
  // Build structured content
  const content: StructuredCommentContent = {
    finding: error.conciseCorrection || `${error.text} → ${error.correction}`,
    issue: `${error.type === 'spelling' ? 'Misspelling' : 'Grammar error'}: "${error.text}"`,
    impact: this.getErrorImpact(error)
  };
  
  return UnifiedCommentBuilder.buildPluginComment({
    plugin: 'spelling',
    location,
    chunkId: chunk.id,
    processingStartTime: this.processingStartTime,
    content,
    severity,
    confidence: error.confidence || 100,
    pluginMetadata: {
      errorType: error.type,
      context: error.context,
      lineNumber: error.lineNumber,
      description: error.description,
      languageConvention: this.languageConvention?.convention
    }
  });
}

private getErrorImpact(error: SpellingGrammarError): string | undefined {
  if (error.importance >= 80) {
    return "This error significantly impacts readability and professionalism";
  } else if (error.importance >= 50) {
    return "This error may confuse readers or appear unprofessional";
  } else if (error.confidence && error.confidence < 70) {
    return "Minor issue that may be intentional or context-dependent";
  }
  return undefined;
}
```

### 2.2 Math Plugin Changes
**File:** `/internal-packages/ai/src/analysis-plugins/plugins/math/index.ts`

#### Add to MathAnalyzerJob class:
```typescript
private processingStartTime: number = 0;
```

#### Update HybridMathErrorWrapper.getComment():
```typescript
public async getComment(): Promise<Comment | null> {
  const startOffset = this.findTextOffsetInDocument(this.expression.originalText);
  if (startOffset === -1) {
    logger.warn(`Math expression text not found: "${this.expression.originalText}"`);
    return null;
  }
  const endOffset = startOffset + this.expression.originalText.length;
  
  // Determine severity
  const severity = this.determineSeverity();
  
  // Build structured content
  const content: StructuredCommentContent = {
    finding: this.verificationResult.conciseCorrection || 
             `Math error in: ${this.expression.originalText}`,
    issue: this.buildIssueDescription(),
    impact: this.buildImpactDescription()
  };
  
  return UnifiedCommentBuilder.buildPluginComment({
    plugin: 'math',
    location: {
      startOffset,
      endOffset,
      quotedText: this.expression.originalText
    },
    chunkId: this.chunkId, // Need to pass this in constructor
    processingStartTime: this.processingStartTime, // Need to pass this in
    content,
    severity,
    confidence: this.calculateConfidence(),
    pluginMetadata: {
      verifiedBy: this.verificationResult.verifiedBy,
      status: this.verificationResult.status,
      mathJsResult: this.verificationResult.mathJsResult,
      llmResult: this.verificationResult.llmResult,
      contextImportanceScore: this.expression.contextImportanceScore,
      complexityScore: this.expression.complexityScore
    }
  });
}

private determineSeverity(): 'critical' | 'high' | 'medium' | 'low' {
  if (this.verificationResult.llmResult?.severity === 'critical') return 'critical';
  if (this.verificationResult.llmResult?.severity === 'major') return 'high';
  if (this.verificationResult.llmResult?.severity === 'minor') return 'medium';
  return 'low';
}

private calculateConfidence(): number {
  if (this.verificationResult.verifiedBy === 'mathjs') return 95;
  if (this.verificationResult.llmResult?.confidence) {
    return this.verificationResult.llmResult.confidence;
  }
  return 80;
}

private buildIssueDescription(): string {
  if (this.verificationResult.mathJsResult?.error) {
    return `Calculation error: ${this.verificationResult.mathJsResult.error}`;
  }
  if (this.verificationResult.llmResult?.explanation) {
    return this.verificationResult.llmResult.explanation;
  }
  return "Mathematical expression contains an error";
}

private buildImpactDescription(): string | undefined {
  const severity = this.verificationResult.llmResult?.severity;
  if (severity === 'critical') {
    return "Critical error that fundamentally undermines the argument or conclusion";
  } else if (severity === 'major') {
    return "Significant error that affects the validity of related claims";
  } else if (severity === 'minor') {
    return "Minor error that should be corrected for accuracy";
  }
  return undefined;
}
```

### 2.3 Forecast Plugin Changes
**File:** `/internal-packages/ai/src/analysis-plugins/plugins/forecast/index.ts`

#### Update ExtractedForecastWrapper.getComment():
```typescript
public async getComment(): Promise<Comment | null> {
  const location = await this.findLocationInDocument();
  if (!location) return null;
  
  // Calculate average score for severity determination
  const avgScore = this.averageScore;
  
  // Determine severity based on forecast quality
  let severity: 'critical' | 'high' | 'medium' | 'low';
  if (avgScore < 3) severity = 'high';  // Poor quality forecast
  else if (avgScore < 5) severity = 'medium';
  else if (avgScore < 7) severity = 'low';
  else severity = 'low'; // Good forecasts still get comments but low severity
  
  // Build structured content
  const content: StructuredCommentContent = {
    finding: this.getFindingText(),
    issue: this.getIssueText(),
    impact: this.getImpactText()
  };
  
  // Calculate confidence based on our ability to assess the forecast
  const confidence = this.calculateAssessmentConfidence();
  
  return UnifiedCommentBuilder.buildPluginComment({
    plugin: 'forecast',
    location,
    chunkId: this.chunkId, // Need to pass this in
    processingStartTime: this.processingStartTime, // Need to pass this in
    content,
    severity,
    confidence,
    pluginMetadata: {
      predictionText: this.extractedForecast.rewrittenPredictionText,
      originalText: this.extractedForecast.originalText,
      importanceScore: this.extractedForecast.importanceScore,
      precisionScore: this.extractedForecast.precisionScore,
      verifiabilityScore: this.extractedForecast.verifiabilityScore,
      robustnessScore: this.extractedForecast.robustnessScore,
      averageScore: this.averageScore,
      resolutionDate: this.extractedForecast.resolutionDate,
      authorProbability: this.extractedForecast.authorProbability,
      ourPrediction: this.ourForecast?.probability,
      ourConsensus: this.ourForecast?.consensus,
      ourDescription: this.ourForecast?.description
    }
  });
}

private getFindingText(): string {
  const avgScore = this.averageScore;
  const scoreLabel = avgScore >= 7 ? 'High-quality' : 
                    avgScore >= 5 ? 'Moderate-quality' : 
                    'Low-quality';
  
  return `${scoreLabel} forecast: ${this.extractedForecast.rewrittenPredictionText.substring(0, 100)}${
    this.extractedForecast.rewrittenPredictionText.length > 100 ? '...' : ''
  }`;
}

private getIssueText(): string | undefined {
  const issues: string[] = [];
  
  if (this.extractedForecast.precisionScore < 5) {
    issues.push("vague or imprecise prediction");
  }
  if (this.extractedForecast.verifiabilityScore < 5) {
    issues.push("difficult to verify outcome");
  }
  if (this.extractedForecast.robustnessScore < 5) {
    issues.push("sensitive to interpretation");
  }
  
  if (issues.length > 0) {
    return `Issues: ${issues.join(", ")}`;
  }
  
  if (this.ourForecast && Math.abs(this.ourForecast.probability - (this.extractedForecast.authorProbability || 50)) > 30) {
    return `Significant disagreement with author's assessment (${this.extractedForecast.authorProbability || 'unstated'}% vs our ${this.ourForecast.probability}%)`;
  }
  
  return undefined;
}

private getImpactText(): string | undefined {
  if (this.extractedForecast.importanceScore >= 8) {
    return "This is a critical prediction that significantly affects the document's conclusions";
  } else if (this.extractedForecast.importanceScore >= 6) {
    return "This forecast impacts key arguments in the document";
  } else if (this.averageScore < 3) {
    return "Poor forecast quality undermines the credibility of predictions";
  }
  return undefined;
}

private calculateAssessmentConfidence(): number {
  // High confidence if we generated our own forecast
  if (this.ourForecast) return 85;
  
  // Otherwise base on how clear the forecast is
  const clarityScore = (this.extractedForecast.precisionScore + 
                       this.extractedForecast.verifiabilityScore) / 2;
  return Math.round(50 + (clarityScore * 5));
}
```

### 2.4 Fact-Check Plugin Changes
**File:** `/internal-packages/ai/src/analysis-plugins/plugins/fact-check/commentGeneration.ts`

This plugin is already well-structured, but needs updating to use the unified builder:

```typescript
export function generateFactCheckComment(
  fact: VerifiedFact,
  location: DocumentLocation,
  chunkId: string,
  processingStartTime: number
): Comment | null {
  // Determine severity
  const severity = determineSeverity(fact);
  
  // Build structured content
  const content: StructuredCommentContent = {
    finding: getFindingText(fact),
    issue: getIssueText(fact),
    impact: getImpactText(fact)
  };
  
  // Calculate confidence
  const confidence = calculateConfidence(fact);
  
  return UnifiedCommentBuilder.buildPluginComment({
    plugin: 'fact-check',
    location,
    chunkId,
    processingStartTime,
    content,
    severity,
    confidence,
    pluginMetadata: {
      topic: fact.claim.topic,
      importanceScore: fact.claim.importanceScore,
      checkabilityScore: fact.claim.checkabilityScore,
      truthProbability: fact.claim.truthProbability,
      verified: !!fact.verification,
      verdict: fact.verification?.verdict,
      verificationConfidence: fact.verification?.confidence,
      wasResearched: !!fact.factCheckerOutput?.perplexityData,
      corrections: fact.verification?.corrections,
      sources: fact.verification?.sources
    }
  });
}

function determineSeverity(fact: VerifiedFact): 'critical' | 'high' | 'medium' | 'low' {
  if (fact.verification?.verdict === 'false') {
    return fact.claim.importanceScore >= 8 ? 'critical' : 'high';
  }
  if (fact.verification?.verdict === 'partially-true') {
    return 'medium';
  }
  if (fact.claim.truthProbability <= 30 && !fact.verification) {
    return 'high';
  }
  if (fact.claim.truthProbability <= 50 && !fact.verification) {
    return 'medium';
  }
  return 'low';
}

function getFindingText(fact: VerifiedFact): string {
  const prefix = fact.verification ? 
    `${fact.verification.verdict.charAt(0).toUpperCase() + fact.verification.verdict.slice(1)} claim` :
    'Unverified claim';
  
  return `${prefix}: ${fact.claim.topic}`;
}

function getIssueText(fact: VerifiedFact): string | undefined {
  if (fact.verification?.verdict === 'false') {
    return `This claim is incorrect. ${fact.verification.explanation || ''}`.trim();
  }
  if (fact.verification?.verdict === 'partially-true') {
    return `This claim is only partially accurate. ${fact.verification.explanation || ''}`.trim();
  }
  if (!fact.verification && fact.claim.truthProbability <= 50) {
    return `This claim appears questionable (${fact.claim.truthProbability}% truth probability)`;
  }
  return fact.verification?.explanation;
}

function getImpactText(fact: VerifiedFact): string | undefined {
  if (fact.verification?.verdict === 'false' && fact.claim.importanceScore >= 8) {
    return "This false claim is central to the document's argument and must be corrected";
  }
  if (fact.verification?.verdict === 'false') {
    return fact.verification.corrections || "This claim should be corrected or removed";
  }
  if (fact.verification?.verdict === 'partially-true') {
    return "Important nuances or context are missing from this claim";
  }
  if (fact.claim.importanceScore >= 8 && !fact.verification) {
    return "This is a key claim that should be verified with credible sources";
  }
  return undefined;
}

function calculateConfidence(fact: VerifiedFact): number {
  if (fact.verification) {
    switch (fact.verification.confidence) {
      case 'high': return 90;
      case 'medium': return 70;
      case 'low': return 50;
    }
  }
  
  // For unverified claims, base on checkability
  if (fact.claim.checkabilityScore >= 8) return 60;
  if (fact.claim.checkabilityScore >= 5) return 40;
  return 30;
}
```

## Phase 3: Testing Strategy

### 3.1 Update Plugin Tests
Each plugin's test file needs updating to verify the new metadata structure:

```typescript
// Example test assertion
expect(comment).toMatchObject({
  header: expect.stringMatching(/^[🚨⚠️📝ℹ️❓❔]/),
  level: expect.stringMatching(/^(error|warning|info|success)$/),
  source: 'spelling',
  importance: expect.any(Number),
  metadata: expect.objectContaining({
    pluginName: 'spelling',
    pluginVersion: '1.0.0',
    timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    chunkId: expect.any(String),
    processingTimeMs: expect.any(Number),
    confidence: expect.any(Number),
    severity: expect.stringMatching(/^(critical|high|medium|low)$/)
  })
});
```

## Phase 4: Migration Notes

### Breaking Changes:
1. All plugins now require `chunkId` to be passed through to comment generation
2. Processing start time must be tracked from the beginning of analysis
3. Comment metadata structure is standardized

### Backwards Compatibility:
- Existing comment fields are preserved
- New fields are additions, not replacements
- UI components should handle missing fields gracefully

### Performance Considerations:
- Minimal overhead from timestamp generation
- Processing time tracking adds negligible cost
- Structured content generation may be slightly slower but more maintainable

## Summary of Benefits

1. **Consistent Metadata**: Every comment will have timestamp, processing info, and confidence
2. **Standardized Severity**: All plugins use the same severity scale
3. **Unified Headers**: Consistent emoji and formatting across all plugins
4. **Structured Content**: Finding/Issue/Impact pattern makes comments more scannable
5. **Better Debugging**: Processing time and chunk tracking help identify performance issues
6. **Improved UX**: Users see consistent comment quality regardless of plugin