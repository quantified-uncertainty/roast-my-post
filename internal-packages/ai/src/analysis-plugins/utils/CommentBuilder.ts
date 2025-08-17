import type { Comment, DocumentLocation, ToolChainResult, CommentMetadata } from '../../shared/types';
import type { 
  MathExtractResult, 
  ForecastExtractResult, 
  ForecastResult, 
  FactExtractResult, 
  FactVerifyResult 
} from "./types";

// Helper to safely access properties on unknown result objects
function getResultProperty<T>(result: unknown, prop: string): T | undefined {
  if (result && typeof result === 'object' && prop in result) {
    return (result as Record<string, unknown>)[prop] as T;
  }
  return undefined;
}

export interface CommentBuildOptions {
  // Required
  plugin: string;
  location: DocumentLocation;
  chunkId: string;
  processingStartTime: number;
  
  // Tool chain results (complete, unmodified)
  toolChain: ToolChainResult[];
  
  // Optional overrides (auto-generated from tool chain if not provided)
  header?: string;
  description?: string;
  level?: 'error' | 'warning' | 'info' | 'success' | 'debug';
  importance?: number;
  
  // Optional structured fields
  title?: string;
  observation?: string;
  significance?: string;
  grade?: number;
}

export class CommentBuilder {

  /**
   * Build a comment from tool chain results
   * THE ONLY WAY to create comments - preserves all tool data
   */
  static build(options: CommentBuildOptions): Comment {
    const processingTimeMs = Date.now() - options.processingStartTime;
    
    // Build metadata with complete tool chain
    const metadata: CommentMetadata = {
      pluginName: options.plugin,
      timestamp: new Date().toISOString(),
      chunkId: options.chunkId,
      processingTimeMs,
      toolChain: options.toolChain,
      
      // Quick access fields computed from tool chain
      ...this.computeQuickAccessFields(options.toolChain, options.plugin)
    };
    
    // Plugins must provide all required fields
    if (!options.description) throw new Error('Description is required');
    if (!options.header) throw new Error('Header is required');
    if (!options.level) throw new Error('Level is required');
    
    return {
      // Required fields (must be provided by plugins)
      description: options.description,
      header: options.header,
      level: options.level,
      source: options.plugin,
      
      // Optional fields
      importance: options.importance,
      grade: options.grade,
      
      // Location (stored in separate table in DB)
      highlight: {
        startOffset: options.location.startOffset ?? 0,
        endOffset: options.location.endOffset ?? 0,
        quotedText: options.location.quotedText ?? '',
        isValid: true,
        prefix: 'prefix' in options.location ? (options.location as any).prefix : undefined,
        error: 'error' in options.location ? (options.location as any).error : undefined,
      },
      
      // Complete metadata (stored as JSON in DB)
      metadata
    };
  }
  
  // All the extractDisplayFields methods removed - plugins now provide required fields directly
  
