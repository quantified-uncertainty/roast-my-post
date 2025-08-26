# EvaluationCard Component

## Purpose
Shared evaluation card component to ensure consistency between the reader view (`/docs/[docId]/reader`) and document management page (`/docs/[docId]`).

## Future Improvements for Consistency

### 1. Use EvaluationCard in Both Places
Currently, both pages have their own implementations. We should:
- Update `EvaluationCardsHeader` to use the shared `EvaluationCard` component
- Update `EvaluationManagement` to use the shared `EvaluationCard` with `variant="full"`

### 2. Shared Action Handlers
Create shared action handlers for:
- Rerun evaluation logic
- Toggle evaluation active state
- Navigation to evaluation details

### 3. Consistent Data Shape
Define a common interface for evaluation data that both pages use:
```typescript
interface EvaluationDisplay {
  // Core fields used by both views
  agentId: string;
  agentName: string;
  status: EvaluationStatus;
  grade?: number | null;
  summary?: string;
  commentCount: number;
  isStale: boolean;
  // ... etc
}
```

### 4. Shared Hooks
Create hooks for common evaluation operations:
```typescript
// Hook for evaluation status and rerun logic
useEvaluationStatus(evaluation)

// Hook for managing evaluation selection
useEvaluationSelection(evaluations)
```

### 5. Visual Consistency Checklist
- [ ] Same status colors (using STATUS_COLORS constant)
- [ ] Same badge sizes and styles
- [ ] Same truncation logic for summaries
- [ ] Same loading/error states
- [ ] Same animation transitions
- [ ] Same hover effects and interactions

### 6. Testing Strategy
- Create visual regression tests for both views
- Test status transitions (pending -> running -> completed)
- Test rerun scenarios
- Test stale indicator display

## Current Status
- ✅ Created shared component structure
- ✅ Implemented compact variant for reader view
- ✅ Added stale badge support
- ✅ Fixed status colors (blue for running)
- ⏳ TODO: Implement full variant for document management
- ⏳ TODO: Migrate existing components to use shared component