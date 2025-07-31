# Plugin System Tests

This directory contains tests for the plugin system components:

- `TextChunk.test.ts` - Tests for the TextChunk class
- `PluginManager.test.ts` - Tests for the PluginManager
- `PromptBasedRouter.test.ts` - Tests for the routing system
- `MathPlugin.test.ts` - Tests for the MathPlugin implementation

## Running Tests

```bash
npm test -- src/lib/analysis-plugins/__tests__/
```

## Test Coverage

The plugin system now has basic test coverage for core functionality:
- ✅ TextChunk utility class
- ✅ Plugin processing workflow
- ✅ LLM routing logic
- ✅ Error handling
- ✅ Metadata tracking

## TODO

- Add integration tests for full document processing pipeline
- Add performance tests for large documents
- Add tests for plugin interaction patterns