# Plugin Location Tracking Design

## Overview

This document outlines the staged approach for consistent location tracking across all plugins in the document analysis system.

## Current Issues

1. **Inconsistent location hints** - Some findings have complete location info, others have none
2. **Loss of location context** - Findings created during synthesis have no chunk context
3. **Pattern findings** - Summary findings (e.g., "5 spelling errors found") cannot have specific locations
4. **Multi-line findings** - Findings spanning multiple lines are difficult to track

## Proposed Architecture

### 1. Stage 1: processChunk() - Extract Findings with Location

During chunk processing, plugins extract findings with complete location information:

```typescript
interface ChunkFinding {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'info';
  message: string;
  locationHint: {
    lineNumber: number;        // Always required
    lineText: string;          // Always required
    matchText: string;         // Always required
    startLineNumber?: number;  // For multi-line
    endLineNumber?: number;    // For multi-line
  };
  metadata?: Record<string, any>;
}
```

### 2. Stage 2: generateComments() - Filter and Prioritize

After all chunks are processed, plugins filter their findings to create comments:

```typescript
interface GenerateCommentsContext {
  documentText: string;
  maxComments?: number;
  minImportance?: number;
}

abstract generateComments(context: GenerateCommentsContext): Comment[];
```

The plugin decides which findings become comments based on:
- Importance/severity
- Deduplication
- Document-wide patterns
- User-defined limits

### 3. Stage 3: Location Resolution

The `generateComments` method uses existing utilities to convert findings to comments:
- Uses `convertFindingToHighlight` to create proper Comment objects
- Resolves exact character offsets from line numbers
- Validates locations against the full document text

### 4. Stage 4: Storage

Comments are stored in the plugin instance:

```typescript
interface PluginResult {
  summary: string;
  comments: Comment[];  // Replaces findings
  recommendations?: string[];
  metadata?: {
    totalFindings: number;
    selectedComments: number;
    patterns?: Record<string, number>;
  };
}
```

## Implementation Plan

### Phase 1: Update Base Types
- Add `ChunkFinding` interface
- Update `ChunkResult` to use `ChunkFinding[]`
- Add `generateComments` to `AnalysisPlugin` interface

### Phase 2: Update BasePlugin
- Add `chunkFindings` collection to store findings from processChunk
- Implement default `generateComments` method
- Update state management to track findings separately from comments

### Phase 3: Update Individual Plugins
- Ensure all findings in processChunk have complete locationHint
- Implement custom generateComments logic where needed
- Remove location tracking from synthesize

### Phase 4: Update Plugin Manager
- Call generateComments after all chunks are processed
- Pass full document text for location resolution
- Update result aggregation to use comments instead of findings

## Benefits

1. **Consistent location format** - All findings have the same locationHint structure
2. **Clear separation of concerns** - Finding extraction vs comment generation
3. **Better filtering** - Can analyze all findings before selecting comments
4. **No location loss** - Location info captured at extraction time
5. **Pattern analysis** - Can still create summary findings that don't become comments

## Migration Strategy

1. Add new interfaces and methods without breaking existing code
2. Update plugins incrementally to use new approach
3. Deprecate old finding-based synthesis
4. Remove deprecated code after all plugins migrated