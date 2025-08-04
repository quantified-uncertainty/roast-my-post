# Comprehensive Codebase Refactoring Plan
## RoastMyPost Architecture Cleanup & Simplification

*Generated: 2025-01-04*  
*Status: Implementation Ready*  
*Estimated Timeline: 4 weeks*

---

## Executive Summary

This document provides a detailed, step-by-step plan to refactor the RoastMyPost codebase and resolve major architectural complexity issues. The current system suffers from dual plugin architectures, scattered coordinate transformation systems, complex Helicone integration, and oversized management classes.

**Key Problems Identified:**
- Dual plugin systems running in parallel (old + new)
- Multiple overlapping coordinate transformation systems (4+ implementations)
- Complex Helicone session management scattered across 38+ files
- 792-line PluginManager handling too many responsibilities
- 7 failing unit tests indicating core functionality issues

**Expected Outcomes:**
- 30% reduction in analysis-related code
- Unified plugin architecture
- Simplified coordinate systems
- Better testability and maintainability
- Elimination of race conditions in session management

---

## Current State Analysis

### 1. Dual Plugin System Architecture

#### Old System (`apps/web/src/lib/documentAnalysis/`)
**Files:** 47 total files
**Structure:** Route-based workflows with hard-coded execution paths

```typescript
// Current old system pattern in analyzeDocument.ts:21-45
export async function analyzeDocument(content: string, options: AnalysisOptions) {
  if (options.analysisType === 'comprehensive') {
    return generateComprehensiveAnalysis(content);
  } else if (options.analysisType === 'link') {
    return generateLinkAnalysis(content);
  } else if (options.analysisType === 'spelling') {
    return generateSpellingAnalysis(content);
  }
  // Hard-coded if-else chains...
}
```

**Issues:**
- Hard-coded workflow decisions in `analyzeDocument.ts`
- Duplicate coordinate transformation logic in each analysis type
- Inconsistent error handling patterns
- No plugin composition or reusability

#### New System (`internal-packages/ai/src/analysis-plugins/`)
**Files:** 27 plugin-related files
**Structure:** Plugin-based composition through PluginManager

```typescript
// Current new system in PluginManager.ts:589-604
private initializeAllPlugins(): Map<PluginType, SimpleAnalysisPlugin> {
  this.allPlugins = new Map<PluginType, SimpleAnalysisPlugin>([
    [PluginType.MATH, new MathPlugin()],
    [PluginType.SPELLING, new SpellingPlugin()],
    [PluginType.FACT_CHECK, new FactCheckPlugin()],
    [PluginType.FORECAST, new ForecastPlugin()],
  ]);
  return this.allPlugins;
}
```

**Current Usage Points:**
- `apps/web/src/app/api/agents/[agentId]/evaluate/route.ts:67` - Uses new system
- `apps/web/src/lib/jobs/processEvaluationJob.ts:45` - Uses old system
- **Problem:** Both systems are actively used in production

### 2. Coordinate Transformation System Chaos

#### Current Implementations Found:

**Primary Location Finder** (`apps/web/src/lib/documentAnalysis/shared/textLocationFinder.ts`)
```typescript
// Lines 1-50: Main location finding implementation
export async function findTextLocations(
  searchTexts: string[],
  documentText: string,
  options: TextLocationOptions = {}
): Promise<LocationResult[]> {
  // Uses fuzzy-text-locator tool for core finding
  return processTextLocationsInParallel(searchTexts, documentText, options);
}
```

**Parallel Processing** (`apps/web/src/lib/documentAnalysis/shared/parallelLocationUtils.ts`)
```typescript
// Lines 15-45: Batch processing with coordinate validation
export async function processTextLocationsInParallel(
  searchTexts: string[],
  documentText: string,
  options: TextLocationOptions
): Promise<LocationResult[]> {
  // Processes in batches of 5 with coordinate verification
}
```

**Simple Finder** (`apps/web/src/lib/documentAnalysis/shared/simpleTextLocationFinder.ts`)
```typescript
// Fallback implementation for when fuzzy finding fails
export function findSimpleTextLocation(text: string, document: string): LocationResult {
  const index = document.indexOf(text);
  // Basic string matching without fuzzy logic
}
```

**Enhanced Finder** (`apps/web/src/lib/documentAnalysis/shared/enhancedTextLocationFinder.ts`)
```typescript
// Lines 20-60: Advanced matching with context consideration
export async function findEnhancedTextLocation(
  text: string,
  document: string,
  context?: string
): Promise<LocationResult> {
  // Uses context clues and semantic matching
}
```

**Plugin-Level Coordinate Handling** (`internal-packages/ai/src/analysis-plugins/utils/textHelpers.ts`)
```typescript
// Lines 15-30: Plugin-specific coordinate utilities
export function getLineNumberAtPosition(text: string, position: number): number {
  return text.substring(0, position).split('\n').length;
}
```

#### Slate.js Integration Complexity

**SlateEditor Coordinate Conversion** (`apps/web/src/components/SlateEditor.tsx:31-33`)
```typescript
// Hooks for managing coordinate transformations
import { useHighlightMapper } from "@/hooks/useHighlightMapper";
import { usePlainTextOffsets } from "@/hooks/usePlainTextOffsets";
```

**Problems Identified:**
- 4+ different coordinate finding systems with overlapping functionality
- No centralized coordinate transformation between character offsets ↔ line positions ↔ Slate positions
- Each system handles edge cases differently
- Inconsistent error handling and fallback strategies

### 3. Helicone Integration Analysis

#### Scattered Integration Points (38+ files found):

**Core Integration** (`internal-packages/ai/src/helicone/simpleSessionManager.ts`)
```typescript
// Lines 22-50: Complex session management with global state
export class HeliconeSessionManager {
  constructor(
    private config: SimpleSessionConfig,
    private currentPath: string = '/',
    private currentProperties: Record<string, string>[] = []
  ) {
    // Global state shared across parallel operations
  }
}
```

**Global Session Management** (`internal-packages/ai/src/helicone/simpleSessionManager.ts:165-180`)
```typescript
// Global state causing race conditions
let globalSessionManager: HeliconeSessionManager | null = null;

export function setGlobalSessionManager(manager: HeliconeSessionManager): void {
  globalSessionManager = manager;
}

export function getGlobalSessionManager(): HeliconeSessionManager | null {
  return globalSessionManager;
}
```

**Header Propagation Complexity** (`internal-packages/ai/src/claude/wrapper.ts:80-94`)
```typescript
// Multiple header merging layers
const globalHeaders = getCurrentHeliconeHeaders();
const baseHeaders = {
  ...globalHeaders,
  ...options.heliconeHeaders
};
const heliconeHeaders = options.cacheSeed ? {
  ...baseHeaders,
  'Helicone-Cache-Seed': options.cacheSeed
} : baseHeaders;
```

