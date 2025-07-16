# Plugin Analysis Routing Fix

## Problem
The Plugin Analysis routing system was truncating text chunks to 500 characters when deciding which analysis tools should process them, even though the actual chunks were 1000 characters. This meant routing decisions were made on incomplete information.

## Solution
1. **Default behavior**: Now shows full chunk content for routing decisions
2. **Configurable limit**: Added `maxPreviewLength` configuration option (default: 2000 chars)

## Usage

### Default Configuration (No truncation for standard chunks)
```typescript
// In multiEpistemicEval/index.ts
const manager = new PluginManager();
// Will show full chunks up to 2000 chars for routing
```

### Custom Configuration
```typescript
// Set custom preview length
const manager = new PluginManager({
  routerConfig: {
    maxPreviewLength: 3000,  // Show up to 3000 chars
    batchSize: 20,          // Process 20 chunks at a time
    maxCacheSize: 2000      // Cache up to 2000 routing decisions
  }
});
```

### Direct Router Usage
```typescript
const router = new PromptBasedRouter({
  maxPreviewLength: 5000  // Very long preview for special cases
});
```

## Impact
- **Before**: Only 50% of chunk content visible to router (500/1000 chars)
- **After**: 100% of standard chunks visible (up to 2000 chars default)
- **Result**: More accurate routing decisions, especially for:
  - Math expressions appearing later in chunks
  - Factual claims in the second half of chunks
  - Context that clarifies the chunk's topic

## Files Modified
- `/src/lib/documentAnalysis/plugin-system/PromptBasedRouter.ts`
- `/src/lib/documentAnalysis/plugin-system/PluginManager.ts`

## Testing the Fix
To verify the routing is working better:

1. Create a document with mixed content (math, facts, predictions)
2. Ensure important content appears after character 500 in some chunks
3. Run the analysis and check that appropriate plugins are assigned
4. Compare with previous results to see improved routing accuracy