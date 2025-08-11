# Extracting @roast/jobs Package - Architecture Analysis

## Executive Summary

The job processing scripts (`process-job.ts` and `process-jobs-adaptive.ts`) are currently tightly coupled to the web application's internal structure, living in `apps/web/src/scripts/`. This creates architectural issues and limits reusability. This document outlines a plan to extract job processing into a dedicated `@roast/jobs` package.

## Current Architecture Problems

### 1. Inappropriate Location
- **Scripts in web app**: Job processing scripts live in `apps/web/src/scripts/` despite being standalone workers
- **Not web concerns**: Background job processing is not inherently a web application concern
- **Poor discoverability**: Scripts buried in web app structure are hard to find and understand

### 2. Tight Coupling
The scripts have deep dependencies on web app internals:
```typescript
// Current imports in process-job.ts
import { getServices } from "@/application/services/ServiceFactory";
import { logger } from "@/infrastructure/logging/logger";
import { initializeAIPackage } from "../infrastructure/external/ai-init";

// Current imports in process-jobs-adaptive.ts
import { getAgentTimeout, formatTimeout } from "@/shared/constants/config/agentTimeouts";
```

### 3. Circular Architecture
```
scripts → ServiceFactory → JobOrchestrator → documentAnalysis workflows → web infrastructure
```

## Proposed Architecture: @roast/jobs Package

### Package Structure
```
internal-packages/jobs/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Public API exports
│   ├── core/
│   │   ├── JobService.ts           # Core job management logic
│   │   ├── JobOrchestrator.ts      # Job execution orchestration
│   │   ├── JobProcessor.ts         # Single job processor
│   │   └── AdaptiveProcessor.ts    # Adaptive multi-worker processor
│   ├── workflows/
│   │   ├── types.ts                # Workflow interfaces
│   │   └── registry.ts             # Workflow registration
│   ├── config/
│   │   ├── timeouts.ts             # Agent timeout configuration
│   │   └── retry.ts                # Retry policies
│   ├── monitoring/
│   │   ├── Logger.ts               # Job-specific logging
│   │   └── metrics.ts              # Job metrics tracking
│   └── cli/
│       ├── process-job.ts          # CLI entry point
│       └── process-adaptive.ts     # Adaptive CLI entry point
```

## What Needs to be Extracted

### Core Components (Move to @roast/jobs)
1. **JobService** (`apps/web/src/application/services/job/JobService.ts`)
   - Already well-isolated with clear interfaces
   - Depends only on `@roast/db` and `@roast/domain`

2. **JobOrchestrator** (`apps/web/src/application/services/job/JobOrchestrator.ts`)
   - Needs refactoring to remove web-specific dependencies
   - Document analysis workflow should be injected, not imported

3. **Agent Timeout Config** (`apps/web/src/shared/constants/config/agentTimeouts.ts`)
   - Pure configuration, easy to move

4. **Processing Scripts** (transform into thin CLI wrappers)
   - Core logic moves to package
   - Scripts become simple entry points

### Components That Stay in Web App
1. **ServiceFactory** - Web app's dependency injection
2. **Document Analysis Workflows** - Too coupled to web infrastructure currently
3. **AgentService** - Web-specific agent management
4. **Web Infrastructure** (logging, etc.) - Web app concerns

## Major Challenges & Solutions

### Challenge 1: Document Analysis Workflows
**Problem**: JobOrchestrator directly imports and uses document analysis workflows that are deeply embedded in the web app.

**Solution**: Workflow Registry Pattern
```typescript
// In @roast/jobs
interface WorkflowRegistry {
  analyzeDocument: DocumentAnalysisWorkflow;
  // Future workflows...
}

class JobOrchestrator {
  constructor(
    private workflows: WorkflowRegistry,
    // other deps...
  ) {}
}

// In web app
import { JobOrchestrator } from '@roast/jobs';
import { analyzeDocument } from './workflows/documentAnalysis';

const orchestrator = new JobOrchestrator({
  analyzeDocument, // Inject the workflow
});
```

### Challenge 2: Logging Infrastructure
**Problem**: Scripts use web app's logging infrastructure.

**Solution**: Logger Interface
```typescript
// In @roast/jobs
interface Logger {
  info(message: string, context?: any): void;
  error(message: string, error?: any): void;
  // etc.
}

// Web app provides implementation
import { logger as webLogger } from '@/infrastructure/logging/logger';
const jobLogger: Logger = webLogger; // Adapter if needed
```