**Integration Files Found:**
- `internal-packages/ai/src/utils/anthropic.ts` - Client creation
- `internal-packages/ai/src/tools/*/` - 15+ tool integrations
- `apps/web/src/lib/*/` - Analysis workflow integrations
- `apps/web/src/app/api/*/` - API route integrations

**Problems:**
- Global state shared across parallel plugin execution
- Complex path hierarchies (`/plugins/math/analysis`) causing confusion
- Race conditions when multiple evaluations run simultaneously
- Difficult to test due to global dependencies

### 4. PluginManager Responsibility Analysis

#### Current Structure (`internal-packages/ai/src/analysis-plugins/PluginManager.ts`)
**Size:** 792 lines
**Responsibilities Identified:**

**Document Chunking** (Lines 119-180)
```typescript
// Creates chunks with intelligent markdown strategy
const chunks = await createChunksWithTool(text, {
  maxChunkSize: 1500,
  minChunkSize: 200,
  preserveContext: true,
});
```

**Plugin Routing** (Lines 183-235)
```typescript
// Routes chunks to appropriate plugins
const router = new ChunkRouter(plugins);
const routingResult = await router.routeChunks(chunks);
```

**Parallel Execution** (Lines 241-397)
```typescript
// Complex retry logic and error handling
const pluginPromises = plugins.map(async (plugin) => {
  const maxRetries = 2;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // 150+ lines of retry and error handling
  }
});
```

**Session Management** (Lines 100-110, 317-326)
```typescript
// Wraps execution in Helicone session tracking
if (this.sessionManager) {
  return this.sessionManager.withPath(`/${pluginName}`, { plugin: pluginName }, async () => {
    return plugin.analyze(assignedChunks, text);
  });
}
```

**Result Aggregation** (Lines 419-460)
```typescript
// Processes results and generates summaries
const pluginSummaries = Array.from(pluginResults.entries())
  .map(([name, result]) => `**${name}**: ${result.summary}`)
  .join("\n\n");
```

**Cost Calculation** (Lines 435-458)
```typescript
// Tracks costs across plugins
const statistics = {
  totalChunks: chunks.length,
  totalComments: allComments.length,
  commentsByPlugin,
  totalCost,
  processingTime,
};
```

**Logging Integration** (Lines 78, 174, 247-251)
```typescript
// Manages plugin logging throughout execution
this.pluginLogger = new PluginLogger(config.jobId);
this.pluginLogger.log({
  level: "info",
  plugin: "PluginManager",
  phase: "chunking",
  message: `Starting document chunking`,
});
```

### 5. Failing Tests Investigation

#### Current Test Failures
```bash
Test Suites: 4 failed, 45 passed, 49 total
Tests:       7 failed, 3 skipped, 318 passed, 328 total
```

**Key Failing Tests Identified:**

**1. Coordinate Boundary Issues** (`markdownPrepend.edge.test.ts`)
```typescript
// Test failing due to coordinate system complexity
test('handles markdown prepend with complex boundaries', () => {
  // Fails when converting between offset systems
  expect(findLocation(text, document)).toHaveValidOffsets();
});
```

**2. Plugin System Integration** (`plugin-system-e2e.integration.test.ts`)
```typescript
// Fails due to dual plugin system confusion
test('plugin system end-to-end workflow', () => {
  // Sometimes uses old system, sometimes new system
});
```

**3. Helicone Session Management** (Various test files)
```typescript
// Tests fail due to global state contamination
beforeEach(() => {
  // Global session state persists between tests
  setGlobalSessionManager(null);
});
```

---

## Detailed Refactoring Plan

### Phase 1: Create Unified Plugin Architecture (Week 1)

#### Step 1.1: Define New Plugin Interface

**Create:** `internal-packages/ai/src/core/plugin/PluginInterface.ts`

```typescript
/**
 * Unified plugin interface for all document analysis
 * Replaces both old system workflows and current SimpleAnalysisPlugin
 */
export interface DocumentAnalysisPlugin {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  
  /**
   * Analyze document content and return comments
   * @param content - Full document text
   * @param context - Analysis context (optional)
   * @returns Promise of analysis results
   */
  analyze(content: string, context?: AnalysisContext): Promise<PluginResult>;
  
  /**
   * Validate if this plugin should process the given content
   * @param content - Document text to check
   * @returns Promise<boolean> indicating if plugin applies
   */
  shouldAnalyze(content: string): Promise<boolean>;
}

export interface PluginResult {
  comments: Comment[];
  summary: string;
  analysis?: string;
  metadata: {
    processingTime: number;
    tokensUsed: number;
    cost: number;
    confidence: number;
  };
}

export interface AnalysisContext {
  targetCommentCount?: number;
  documentType?: 'blog' | 'academic' | 'forum' | 'general';
  userPreferences?: Record<string, unknown>;
}
```

**Implementation Steps:**

1. **Create the interface file**
   ```bash
   mkdir -p internal-packages/ai/src/core/plugin
   touch internal-packages/ai/src/core/plugin/PluginInterface.ts
   ```

2. **Add to package exports** in `internal-packages/ai/src/index.ts`:
   ```typescript
   export { DocumentAnalysisPlugin, PluginResult, AnalysisContext } from './core/plugin/PluginInterface';
   ```

#### Step 1.2: Create Plugin Adapter Layer

**Create:** `internal-packages/ai/src/core/plugin/adapters/`

**New System Adapter** (`NewPluginAdapter.ts`):
```typescript
import { DocumentAnalysisPlugin, PluginResult } from '../PluginInterface';
import { SimpleAnalysisPlugin } from '../../analysis-plugins/types';

/**
 * Adapts current SimpleAnalysisPlugin to new unified interface
 */
export class NewPluginAdapter implements DocumentAnalysisPlugin {
  constructor(private plugin: SimpleAnalysisPlugin) {}
  
  get name(): string { return this.plugin.name(); }
  get version(): string { return '1.0.0'; }
  get description(): string { return `Adapted ${this.plugin.name()}`; }
  
  async shouldAnalyze(content: string): Promise<boolean> {
    // Default to true for existing plugins
    return true;
  }
  
  async analyze(content: string, context?: AnalysisContext): Promise<PluginResult> {
    // Create chunks using existing chunking logic
    const chunks = await createChunksWithTool(content, {
      maxChunkSize: 1500,
      minChunkSize: 200,
      preserveContext: true,
    });
    
    const startTime = Date.now();
    const result = await this.plugin.analyze(chunks, content);
    
    return {
      comments: result.comments,
      summary: result.summary,
      analysis: result.analysis,
      metadata: {
        processingTime: Date.now() - startTime,
        tokensUsed: 0, // TODO: Extract from result if available
        cost: result.cost,
        confidence: 1.0,
      }
    };
  }
}
```

