# Stale Evaluation Handling - Implementation Todo

This worktree is for implementing the stale evaluation handling feature as documented in `/docs/development/stale-evaluation-handling.md`.

## Implementation Plan

### Phase 1: Server-Side Filtering (Priority: High) ✅
- [x] Modify `DocumentModel.getDocumentWithEvaluations()` to filter evaluations by version match
- [x] Add a parameter or separate method to fetch all evaluations (for history views)  
- [x] Test that reader view only shows current version evaluations
- [x] Ensure other views still have access to all evaluations

### Phase 2: Auto Re-evaluation with Warnings (Priority: High) ✅
- [x] Add warning dialog for document edit action
- [x] Add warning dialog for document re-upload action
- [x] Modify `DocumentModel.update()` to automatically queue re-evaluations
- [x] Track and display the number of evaluations being re-run

### Phase 3: UI Enhancements (Priority: Medium) ✅
- [x] Add version mismatch indicators in evaluation history views
- [x] Show which document version each evaluation was run against
- [x] Add "stale" badges where appropriate outside reader view

## Key Files to Modify

1. **Server-side filtering**:
   - `/src/models/Document.ts` - Main filtering logic
   - `/src/app/docs/[docId]/page.tsx` - Document page data fetching

2. **Update warnings**:
   - `/src/app/docs/[docId]/edit/page.tsx` - Edit page UI
   - `/src/app/docs/[docId]/edit/actions.ts` - Edit action handler
   - `/src/app/docs/[docId]/reader/actions.ts` - Re-upload action handler

3. **Auto re-evaluation**:
   - `/src/models/Document.ts` - Update method enhancement
   - Add job creation logic for all existing evaluations

## Testing Scenarios

1. Create document with multiple evaluations
2. Edit document and verify:
   - Warning appears
   - Old evaluations disappear from reader
   - New evaluation jobs are created
3. Check that evaluation history still shows old versions
4. Verify re-upload also triggers re-evaluations

## Notes

- Server-side filtering is critical for performance
- Auto re-evaluation keeps staleness window minimal
- Clear warnings prevent surprise costs
- Historical data preservation is important

## Documentation Updates

### User-Facing Documentation
- [ ] Add help text explaining what happens when documents are edited
- [ ] Create FAQ entry about evaluation re-runs and costs
- [ ] Update tooltips on edit/re-upload buttons to mention evaluation impact
- [ ] Add "What's New" announcement when feature launches

### Technical Documentation
- [ ] Update API documentation for new `includeStale` parameter
- [ ] Document the version matching logic in code comments
- [ ] Add JSDoc comments to new/modified methods
- [ ] Update the architecture diagram to show evaluation filtering flow

## Comprehensive Testing Plan

### Unit Tests
- [ ] Test `DocumentModel.getDocumentWithEvaluations()` with `includeStale=false`
- [ ] Test `DocumentModel.getDocumentWithEvaluations()` with `includeStale=true`
- [ ] Test version matching logic edge cases:
  - [ ] No evaluations exist
  - [ ] All evaluations are stale
  - [ ] Mix of current and stale evaluations
  - [ ] Evaluation with no versions
- [ ] Test auto re-evaluation job creation on update

### Integration Tests
- [ ] Test document edit flow with existing evaluations
- [ ] Test re-upload flow with existing evaluations
- [ ] Test that jobs are properly queued for all agents
- [ ] Test warning dialog cancellation
- [ ] Test API endpoints return filtered data correctly

### E2E Tests
- [ ] Full user journey: Create document → Add evaluations → Edit → Verify re-runs
- [ ] Test that stale evaluations don't appear in reader view
- [ ] Test that evaluation history still shows all versions
- [ ] Test warning dialogs appear and function correctly
- [ ] Test job processing completes successfully after re-evaluation

### Performance Tests
- [ ] Measure query performance with/without filtering
- [ ] Test with documents having many evaluations (50+)
- [ ] Verify no N+1 queries introduced
- [ ] Check memory usage with large result sets

### Manual Testing Checklist
- [ ] Create document with 3+ different agent evaluations
- [ ] Edit document and verify:
  - [ ] Warning shows correct evaluation count
  - [ ] Old evaluations disappear from reader
  - [ ] New jobs appear in job queue
  - [ ] New evaluations complete successfully
- [ ] Test re-upload functionality similarly
- [ ] Verify evaluation history view still works
- [ ] Test on mobile devices for UI responsiveness
- [ ] Test with slow network to ensure loading states work

## Monitoring & Rollout

### Metrics to Track
- [ ] Number of stale evaluations filtered per request
- [ ] Time taken for filtering operation
- [ ] Number of auto re-evaluations triggered
- [ ] User cancellation rate on warning dialogs
- [ ] API response time before/after filtering

### Feature Flags
- [ ] Add feature flag for stale evaluation filtering
- [ ] Add feature flag for auto re-evaluation
- [ ] Plan phased rollout (10% → 50% → 100%)

### Rollback Plan
- [ ] Document how to disable filtering via feature flag
- [ ] Ensure includeStale=true provides backward compatibility
- [ ] Have hotfix process ready for critical issues

## Post-Launch Tasks
- [ ] Monitor user feedback for confusion about missing evaluations
- [ ] Track API costs from auto re-evaluations
- [ ] Gather metrics on performance improvements
- [ ] Plan Phase 3 enhancements based on usage patterns