  /**
   * Compute quick access fields from tool chain
   */
  private static computeQuickAccessFields(toolChain: ToolChainResult[], plugin: string): Record<string, any> {
    const baseFields = {
      confidence: this.extractConfidence(toolChain, plugin),
      severity: this.extractSeverity(toolChain, plugin),
      primaryFinding: this.extractPrimaryFinding(toolChain, plugin),
      verified: this.extractVerified(toolChain, plugin)
    };
    
    // Add plugin-specific quick access fields
    switch (plugin) {
      case 'spelling':
        const spellResult = toolChain.find(t => t.toolName === 'checkSpellingGrammar')?.result;
        const conventionResult = toolChain.find(t => t.toolName === 'detectLanguageConvention')?.result;
        return {
          ...baseFields,
          errorType: getResultProperty<string>(spellResult, 'type'),
          languageConvention: getResultProperty<string>(conventionResult, 'convention')
        };
        
      case 'math':
        const mathExtract = toolChain.find(t => t.toolName === 'extractMath')?.result;
        const hybridResult = toolChain.find(t => t.toolName === 'check-math-hybrid')?.result;
        return {
          ...baseFields,
          verificationMethod: hybridResult ? 'hybrid' : 'computational',
          errorType: getResultProperty<string>(getResultProperty<Record<string, unknown>>(hybridResult, 'llmResult'), 'errorType'),
          complexityScore: getResultProperty<number>(mathExtract, 'complexityScore')
        };
        
      case 'forecast':
        const forecastExtract = toolChain.find(t => t.toolName === 'extractForecastingClaims')?.result;
        const forecastGen = toolChain.find(t => t.toolName === 'generateProbabilityForecast')?.result;
        return {
          ...baseFields,
          forecastQuality: this.calculateForecastQuality(forecastExtract),
          authorProbability: forecastExtract?.authorProbability,
          ourProbability: forecastGen?.probability
        };
        
      case 'fact-check':
        const factExtract = toolChain.find(t => t.toolName === 'extractCheckableClaims')?.result;
        const factVerify = toolChain.find(t => t.toolName === 'verifyClaimWithLLM')?.result;
        const factResearch = toolChain.find(t => t.toolName === 'factCheckWithPerplexity')?.result;
        return {
          ...baseFields,
          verdict: factVerify?.verdict,
          wasResearched: !!factResearch,
          hasSources: !!(getResultProperty<unknown[]>(factVerify, 'sources')?.length || getResultProperty<unknown[]>(factResearch, 'sources')?.length)
        };
        
      default:
        return baseFields;
    }
  }
  
  // Helper methods for extracting common fields
  private static extractConfidence(toolChain: ToolChainResult[], plugin: string): number {
    switch (plugin) {
      case 'spelling':
        const result = toolChain.find(t => t.toolName === 'checkSpellingGrammar')?.result;
        return getResultProperty<number>(result, 'confidence') || 100;
      case 'math':
        const hybridMathResult = toolChain.find(t => t.toolName === 'check-math-hybrid')?.result;
        // High confidence if MathJS verified, medium if LLM only
        return getResultProperty<string>(hybridMathResult, 'verifiedBy') === 'mathjs' ? 95 : 80;
      case 'forecast':
        return 70; // Medium confidence for forecast analysis
      case 'fact-check':
        const verify = toolChain.find(t => t.toolName === 'verifyClaimWithLLM')?.result;
        const confidence = getResultProperty<string>(verify, 'confidence');
        return confidence === 'high' ? 90 : confidence === 'medium' ? 70 : 50;
      default:
        return 50;
    }
  }
  
  private static extractSeverity(toolChain: ToolChainResult[], plugin: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (plugin) {
      case 'spelling':
        const spellResult = toolChain.find(t => t.toolName === 'checkSpellingGrammar')?.result;
        const spellingImportance = getResultProperty<number>(spellResult, 'importance') || 0;
        return spellingImportance >= 80 ? 'high' : spellingImportance >= 50 ? 'medium' : 'low';
      case 'math':
        const hybridSeverityResult = toolChain.find(t => t.toolName === 'check-math-hybrid')?.result;
        const mathSeverity = getResultProperty<string>(getResultProperty<Record<string, unknown>>(hybridSeverityResult, 'llmResult'), 'severity');
        return mathSeverity === 'critical' ? 'critical' : 
               mathSeverity === 'major' ? 'high' : 
               mathSeverity === 'minor' ? 'medium' : 'low';
      case 'forecast':
        const quality = this.calculateForecastQuality(toolChain.find(t => t.toolName === 'extractForecastingClaims')?.result);
        return quality < 3 ? 'high' : quality < 5 ? 'medium' : 'low';
      case 'fact-check':
        const verifyResult = toolChain.find(t => t.toolName === 'verifyClaimWithLLM')?.result;
        const verdict = getResultProperty<string>(verifyResult, 'verdict');
        const extractResult = toolChain.find(t => t.toolName === 'extractCheckableClaims')?.result;
        const factImportance = getResultProperty<number>(extractResult, 'importanceScore') || 0;
        return verdict === 'false' && factImportance >= 8 ? 'critical' :
               verdict === 'false' ? 'high' :
               verdict === 'partially-true' ? 'medium' : 'low';
      default:
        return 'medium';
    }
  }
  