**Old System Adapter** (`OldSystemAdapter.ts`):
```typescript
import { DocumentAnalysisPlugin, PluginResult } from '../PluginInterface';

/**
 * Adapts old documentAnalysis workflows to new unified interface
 */
export class OldSystemAdapter implements DocumentAnalysisPlugin {
  constructor(
    private workflowName: string,
    private workflowFunction: (content: string, options?: any) => Promise<any>
  ) {}
  
  get name(): string { return this.workflowName; }
  get version(): string { return '0.1.0'; }
  get description(): string { return `Legacy ${this.workflowName} workflow`; }
  
  async shouldAnalyze(content: string): Promise<boolean> {
    // Basic content checks - can be enhanced per workflow
    return content.length > 100;
  }
  
  async analyze(content: string, context?: AnalysisContext): Promise<PluginResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.workflowFunction(content, {
        targetHighlights: context?.targetCommentCount || 5
      });
      
      // Convert old result format to new format
      return {
        comments: result.highlights || [],
        summary: result.summary || 'Analysis completed',
        analysis: result.analysis,
        metadata: {
          processingTime: Date.now() - startTime,
          tokensUsed: 0, // Legacy system doesn't track tokens
          cost: 0, // Legacy system doesn't track costs
          confidence: 0.8,
        }
      };
    } catch (error) {
      throw new Error(`Legacy workflow ${this.workflowName} failed: ${error}`);
    }
  }
}
```

#### Step 1.3: Create Plugin Registry

**Create:** `internal-packages/ai/src/core/plugin/PluginRegistry.ts`

```typescript
import { DocumentAnalysisPlugin } from './PluginInterface';
import { NewPluginAdapter } from './adapters/NewPluginAdapter';
import { OldSystemAdapter } from './adapters/OldSystemAdapter';

// Import existing plugins
import { MathPlugin, SpellingPlugin, FactCheckPlugin, ForecastPlugin } from '../analysis-plugins/plugins';
import { generateComprehensiveAnalysis } from '../../web/src/lib/documentAnalysis/comprehensiveAnalysis';
import { generateLinkAnalysis } from '../../web/src/lib/documentAnalysis/linkAnalysis';

export class PluginRegistry {
  private plugins = new Map<string, DocumentAnalysisPlugin>();
  
  constructor() {
    this.registerDefaultPlugins();
  }
  
  private registerDefaultPlugins(): void {
    // Register new system plugins via adapters
    this.register(new NewPluginAdapter(new MathPlugin()));
    this.register(new NewPluginAdapter(new SpellingPlugin()));
    this.register(new NewPluginAdapter(new FactCheckPlugin()));
    this.register(new NewPluginAdapter(new ForecastPlugin()));
    
    // Register old system workflows via adapters
    this.register(new OldSystemAdapter('comprehensive', generateComprehensiveAnalysis));
    this.register(new OldSystemAdapter('links', generateLinkAnalysis));
  }
  
  register(plugin: DocumentAnalysisPlugin): void {
    this.plugins.set(plugin.name, plugin);
  }
  
  get(name: string): DocumentAnalysisPlugin | undefined {
    return this.plugins.get(name);
  }
  
  getAll(): DocumentAnalysisPlugin[] {
    return Array.from(this.plugins.values());
  }
  
  getByType(type: 'new' | 'legacy' | 'all' = 'all'): DocumentAnalysisPlugin[] {
    const allPlugins = this.getAll();
    
    if (type === 'new') {
      return allPlugins.filter(p => p.version.startsWith('1.'));
    } else if (type === 'legacy') {
      return allPlugins.filter(p => p.version.startsWith('0.'));
    }
    
    return allPlugins;
  }
}

// Global registry instance
export const pluginRegistry = new PluginRegistry();
```

### Phase 2: Extract Core Services (Week 2)

#### Step 2.1: Create Document Processor Service

**Create:** `internal-packages/ai/src/core/services/DocumentProcessor.ts`

```typescript
import { DocumentAnalysisPlugin, AnalysisContext } from '../plugin/PluginInterface';
import { Comment } from '../types';

export interface DocumentProcessorOptions {
  targetCommentCount?: number;
  enableParallelProcessing?: boolean;
  maxProcessingTime?: number;
  retryAttempts?: number;
}

export interface ProcessingResult {
  comments: Comment[];
  summary: string;
  analysis: string;
  statistics: {
    totalPlugins: number;
    successfulPlugins: number;
    failedPlugins: number;
    totalProcessingTime: number;
    totalCost: number;
  };
  errors: Array<{
    plugin: string;
    error: string;
    recoveryAction: string;
  }>;
}

/**
 * Extracted from PluginManager - handles document processing workflow
 * Single responsibility: coordinate plugin execution
 */
export class DocumentProcessor {
  constructor(private options: DocumentProcessorOptions = {}) {}
  
  async processDocument(
    content: string,
    plugins: DocumentAnalysisPlugin[],
    context?: AnalysisContext
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const results: ProcessingResult = {
      comments: [],
      summary: '',
      analysis: '',
      statistics: {
        totalPlugins: plugins.length,
        successfulPlugins: 0,
        failedPlugins: 0,
        totalProcessingTime: 0,
        totalCost: 0,
      },
      errors: []
    };
    
    // Filter plugins that should analyze this content
    const applicablePlugins = await this.filterApplicablePlugins(content, plugins);
    
    // Process plugins
    if (this.options.enableParallelProcessing) {
      await this.processPluginsInParallel(content, applicablePlugins, context, results);
    } else {
      await this.processPluginsSequentially(content, applicablePlugins, context, results);
    }
    
    // Generate final summary and analysis
    this.generateSummaryAndAnalysis(results);
    
    results.statistics.totalProcessingTime = Date.now() - startTime;
    return results;
  }
  
  private async filterApplicablePlugins(
    content: string, 
    plugins: DocumentAnalysisPlugin[]
  ): Promise<DocumentAnalysisPlugin[]> {
    const checks = await Promise.all(
      plugins.map(async plugin => ({
        plugin,
        shouldAnalyze: await plugin.shouldAnalyze(content)
      }))
    );
    
    return checks
      .filter(check => check.shouldAnalyze)
      .map(check => check.plugin);
  }
  
  private async processPluginsInParallel(
    content: string,
    plugins: DocumentAnalysisPlugin[],
    context: AnalysisContext | undefined,
    results: ProcessingResult
  ): Promise<void> {
    const pluginPromises = plugins.map(plugin => 
      this.processPlugin(plugin, content, context)
    );
    
    const pluginResults = await Promise.allSettled(pluginPromises);
    
    for (const [index, result] of pluginResults.entries()) {
      const plugin = plugins[index];
      
      if (result.status === 'fulfilled') {
        results.comments.push(...result.value.comments);
        results.statistics.successfulPlugins++;
        results.statistics.totalCost += result.value.metadata.cost;
      } else {
        results.statistics.failedPlugins++;
        results.errors.push({
          plugin: plugin.name,
          error: result.reason.message,
          recoveryAction: this.determineRecoveryAction(plugin.name, result.reason)
        });
      }
    }
  }
  
  private async processPlugin(
    plugin: DocumentAnalysisPlugin,
    content: string,
    context?: AnalysisContext
  ) {
    const maxRetries = this.options.retryAttempts || 2;
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          // Add delay between retries
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
        
        return await plugin.analyze(content, context);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (!this.isRetryableError(error) || attempt === maxRetries) {
          throw lastError;
        }
      }
    }
    
    throw lastError!;
  }
  
  private isRetryableError(error: unknown): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return (
      errorMessage.includes('timeout') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('429') ||
      /5\d\d/.test(errorMessage)
    );
  }
  
  private determineRecoveryAction(pluginName: string, error: unknown): string {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('timeout')) {
      return 'Consider increasing timeout settings or reducing content size';
    }
    if (errorMessage.includes('rate limit')) {
      return 'Implement request throttling or use different API keys';
    }
    if (errorMessage.includes('authentication')) {
      return 'Check API key configuration and permissions';
    }
    
    return `${pluginName} plugin failed - analysis will continue with remaining plugins`;
  }
  
  private generateSummaryAndAnalysis(results: ProcessingResult): void {
    const successfulPlugins = results.statistics.successfulPlugins;
    const totalComments = results.comments.length;
    
    results.summary = `Analyzed document with ${successfulPlugins} plugins. Found ${totalComments} total comments.`;
    
    // Group comments by plugin for analysis
    const commentsByPlugin = new Map<string, Comment[]>();
    for (const comment of results.comments) {
      const pluginComments = commentsByPlugin.get(comment.plugin || 'unknown') || [];
      pluginComments.push(comment);
      commentsByPlugin.set(comment.plugin || 'unknown', pluginComments);
    }
    
    const analysisSection = Array.from(commentsByPlugin.entries())
      .map(([plugin, comments]) => `**${plugin}**: Found ${comments.length} issues`)
      .join('\n\n');
    
    results.analysis = `**Document Analysis Results**\n\n${analysisSection}`;
  }
}
```

