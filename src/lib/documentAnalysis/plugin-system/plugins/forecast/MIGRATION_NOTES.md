# Migration Notes: Forecast Plugin Refactoring

## Changes Made

### 1. File Structure
- Moved original `/forecast` implementation to `/forecast4` (old plugin architecture)
- Moved new `/forecast3` implementation to `/forecast` (simple class architecture)
- All imports have been updated accordingly

### 2. Implementation Architecture
The new implementation (`ForecastAnalyzerJob`) is a simple class that:
- Has no inheritance from base classes
- Uses the `extract-forecasting-claims` tool directly
- Leverages all the rich data from the tool (quality scores, rewritten text, etc.)
- Has a cleaner API with just `analyze()` and `getResults()` methods

### 3. Backward Compatibility
Created `plugin-wrapper.ts` that wraps `ForecastAnalyzerJob` to implement the `SimpleAnalysisPlugin` interface:
- Allows the new implementation to work with the existing PluginManager
- Tests continue to work without major changes
- Export both `ForecastAnalyzerJob` and `ForecastPlugin` from index.ts

### 4. Key Improvements
- **Better forecast selection**: Uses verifiability and importance scores
- **Enhanced messages**: Shows quality indicators and cleaner rewritten text
- **Richer analysis**: Includes quality metrics in the summary
- **Simpler code**: No complex inheritance or pipeline stages

### 5. Test Updates
- Updated tests to work with the wrapper
- Removed `clearState()` test (not applicable to new design)
- Updated debug info tests to match new structure

## Usage

### For New Code
Use `ForecastAnalyzerJob` directly:
```typescript
const analyzer = new ForecastAnalyzerJob({ documentText, chunks });
const results = await analyzer.analyze();
```

### For Existing Code
Use `ForecastPlugin` through the wrapper:
```typescript
const plugin = new ForecastPlugin();
const results = await plugin.analyze(chunks, documentText);
```

Both approaches work and produce the same results.