### Challenge 3: Document Analysis Workflow Dependencies
**Problem**: Document analysis workflows have many web-specific imports:
- `@/infrastructure/logging/logger`
- `@/shared/utils/costCalculator`
- Web-specific types and utilities

**Solution Options**:
1. **Short-term**: Keep workflows in web app, inject via registry
2. **Medium-term**: Extract workflows to `@roast/ai` package (they're already using AI tools)
3. **Long-term**: Create `@roast/analysis` package for all analysis workflows

## Implementation Plan

### Phase 1: Create Package Structure (Low Risk)
1. Create `internal-packages/jobs/` with basic structure
2. Set up package.json, tsconfig, build scripts
3. Add to pnpm workspace

### Phase 2: Extract Core Components (Medium Risk)
1. Move JobService (already well-isolated)
2. Move timeout configuration
3. Create workflow registry interfaces
4. Extract JobOrchestrator with dependency injection

### Phase 3: Refactor Scripts (Medium Risk)
1. Move core processing logic to package
2. Convert scripts to thin CLI wrappers
3. Update package.json scripts to use new entry points

### Phase 4: Integration (High Risk)
1. Update web app to use `@roast/jobs`
2. Wire up workflow registry
3. Test job processing end-to-end
4. Update deployment scripts

## Benefits of This Architecture

### Immediate Benefits
1. **Clear separation of concerns** - Jobs are not web concerns
2. **Reusability** - Other apps/services can use job processing
3. **Better testing** - Jobs can be tested in isolation
4. **Cleaner web app** - Removes non-web code from web app

### Future Benefits
1. **Worker service ready** - Easy to create `apps/worker/` later
2. **Microservice ready** - Could become standalone service
3. **Better scaling** - Independent deployment and scaling
4. **Plugin architecture** - Workflows can be dynamically registered

## Alternative Approaches Considered

### Option A: Move to @roast/ai
- ❌ Would make AI package too large and unfocused
- ❌ Job processing is not inherently AI-related
- ❌ Mixing concerns

### Option B: Create apps/worker
- ✅ Complete separation
- ❌ More complex initial setup
- ❌ Code duplication without shared package
- Better as future evolution after package extraction

### Option C: Keep in web app
- ✅ No refactoring needed
- ❌ Perpetuates architectural issues
- ❌ Limits future flexibility
- ❌ Confusing code organization

## Recommendation

**Proceed with creating `@roast/jobs` package** using the phased approach:

1. **Phase 1-2** can be done with minimal risk and provide immediate architectural benefits
2. **Phase 3-4** can be done incrementally with careful testing
3. This sets up for future evolution to separate worker service if needed

The workflow registry pattern solves the main coupling issue while maintaining flexibility. Document analysis workflows can be gradually extracted to `@roast/ai` or a new package later without breaking changes.

## Next Steps

1. Review and approve this plan
2. Create `@roast/jobs` package structure
3. Start with JobService extraction (lowest risk, highest value)
4. Incrementally migrate components with testing at each step
5. Update documentation and deployment scripts

## Questions for Consideration

1. Should document analysis workflows eventually move to `@roast/ai` or a new `@roast/analysis` package?
2. Do we want to support multiple workflow registries for different agent types?
3. Should job processing metrics/monitoring be part of the package or injected?
4. What's the timeline for potentially creating a separate worker service?

## Dependencies Map

### Current Dependencies
```
process-job.ts
├── @/application/services/ServiceFactory
│   ├── JobService → @roast/db, @roast/domain
│   ├── JobOrchestrator
│   │   ├── @/application/workflows/documentAnalysis
│   │   ├── @roast/ai (Agent, sessions, costs)
│   │   └── @/shared/utils/costCalculator
│   └── AgentService → @/infrastructure/database/repositories
├── @/infrastructure/logging/logger
└── @/infrastructure/external/ai-init

process-jobs-adaptive.ts
├── @roast/db (prisma, JobStatus)
├── @roast/domain (config)
├── @/application/services/ServiceFactory
├── @/infrastructure/logging/logger
└── @/shared/constants/config/agentTimeouts
```

### Proposed Dependencies
```
@roast/jobs
├── @roast/db (for repositories)
├── @roast/domain (for config, errors)
└── @roast/ai (for Agent types, sessions)

apps/web
├── @roast/jobs (uses the package)
├── [provides workflow implementations]
└── [provides logger implementation]
```

This architecture provides clean separation while maintaining flexibility for future evolution.