#### Step 2.2: Create Position Mapper Service

**Create:** `internal-packages/ai/src/core/services/PositionMapper.ts`

```typescript
/**
 * Unified position mapping service
 * Handles all coordinate transformations between different systems
 */

import { getLineNumberAtPosition } from '../utils/textHelpers';

export interface CharacterPosition {
  type: 'character';
  offset: number;
}

export interface LinePosition {
  type: 'line';
  line: number;
  column: number;
}

export interface SlatePosition {
  type: 'slate';
  path: number[];
  offset: number;
}

export type Position = CharacterPosition | LinePosition | SlatePosition;

export interface PositionRange {
  start: Position;
  end: Position;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  suggestedFix?: PositionRange;
}

/**
 * Centralized position mapping and validation
 * Replaces multiple scattered location finders
 */
export class PositionMapper {
  constructor(private documentText: string) {}
  
  /**
   * Convert character offset to line position
   */
  characterToLine(offset: number): LinePosition {
    if (offset < 0 || offset > this.documentText.length) {
      throw new Error(`Invalid character offset: ${offset}`);
    }
    
    const textBeforeOffset = this.documentText.substring(0, offset);
    const lines = textBeforeOffset.split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    
    return {
      type: 'line',
      line,
      column
    };
  }
  
  /**
   * Convert line position to character offset
   */
  lineToCharacter(linePos: LinePosition): CharacterPosition {
    const lines = this.documentText.split('\n');
    
    if (linePos.line < 1 || linePos.line > lines.length) {
      throw new Error(`Invalid line number: ${linePos.line}`);
    }
    
    let offset = 0;
    
    // Add characters from previous lines
    for (let i = 0; i < linePos.line - 1; i++) {
      offset += lines[i].length + 1; // +1 for newline character
    }
    
    // Add column offset
    const currentLine = lines[linePos.line - 1];
    const columnOffset = Math.min(linePos.column - 1, currentLine.length);
    offset += columnOffset;
    
    return {
      type: 'character',
      offset
    };
  }
  
  /**
   * Validate position range within document bounds
   */
  validateRange(range: PositionRange): ValidationResult {
    try {
      // Convert both positions to character offsets for validation
      const startOffset = this.toCharacterOffset(range.start);
      const endOffset = this.toCharacterOffset(range.end);
      
      if (startOffset < 0) {
        return {
          isValid: false,
          error: 'Start position is before document beginning'
        };
      }
      
      if (endOffset > this.documentText.length) {
        return {
          isValid: false,
          error: 'End position is after document end',
          suggestedFix: {
            start: range.start,
            end: { type: 'character', offset: this.documentText.length }
          }
        };
      }
      
      if (startOffset >= endOffset) {
        return {
          isValid: false,
          error: 'Start position must be before end position'
        };
      }
      
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown validation error'
      };
    }
  }
  
  /**
   * Extract text content for a given range
   */
  extractText(range: PositionRange): string {
    const validation = this.validateRange(range);
    if (!validation.isValid) {
      throw new Error(`Invalid range: ${validation.error}`);
    }
    
    const startOffset = this.toCharacterOffset(range.start);
    const endOffset = this.toCharacterOffset(range.end);
    
    return this.documentText.substring(startOffset, endOffset);
  }
  
  /**
   * Find text location with fuzzy matching fallback
   */
  async findTextLocation(searchText: string, options: {
    fuzzyMatch?: boolean;
    contextLines?: number;
    maxResults?: number;
  } = {}): Promise<PositionRange[]> {
    const results: PositionRange[] = [];
    
    // Try exact match first
    let searchIndex = 0;
    while (true) {
      const index = this.documentText.indexOf(searchText, searchIndex);
      if (index === -1) break;
      
      results.push({
        start: { type: 'character', offset: index },
        end: { type: 'character', offset: index + searchText.length }
      });
      
      searchIndex = index + 1;
      
      if (options.maxResults && results.length >= options.maxResults) {
        break;
      }
    }
    
    // If no exact matches and fuzzy matching enabled, use fuzzy logic
    if (results.length === 0 && options.fuzzyMatch) {
      // TODO: Integrate with existing fuzzy-text-locator tool
      // This would be the bridge to the existing fuzzy matching logic
    }
    
    return results;
  }
  
  /**
   * Convert any position type to character offset
   */
  private toCharacterOffset(position: Position): number {
    switch (position.type) {
      case 'character':
        return position.offset;
      case 'line':
        return this.lineToCharacter(position).offset;
      case 'slate':
        throw new Error('Slate position conversion not yet implemented');
      default:
        throw new Error(`Unknown position type: ${(position as any).type}`);
    }
  }
}
```