  private static extractPrimaryFinding(toolChain: ToolChainResult[], plugin: string): string {
    switch (plugin) {
      case 'spelling':
        const spell = toolChain.find(t => t.toolName === 'checkSpellingGrammar')?.result;
        return getResultProperty<string>(spell, 'conciseCorrection') || 
               `${getResultProperty<string>(spell, 'text')} → ${getResultProperty<string>(spell, 'correction')}`;
      case 'math':
        const mathExtractResult = toolChain.find(t => t.toolName === 'extractMath')?.result;
        const hybridVerifyResult = toolChain.find(t => t.toolName === 'check-math-hybrid')?.result;
        return getResultProperty<string>(hybridVerifyResult, 'statement') || 
               `Math expression: ${getResultProperty<string>(mathExtractResult, 'originalText')}`;
      case 'forecast':
        const forecast = toolChain.find(t => t.toolName === 'extractForecastingClaims')?.result;
        return getResultProperty<string>(forecast, 'rewrittenPredictionText') || 
               getResultProperty<string>(forecast, 'originalText') || 'Forecast claim';
      case 'fact-check':
        const fact = toolChain.find(t => t.toolName === 'extractCheckableClaims')?.result;
        return getResultProperty<string>(fact, 'topic') || 
               getResultProperty<string>(fact, 'claim') || 'Fact claim';
      default:
        return 'Analysis result';
    }
  }
  
  private static extractVerified(toolChain: ToolChainResult[], plugin: string): boolean {
    switch (plugin) {
      case 'math':
        // Check the actual verification status, not just if tools were called
        const mathLLMResult = toolChain.find(t => t.toolName === 'checkMathWithLLM')?.result;
        const mathJSResult = toolChain.find(t => t.toolName === 'checkMathWithMathJS')?.result;
        const hybridResult = toolChain.find(t => t.toolName === 'check-math-hybrid')?.result;
        
        // Check if any verification shows verified_true
        return mathLLMResult?.status === 'verified_true' || 
               mathJSResult?.status === 'verified_true' ||
               hybridResult?.status === 'verified_true';
      case 'forecast':
        return !!toolChain.find(t => t.toolName === 'generateProbabilityForecast');
      case 'fact-check':
        const factResult = toolChain.find(t => t.toolName === 'verifyClaimWithLLM')?.result;
        return factResult?.verdict === 'true';
      default:
        return false;
    }
  }
  
  // Helper calculation methods
  private static calculateImportance(importance?: number, confidence?: number): number {
    const base = importance ? (importance / 100) * 8 : 4;
    const confidenceMultiplier = confidence ? (0.5 + confidence / 200) : 1;
    return Math.min(10, Math.max(0, Math.round(base * confidenceMultiplier)));
  }
  
  private static calculateMathImportance(llmResult?: unknown, extractResult?: MathExtractResult): number {
    const contextScore = extractResult?.contextImportanceScore || 50;
    const complexityScore = extractResult?.complexityScore || 20;
    const base = (contextScore + complexityScore) / 20;
    return Math.min(10, Math.max(0, Math.round(base)));
  }
  
  private static calculateForecastQuality(extractResult?: ForecastExtractResult): number {
    if (!extractResult) return 5;
    const scores = [
      extractResult.importanceScore,
      extractResult.precisionScore,
      extractResult.verifiabilityScore,
      extractResult.robustnessScore
    ].filter(s => s !== undefined);
    return scores.length > 0 ? scores.reduce((a, b) => a + b) / scores.length : 5;
  }
  
  private static calculateForecastImportance(extractResult?: ForecastExtractResult, forecastResult?: ForecastResult): number {
    const importanceScore = extractResult?.importanceScore || 50;
    const quality = this.calculateForecastQuality(extractResult);
    return Math.min(10, Math.max(0, Math.round((importanceScore + quality * 10) / 20)));
  }
  
  private static calculateFactImportance(extractResult?: FactExtractResult, verifyResult?: FactVerifyResult): number {
    const importanceScore = extractResult?.importanceScore || 50; 
    const isFalse = verifyResult?.verdict === 'false';
    const base = (importanceScore / 100) * 8;
    return Math.min(10, Math.max(0, Math.round(base + (isFalse ? 2 : 0))));
  }
}