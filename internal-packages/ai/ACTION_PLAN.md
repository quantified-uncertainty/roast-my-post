# Action Plan for @roast/ai Package

## Immediate Fixes Required for CI

### 1. Test Mock Issues (HIGH PRIORITY)
**Problem**: Some tests are still failing due to incomplete mocks for sessionContext
**Solution**: 
- Update all test files that import tools using sessionContext
- Ensure mock includes all required methods
- Consider creating a shared mock helper for consistency

**Files to check**:
- Any remaining tool test files
- Integration tests that might use tools indirectly

### 2. Missing Environment Variables
**Problem**: Tests expecting ANTHROPIC_API_KEY which isn't set in CI
**Solution**:
- Add mock API key in test setup
- Or update tests to handle missing API key gracefully
- Consider using test-specific environment configuration

### 3. Test Behavior Changes
**Problem**: Some tests expecting different responses (e.g., "verified_false" vs "cannot_verify")
**Solution**:
- Review test expectations vs actual tool behavior
- Update tests to match current implementation
- Or fix tool implementation if tests are correct

## Phase 2 Planning: Analysis Tools Package

### Package Structure
```
internal-packages/analyzers/
├── src/
│   ├── plugins/           # From /lib/analysis-plugins/
│   │   ├── core/         # PluginManager, TextChunk, etc.
│   │   ├── plugins/      # Individual plugins (math, spelling, etc.)
│   │   └── utils/        # ChunkRouter, helpers
│   ├── document/         # From /lib/documentAnalysis/
│   │   ├── analysis/     # Comprehensive analysis
│   │   ├── extraction/   # Highlight extraction
│   │   ├── critique/     # Self-critique
│   │   └── shared/       # Shared utilities
│   ├── tools/            # From /tools/
│   │   ├── base/         # Tool base class and types
│   │   ├── math/         # Math-related tools
│   │   ├── text/         # Text analysis tools
│   │   └── research/     # Research tools
│   └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

### Dependencies
- `@roast/ai` - For AI interactions
- `@roast/db` - For database types (peer dependency)
- Tool-specific deps (mathjs, unified, etc.)

### Migration Strategy
1. Start with base classes and types
2. Move shared utilities
3. Migrate plugins one by one
4. Update tool imports
5. Test each component thoroughly

## Phase 3 Considerations: Public SDK

### Requirements for Public Release
1. **Remove Internal Dependencies**
   - No direct database access
   - No internal authentication
   - Clean API boundaries

2. **Documentation**
   - Comprehensive API docs
   - Usage examples
   - Migration guide

3. **Versioning Strategy**
   - Semantic versioning
   - Change logs
   - Breaking change policy

4. **Distribution**
   - NPM publishing workflow
   - GitHub releases
   - Documentation site

## Testing Strategy Improvements

### 1. Mock Standardization
Create standardized mocks for:
- Claude API responses
- Helicone tracking
- Session context
- Database models

### 2. Test Environment
- Dedicated test configuration
- Mock environment variables
- Isolated test database

### 3. CI Optimization
- Parallel test execution
- Test result caching
- Coverage reporting

## Performance Considerations

### 1. Bundle Size
- Tree shaking support
- Optional dependencies
- Lazy loading for large tools

### 2. Runtime Performance
- Response caching
- Connection pooling
- Request batching

### 3. Memory Management
- Stream processing for large documents
- Cleanup of temporary data
- Resource limits

## Next Immediate Steps

1. **Fix Remaining CI Issues**
   - Update test mocks
   - Fix environment variables
   - Adjust test expectations

2. **Document Current State**
   - Update README with current status
   - Add troubleshooting guide
   - Document known issues

3. **Prepare for Phase 2**
   - Analyze tool dependencies
   - Plan migration order
   - Set up analyzer package structure

4. **Improve Developer Experience**
   - Add development scripts
   - Create debugging guides
   - Set up hot reloading

## Success Metrics

### Phase 1 (Current)
- ✅ Package created and configured
- ✅ Core utilities migrated
- ⚠️  CI passing (in progress)
- ⚠️  All tests passing (in progress)

### Phase 2 (Next)
- [ ] Analysis tools extracted
- [ ] No circular dependencies
- [ ] Performance maintained
- [ ] Test coverage >80%

### Phase 3 (Future)
- [ ] Public package published
- [ ] Documentation complete
- [ ] Community adoption
- [ ] Regular releases

## Risk Mitigation

1. **Breaking Changes**
   - Maintain backward compatibility
   - Deprecation warnings
   - Migration scripts

2. **Performance Regression**
   - Benchmark critical paths
   - Monitor bundle size
   - Profile memory usage

3. **Security Concerns**
   - API key management
   - Input validation
   - Rate limiting

4. **Maintenance Burden**
   - Automated testing
   - Dependency updates
   - Security scanning