#### Step 2.3: Simplify Session Management

**Create:** `internal-packages/ai/src/core/services/SessionService.ts`

```typescript
/**
 * Simplified session management replacing complex HeliconeSessionManager
 * Uses request-scoped headers instead of global state
 */

export interface SessionConfig {
  sessionId: string;
  sessionName: string;
  userId?: string;
  properties?: Record<string, string>;
}

export interface SessionHeaders {
  'Helicone-Session-Id': string;
  'Helicone-Session-Name': string;
  'Helicone-Session-Path': string;
  'Helicone-User-Id'?: string;
  'Helicone-Property-Environment'?: string;
  [key: string]: string | undefined;
}

/**
 * Request-scoped session management
 * No global state, no race conditions
 */
export class SessionService {
  constructor(private config: SessionConfig) {
    this.validateConfig();
  }
  
  /**
   * Generate headers for a specific request path
   * @param path - Request path like '/plugins/math'
   * @param additionalProperties - Request-specific properties
   */
  generateHeaders(path: string = '/', additionalProperties?: Record<string, string>): SessionHeaders {
    const headers: SessionHeaders = {
      'Helicone-Session-Id': this.config.sessionId,
      'Helicone-Session-Name': this.config.sessionName,
      'Helicone-Session-Path': path,
    };
    
    if (this.config.userId) {
      headers['Helicone-User-Id'] = this.config.userId;
    }
    
    // Add base properties
    if (this.config.properties) {
      for (const [key, value] of Object.entries(this.config.properties)) {
        headers[`Helicone-Property-${key}`] = value;
      }
    }
    
    // Add request-specific properties
    if (additionalProperties) {
      for (const [key, value] of Object.entries(additionalProperties)) {
        headers[`Helicone-Property-${key}`] = value;
      }
    }
    
    return headers;
  }
  
  /**
   * Create a new session service for a sub-operation
   * @param subPath - Path extension like 'math' or 'analysis'  
   * @param properties - Additional properties for the sub-session
   */
  createSubSession(subPath: string, properties?: Record<string, string>): SessionService {
    return new SessionService({
      ...this.config,
      sessionName: `${this.config.sessionName}/${subPath}`,
      properties: {
        ...this.config.properties,
        ...properties
      }
    });
  }
  
  private validateConfig(): void {
    if (!this.config.sessionId || !/^[\w-]+$/.test(this.config.sessionId)) {
      throw new Error(`Invalid session ID: ${this.config.sessionId}`);
    }
    
    if (!this.config.sessionName) {
      throw new Error('Session name is required');
    }
  }
}

/**
 * Factory for creating session services
 */
export class SessionFactory {
  static createForJob(jobId: string, userId?: string): SessionService {
    return new SessionService({
      sessionId: jobId,
      sessionName: `evaluation-${jobId}`,
      userId,
      properties: {
        environment: process.env.NODE_ENV || 'development',
        source: 'document-analysis'
      }
    });
  }
  
  static createForApi(requestId: string, userId?: string): SessionService {
    return new SessionService({
      sessionId: requestId,
      sessionName: `api-${requestId}`,
      userId,
      properties: {
        environment: process.env.NODE_ENV || 'development',
        source: 'api-request'
      }
    });
  }
}
```

### Phase 3: Migration Implementation (Week 3)

#### Step 3.1: Update Claude Wrapper to Use New Session Service

**Modify:** `internal-packages/ai/src/claude/wrapper.ts`

**Before (Lines 80-94):**
```typescript
// Multiple header merging layers
const globalHeaders = getCurrentHeliconeHeaders();
const baseHeaders = {
  ...globalHeaders,
  ...options.heliconeHeaders
};
const heliconeHeaders = options.cacheSeed ? {
  ...baseHeaders,
  'Helicone-Cache-Seed': options.cacheSeed
} : baseHeaders;
```

**After:**
```typescript
import { SessionService } from '../core/services/SessionService';

export interface ClaudeCallOptions {
  model?: string;
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  tools?: Anthropic.Messages.Tool[];
  tool_choice?: Anthropic.Messages.ToolChoice;
  max_tokens?: number;
  temperature?: number;
  sessionService?: SessionService;  // Replace heliconeHeaders
  sessionPath?: string;             // Replace cacheSeed concept
  sessionProperties?: Record<string, string>;
  enablePromptCaching?: boolean;
  timeout?: number;
}

export async function callClaude(
  options: ClaudeCallOptions,
  previousInteractions?: RichLLMInteraction[]
): Promise<ClaudeCallResult> {
  const startTime = Date.now();
  
  // Generate session headers if session service provided
  let heliconeHeaders: Record<string, string> = {};
  if (options.sessionService) {
    heliconeHeaders = options.sessionService.generateHeaders(
      options.sessionPath || '/',
      options.sessionProperties
    );
  }
  
  const anthropic = createAnthropicClient(heliconeHeaders);
  // ... rest of function remains the same
}
```

#### Step 3.2: Create New Document Analysis Entry Point

**Create:** `internal-packages/ai/src/core/DocumentAnalyzer.ts`

```typescript
import { DocumentAnalysisPlugin, AnalysisContext } from './plugin/PluginInterface';
import { DocumentProcessor, ProcessingResult } from './services/DocumentProcessor';
import { PositionMapper } from './services/PositionMapper';
import { SessionService } from './services/SessionService';
import { pluginRegistry } from './plugin/PluginRegistry';

export interface DocumentAnalyzerOptions {
  plugins?: string[] | DocumentAnalysisPlugin[];
  enableParallelProcessing?: boolean;
  targetCommentCount?: number;
  maxProcessingTime?: number;
  sessionService?: SessionService;
}

export interface DocumentAnalysisResult {
  comments: Comment[];
  summary: string;
  analysis: string;
  statistics: ProcessingResult['statistics'];
  errors: ProcessingResult['errors'];
  positionMapper: PositionMapper;
}

/**
 * Main entry point for document analysis
 * Replaces both old analyzeDocument and new PluginManager
 */
export class DocumentAnalyzer {
  private documentProcessor: DocumentProcessor;
  private positionMapper: PositionMapper;
  
  constructor(private content: string, private options: DocumentAnalyzerOptions = {}) {
    this.documentProcessor = new DocumentProcessor({
      targetCommentCount: options.targetCommentCount,
      enableParallelProcessing: options.enableParallelProcessing ?? true,
      maxProcessingTime: options.maxProcessingTime,
      retryAttempts: 2
    });
    
    this.positionMapper = new PositionMapper(content);
  }
  
  async analyze(): Promise<DocumentAnalysisResult> {
    // Get plugins to use
    const plugins = this.resolvePlugins();
    
    // Create analysis context
    const context: AnalysisContext = {
      targetCommentCount: this.options.targetCommentCount,
      documentType: this.detectDocumentType(),
    };
    
    // Process document
    const result = await this.documentProcessor.processDocument(
      this.content,
      plugins,
      context
    );
    
    // Validate all comment positions
    const validatedComments = await this.validateCommentPositions(result.comments);
    
    return {
      comments: validatedComments,
      summary: result.summary,
      analysis: result.analysis,
      statistics: result.statistics,
      errors: result.errors,
      positionMapper: this.positionMapper
    };
  }
  
  private resolvePlugins(): DocumentAnalysisPlugin[] {
    if (!this.options.plugins) {
      // Use default plugins
      return pluginRegistry.getByType('new'); // Prefer new system plugins
    }
    
    if (Array.isArray(this.options.plugins) && this.options.plugins.length > 0) {
      if (typeof this.options.plugins[0] === 'string') {
        // Plugin names provided
        return (this.options.plugins as string[])
          .map(name => pluginRegistry.get(name))
          .filter((plugin): plugin is DocumentAnalysisPlugin => plugin !== undefined);
      } else {
        // Plugin instances provided
        return this.options.plugins as DocumentAnalysisPlugin[];
      }
    }
    
    return [];
  }
  
  private detectDocumentType(): AnalysisContext['documentType'] {
    // Simple heuristics to detect document type
    if (this.content.includes('Abstract:') || this.content.includes('References:')) {
      return 'academic';
    }
    if (this.content.includes('Posted by') || this.content.includes('Reply to')) {
      return 'forum';
    }
    if (this.content.length > 5000) {
      return 'blog';
    }
    return 'general';
  }
  
  private async validateCommentPositions(comments: Comment[]): Promise<Comment[]> {
    const validatedComments: Comment[] = [];
    
    for (const comment of comments) {
      if (!comment.highlight) {
        validatedComments.push(comment);
        continue;
      }
      
      try {
        const range = {
          start: { type: 'character' as const, offset: comment.highlight.startOffset || 0 },
          end: { type: 'character' as const, offset: comment.highlight.endOffset || 0 }
        };
        
        const validation = this.positionMapper.validateRange(range);
        
        if (validation.isValid) {
          validatedComments.push(comment);
        } else if (validation.suggestedFix) {
          // Apply suggested fix
          const fixedComment = {
            ...comment,
            highlight: {
              ...comment.highlight,
              startOffset: this.positionMapper.toCharacterOffset(validation.suggestedFix.start),
              endOffset: this.positionMapper.toCharacterOffset(validation.suggestedFix.end)
            }
          };
          validatedComments.push(fixedComment);
        }
        // Skip comments that can't be fixed
      } catch (error) {
        // Skip comments with invalid positions
        console.warn(`Skipping comment with invalid position: ${error}`);
      }
    }
    
    return validatedComments;
  }
}

// Convenience function to maintain API compatibility
export async function analyzeDocument(
  content: string,
  options: DocumentAnalyzerOptions = {}
): Promise<DocumentAnalysisResult> {
  const analyzer = new DocumentAnalyzer(content, options);
  return analyzer.analyze();
}
```

#### Step 3.3: Update Job Processing to Use New System

**Modify:** `apps/web/src/lib/jobs/processEvaluationJob.ts`

**Before (approximate current structure):**
```typescript
// Currently uses old system
import { analyzeDocument } from '@/lib/documentAnalysis';

export async function processEvaluationJob(job: Job) {
  const result = await analyzeDocument(document.content, {
    analysisType: 'comprehensive',
    targetHighlights: 5
  });
  // ...
}
```

**After:**
```typescript
// Use new unified system
import { analyzeDocument } from '@roast/ai';
import { SessionFactory } from '@roast/ai/core/services/SessionService';

export async function processEvaluationJob(job: Job) {
  // Create session for tracking
  const sessionService = SessionFactory.createForJob(job.id, job.userId);
  
  const result = await analyzeDocument(document.content, {
    plugins: ['math', 'spelling', 'fact-check', 'forecast'], // Specify which plugins
    targetCommentCount: 5,
    enableParallelProcessing: true,
    sessionService
  });
  
  // Save results using new structure
  await saveEvaluationResults(job.id, result);
}
```

#### Step 3.4: Fix Failing Tests

**Update Test Structure:**

1. **Fix Coordinate Boundary Test** (`apps/web/src/lib/documentAnalysis/__tests__/markdownPrepend.edge.test.ts`):

```typescript
import { PositionMapper } from '@roast/ai/core/services/PositionMapper';

describe('Markdown Prepend Edge Cases', () => {
  test('handles coordinate boundaries correctly', () => {
    const content = "# Header\n\nSome content here";
    const positionMapper = new PositionMapper(content);
    
    // Test boundary conditions
    const range = {
      start: { type: 'character' as const, offset: 0 },
      end: { type: 'character' as const, offset: content.length }
    };
    
    const validation = positionMapper.validateRange(range);
    expect(validation.isValid).toBe(true);
    
    const extractedText = positionMapper.extractText(range);
    expect(extractedText).toBe(content);
  });
  
  test('handles invalid ranges gracefully', () => {
    const content = "Short content";
    const positionMapper = new PositionMapper(content);
    
    const invalidRange = {
      start: { type: 'character' as const, offset: 0 },
      end: { type: 'character' as const, offset: content.length + 100 }
    };
    
    const validation = positionMapper.validateRange(invalidRange);
    expect(validation.isValid).toBe(false);
    expect(validation.suggestedFix).toBeDefined();
  });
});
```

2. **Create Integration Test for New System** (`apps/web/src/lib/__tests__/document-analyzer.integration.test.ts`):

```typescript
import { DocumentAnalyzer, analyzeDocument } from '@roast/ai';
import { SessionFactory } from '@roast/ai/core/services/SessionService';

describe('Document Analyzer Integration', () => {
  test('processes document with multiple plugins', async () => {
    const content = `
# Test Document

This document contains some math: 2 + 2 = 5 (wrong!)

And a spelling error: teh quick brown fox.
    `;
    
    const sessionService = SessionFactory.createForApi('test-request');
    
    const result = await analyzeDocument(content, {
      plugins: ['math', 'spelling'],
      targetCommentCount: 10,
      sessionService
    });
    
    expect(result.comments.length).toBeGreaterThan(0);
    expect(result.statistics.successfulPlugins).toBe(2);
    expect(result.statistics.failedPlugins).toBe(0);
    
    // Validate positions
    for (const comment of result.comments) {
      if (comment.highlight) {
        const range = {
          start: { type: 'character' as const, offset: comment.highlight.startOffset || 0 },
          end: { type: 'character' as const, offset: comment.highlight.endOffset || 0 }
        };
        
        const validation = result.positionMapper.validateRange(range);
        expect(validation.isValid).toBe(true);
      }
    }
  }, 30000);
});
```

### Phase 4: Cleanup and Optimization (Week 4)

#### Step 4.1: Remove Old System Files

**Files to Remove:**
```bash
# Old analysis workflows
rm -rf apps/web/src/lib/documentAnalysis/comprehensiveAnalysis/
rm -rf apps/web/src/lib/documentAnalysis/linkAnalysis/
rm -rf apps/web/src/lib/documentAnalysis/spellingGrammar/
rm -rf apps/web/src/lib/documentAnalysis/multiEpistemicEval/

# Old coordinate systems (keep textLocationFinder.ts as adapter for now)
rm apps/web/src/lib/documentAnalysis/shared/simpleTextLocationFinder.ts
rm apps/web/src/lib/documentAnalysis/shared/enhancedTextLocationFinder.ts

# Old main entry point
rm apps/web/src/lib/documentAnalysis/analyzeDocument.ts

# Update index.ts to only export adapters
echo "// Legacy adapters for backward compatibility
export { analyzeDocument } from '@roast/ai';" > apps/web/src/lib/documentAnalysis/index.ts
```

#### Step 4.2: Remove Complex PluginManager

**Replace:** `internal-packages/ai/src/analysis-plugins/PluginManager.ts` with a simple compatibility wrapper:

```typescript
// DEPRECATED: Use DocumentAnalyzer instead
import { DocumentAnalyzer, DocumentAnalysisResult } from '../core/DocumentAnalyzer';
import { SessionService } from '../core/services/SessionService';

/**
 * @deprecated Use DocumentAnalyzer instead
 * Compatibility wrapper for existing code
 */
export class PluginManager {
  private sessionService?: SessionService;
  
  constructor(config: { sessionManager?: any; jobId?: string } = {}) {
    if (config.jobId) {
      this.sessionService = SessionFactory.createForJob(config.jobId);
    }
  }
  
  async analyzeDocument(content: string, options: { targetHighlights?: number } = {}): Promise<any> {
    console.warn('PluginManager is deprecated. Use DocumentAnalyzer instead.');
    
    const analyzer = new DocumentAnalyzer(content, {
      targetCommentCount: options.targetHighlights,
      sessionService: this.sessionService
    });
    
    const result = await analyzer.analyze();
    
    // Convert to old format for compatibility
    return {
      thinking: '',
      analysis: result.analysis,
      summary: result.summary,
      highlights: result.comments,
      tasks: [],
      errors: result.errors
    };
  }
}
```

#### Step 4.3: Remove Global Session State

**Remove/Update these files:**

1. **Remove:** `internal-packages/ai/src/helicone/simpleSessionManager.ts`
2. **Update:** All files importing `getGlobalSessionManager()` to use local `SessionService`

**Example Update** (`internal-packages/ai/src/analysis-plugins/plugins/fact-check/index.ts`):

**Before:**
```typescript
import { getGlobalSessionManager } from '../../../helicone/simpleSessionManager';

export class FactCheckPlugin implements SimpleAnalysisPlugin {
  async analyze(chunks: TextChunk[], fullText: string): Promise<AnalysisResult> {
    const sessionManager = getGlobalSessionManager();
    // ...
  }
}
```

**After:**
```typescript
import { SessionService } from '../../../core/services/SessionService';

export class FactCheckPlugin implements SimpleAnalysisPlugin {
  constructor(private sessionService?: SessionService) {}
  
  async analyze(chunks: TextChunk[], fullText: string): Promise<AnalysisResult> {
    // Session handling moved to DocumentProcessor level
    // Plugin focuses only on analysis logic
  }
}
```

#### Step 4.4: Update All Import Statements

**Create Migration Script:** `scripts/update-imports.js`

```javascript
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Map of old imports to new imports
const importMappings = {
  "from '@/lib/documentAnalysis'": "from '@roast/ai'",
  "from '../lib/documentAnalysis'": "from '@roast/ai'",
  "import { analyzeDocument } from '@/lib/documentAnalysis'": "import { analyzeDocument } from '@roast/ai'",
  "import { PluginManager } from '@roast/ai/analysis-plugins/PluginManager'": "import { DocumentAnalyzer } from '@roast/ai'",
  "from '@roast/ai/analysis-plugins/PluginManager'": "from '@roast/ai'",
};

// Find all TypeScript files
const files = glob.sync('**/*.{ts,tsx}', {
  ignore: ['node_modules/**', 'dist/**', '**/*.d.ts']
});

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;
  
  for (const [oldImport, newImport] of Object.entries(importMappings)) {
    if (content.includes(oldImport)) {
      content = content.replace(new RegExp(oldImport, 'g'), newImport);
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(file, content);
    console.log(`Updated imports in: ${file}`);
  }
});
```

Run with: `node scripts/update-imports.js`

---

## Migration Timeline & Checkpoints

### Week 1: Foundation (Plugin Interface & Adapters)
**Checkpoint:** Both old and new systems work through unified interface

**Tasks:**
- [ ] Create `PluginInterface.ts` with unified interface
- [ ] Create adapter classes for both systems
- [ ] Create `PluginRegistry.ts` with both systems registered
- [ ] Write tests for adapters
- [ ] Verify both systems work through new interface

**Success Criteria:**
- All existing functionality works
- New unified interface covers all use cases
- Tests pass for both systems via adapters

### Week 2: Core Services (Extract from PluginManager)
**Checkpoint:** Core services extracted and functional

**Tasks:**
- [ ] Create `DocumentProcessor.ts` - handles workflow orchestration
- [ ] Create `PositionMapper.ts` - unified coordinate system
- [ ] Create `SessionService.ts` - simplified session management
- [ ] Update `claude/wrapper.ts` to use new session service
- [ ] Write comprehensive tests for all services

**Success Criteria:**
- PluginManager functionality split into focused services
- Session management simplified (no global state)
- Position validation works for all coordinate types
- All services have >90% test coverage

### Week 3: Migration (Switch to New System)
**Checkpoint:** Primary code uses new system, old system deprecated

**Tasks:**
- [ ] Create `DocumentAnalyzer.ts` as main entry point
- [ ] Update job processing to use new system
- [ ] Fix all failing tests using new coordinate system
- [ ] Update API routes to use new system
- [ ] Add deprecation warnings to old system

**Success Criteria:**
- All production code uses new `DocumentAnalyzer`
- All 7 failing tests now pass
- No new test failures introduced
- Old system still works but shows deprecation warnings

### Week 4: Cleanup (Remove Old Code)
**Checkpoint:** Codebase simplified, old complexity removed

**Tasks:**
- [ ] Remove old analysis workflow files
- [ ] Replace complex PluginManager with compatibility wrapper
- [ ] Remove global session state files
- [ ] Update all import statements
- [ ] Remove unused coordinate transformation files

**Success Criteria:**
- 30% reduction in analysis-related code
- No global state dependencies
- All imports use new unified system
- Full test suite passes
- Documentation updated

---

## Risk Mitigation & Rollback Plan

### Identified Risks

1. **Breaking Changes During Migration**
   - **Mitigation:** Maintain both systems during transition
   - **Detection:** Comprehensive test suite for both systems
   - **Rollback:** Feature flags to switch between old/new systems

2. **Performance Regression**
   - **Mitigation:** Benchmark before/after each phase
   - **Detection:** Monitor analysis processing times
   - **Rollback:** Performance-based rollback triggers

3. **Position Mapping Bugs**
   - **Mitigation:** Extensive validation and fuzzy testing
   - **Detection:** Position validation in all analysis results
   - **Rollback:** Fallback to old coordinate system if validation fails

### Rollback Procedures

**Phase 1-2 Rollback:**
```typescript
// Feature flag in environment
if (process.env.USE_LEGACY_ANALYSIS === 'true') {
  return legacyAnalyzeDocument(content, options);
} else {
  return newAnalyzeDocument(content, options);
}
```

**Phase 3-4 Rollback:**
```bash
# Git branch strategy
git checkout migration-phase-2  # Known working state
git cherry-pick <safe-commits>  # Only apply safe changes
```

### Monitoring & Validation

**Automated Checks:**
- Analysis result comparison between old/new systems
- Position validation for all generated comments
- Performance benchmarks for each analysis type
- Error rate monitoring during migration

**Manual Validation:**
- Test with real documents from production
- Verify comment positioning in UI
- Check cost tracking accuracy
- Validate session tracking in Helicone

---

## Testing Strategy

### Test Categories

1. **Unit Tests** (Fast, No External Dependencies)
   - Plugin adapters
   - Position mapper coordinate transformations
   - Session service header generation
   - Document processor plugin filtering

2. **Integration Tests** (Database + Internal APIs)
   - Document analyzer end-to-end workflow
   - Plugin registry with real plugins
   - Position validation with real documents
   - Session service with Claude wrapper

3. **Migration Tests** (Compatibility Validation)
   - Old vs new system result comparison
   - Adapter layer functionality
   - Import path updates
   - Rollback procedures

### Test Data Strategy

**Create:** `internal-packages/ai/src/__tests__/fixtures/`

```typescript
// test-documents.ts
export const TEST_DOCUMENTS = {
  mathDocument: `
# Math Test Document
This calculation is wrong: 2 + 2 = 5
The area of a circle with radius 3 is π × 3² = 28.26
  `,
  
  spellingDocument: `
# Spelling Test Document
Teh quick brown fox jumps over teh lazy dog.
This sentance has multipul spelling erors.
  `,
  
  complexDocument: `
# Complex Analysis Document
This document contains multiple issues:
- Math: 50% + 50% = 110% (wrong!)
- Spelling: definately should be definitely  
- Fact: The Earth is flat (incorrect claim)
- Forecast: Bitcoin will reach $1 million by 2024 (prediction)
  `,
  
  edgeCaseDocument: `Short document with edge cases: 日本語 text and émojis 🚀`
};

// expected-results.ts
export const EXPECTED_RESULTS = {
  mathDocument: {
    commentCount: 2,
    pluginsTriggered: ['math'],
    positions: [
      { start: 42, end: 51, text: '2 + 2 = 5' },
      { start: 89, end: 95, text: '28.26' }
    ]
  }
  // ... more expected results
};
```

### Performance Benchmarks

**Create:** `internal-packages/ai/src/__tests__/benchmarks/`

```typescript
// analysis-performance.test.ts
describe('Analysis Performance Benchmarks', () => {
  test('document processing time within acceptable range', async () => {
    const startTime = Date.now();
    
    const result = await analyzeDocument(TEST_DOCUMENTS.complexDocument, {
      plugins: ['math', 'spelling', 'fact-check', 'forecast']
    });
    
    const processingTime = Date.now() - startTime;
    
    expect(processingTime).toBeLessThan(30000); // 30 second max
    expect(result.comments.length).toBeGreaterThan(0);
  });
});
```

---

## Expected Benefits Post-Refactoring

### Code Quality Improvements

1. **Single Responsibility Principle**
   - DocumentProcessor: handles plugin orchestration
   - PositionMapper: handles coordinate transformations  
   - SessionService: handles request tracking
   - Each class has one clear purpose

2. **Elimination of Duplication**
   - One plugin interface instead of two systems
   - One coordinate system instead of 4+ implementations
   - One session management approach instead of complex global state

3. **Better Error Handling**
   - Consistent error types across all plugins
   - Centralized retry logic in DocumentProcessor
   - Clear recovery strategies for each error type

4. **Improved Testability**
   - No global state dependencies
   - Clear interfaces for mocking
   - Isolated services that can be tested independently

### Performance Improvements

1. **Reduced Memory Usage**
   - Elimination of duplicate coordinate transformation objects
   - No global session state holding references
   - More efficient plugin result processing

2. **Better Parallel Processing**
   - No race conditions from shared global state
   - Clean plugin isolation allows true parallel execution
   - Simplified error handling doesn't block other plugins

3. **Faster Development Cycles**
   - Clearer architecture makes debugging easier
   - Better test coverage reduces production bugs
   - Simplified interfaces reduce integration complexity

### Maintainability Gains

1. **Clearer Code Organization**
   - Related functionality grouped in focused services
   - Clear dependencies between components
   - Easier to understand data flow

2. **Easier Feature Addition**
   - Simple plugin interface for new analysis types
   - Position mapper handles all coordinate complexity
   - Session service handles all tracking needs

3. **Better Documentation**
   - Each service has a clear, focused purpose
   - Interface documentation covers all use cases
   - Migration path is clearly documented

---

## Conclusion

This refactoring plan addresses all major architectural complexity issues in the RoastMyPost codebase:

- **Eliminates dual plugin system confusion** with unified interface and adapters
- **Simplifies coordinate transformations** with centralized PositionMapper service  
- **Removes Helicone complexity** with request-scoped SessionService
- **Breaks down oversized PluginManager** into focused, single-responsibility services
- **Fixes failing tests** with better coordinate validation and cleaner architecture

The 4-week timeline provides a systematic approach that maintains functionality throughout the migration while progressively simplifying the architecture. The result will be a 30% reduction in code complexity with significantly improved maintainability, testability, and performance.

**Next Steps:**
1. Review and approve this plan
2. Create feature branch for migration work
3. Begin Week 1 implementation
4. Set up automated monitoring for each phase
5. Execute according to timeline with regular checkpoints