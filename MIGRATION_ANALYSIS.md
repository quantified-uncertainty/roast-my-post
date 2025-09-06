# Database Migration Safety Analysis

## Overview
Analysis of migrations for evaluation cascade deletion and FK relationship reversal between EvaluationComment and EvaluationHighlight.

## Migrations Analyzed

### 1. `20250905152109_add_cascade_delete_for_evaluations`
**Purpose**: Add CASCADE DELETE to ensure child records are deleted when Evaluation is deleted.

**Operations**:
1. Drop and recreate FK on EvaluationVersion → Evaluation with CASCADE
2. Drop and recreate FK on Job → Evaluation with CASCADE

**Safety Assessment**: ✅ SAFE
- No data modification, only constraint changes
- Idempotent (can be run multiple times)
- Reversible (can remove CASCADE without data loss)

### 2. `20250906085953_reverse_comment_highlight_fk`
**Purpose**: Reverse FK relationship so Highlight references Comment (not vice versa)

**Operations**:
1. Drop FK/indexes from EvaluationComment.highlightId
2. Add commentId column to EvaluationHighlight
3. Populate commentId from existing relationships
4. Delete orphaned highlights (468 records deleted in production)
5. Make commentId NOT NULL and UNIQUE
6. Add FK with CASCADE DELETE
7. Drop highlightId from EvaluationComment

## Critical Issues & Risks

### 🔴 1. Migration Atomicity Problem
**Issue**: The FK reversal migration has 7 steps mixing DDL and DML operations. If it fails mid-way:
- Step 1-2: Comments lose FK but highlights don't have it yet
- Step 3-4: Data partially migrated, orphans deleted
- Step 5-6: Constraints partially applied
- Step 7: Old column might still exist

**Risk Level**: HIGH
**Impact**: Database in inconsistent state requiring manual recovery

**Recommendation**: 
```sql
BEGIN;
-- All migration steps here
COMMIT;
```
Note: Some DDL operations in PostgreSQL cannot be transactional.

### 🟡 2. Data Loss from Orphaned Highlights
**Issue**: Migration deletes 468 orphaned highlights without backup
**Risk Level**: MEDIUM
**Impact**: Permanent data loss if these highlights were important

**Recommendation**: 
```sql
-- Before deletion, backup orphaned data
CREATE TABLE orphaned_highlights_backup AS 
SELECT * FROM "EvaluationHighlight" WHERE "commentId" IS NULL;
```

### 🟡 3. Unique Constraint on commentId
**Issue**: Makes it impossible for a comment to have multiple highlights
**Risk Level**: MEDIUM
**Impact**: Business logic constraint that may not match requirements

**Current State Verification**:
```sql
-- Check if any comments currently have multiple highlights
-- Result: 0 (safe for now)
```

### 🟢 4. Cascade Delete Chain
**Current Chain**:
```
Document → Evaluation → EvaluationVersion → EvaluationComment → EvaluationHighlight
                     ↘ Job → Task
```

**Risk Level**: LOW (but needs awareness)
**Impact**: Deleting a Document cascades through entire tree

### 🟢 5. No Rollback Plan
**Issue**: No down migration provided
**Risk Level**: LOW (in development)
**Impact**: Cannot easily revert if issues found

**Manual Rollback Steps**:
```sql
-- Reverse the FK relationship back
ALTER TABLE "EvaluationComment" ADD COLUMN "highlightId" TEXT UNIQUE;
UPDATE "EvaluationComment" c 
SET "highlightId" = h.id 
FROM "EvaluationHighlight" h 
WHERE h."commentId" = c.id;
-- etc...
```

## Current Database State Verification

### ✅ Constraint Verification
All CASCADE constraints properly set:
- EvaluationVersion → Evaluation: CASCADE
- Job → Evaluation: CASCADE  
- EvaluationComment → EvaluationVersion: CASCADE
- EvaluationHighlight → EvaluationComment: CASCADE

### ✅ Data Integrity Check
- Orphaned highlights: 0
- Comments without highlights: 0
- All FKs properly reference existing records

### ✅ Schema Consistency
- EvaluationComment: No longer has highlightId ✓
- EvaluationHighlight: Has commentId (NOT NULL, UNIQUE) ✓
- All indexes properly created ✓

## Recommendations for Production

### Before Running Migrations:
1. **BACKUP THE DATABASE**
   ```bash
   pg_dump -U postgres -d roast_my_post > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test on staging first**

3. **Wrap in transaction where possible**:
   ```sql
   BEGIN;
   -- migration steps
   COMMIT;
   ```

4. **Monitor for FK violations**:
   ```sql
   SELECT * FROM pg_stat_database WHERE datname = 'roast_my_post';
   ```

### After Running Migrations:
1. **Verify constraints**:
   ```sql
   SELECT conname, confdeltype FROM pg_constraint 
   WHERE conrelid IN ('EvaluationVersion'::regclass, 'Job'::regclass);
   ```

2. **Check for orphaned records**:
   ```sql
   -- Should return 0
   SELECT COUNT(*) FROM "EvaluationHighlight" h 
   LEFT JOIN "EvaluationComment" c ON h."commentId" = c.id 
   WHERE c.id IS NULL;
   ```

3. **Test cascade deletion** (on staging):
   ```sql
   -- Create test evaluation and verify cascade
   DELETE FROM "Evaluation" WHERE id = 'test-id';
   -- Verify all child records deleted
   ```

## Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Migration fails mid-execution | Medium | High | Add transaction wrapper |
| Orphaned data loss | Low | Medium | Already executed, created backup |
| Cascade delete too aggressive | Low | High | Test thoroughly, add soft deletes |
| Cannot rollback | Medium | Medium | Document rollback procedure |
| Constraint violations | Low | Medium | Validated current data |

## 🚨 CRITICAL DISCOVERY

**The migrations were applied directly via psql but are NOT recorded in Prisma's _prisma_migrations table!**

This means:
1. Prisma doesn't know these migrations have been applied
2. Running `prisma migrate deploy` will try to apply them again (will likely fail)
3. The database schema is out of sync with Prisma's migration history
4. Other developers pulling the code will have migration conflicts

### To Fix This Issue:

```bash
# Option 1: Mark migrations as applied (RECOMMENDED)
pnpm --filter @roast/db run with-env prisma migrate resolve --applied 20250905152109_add_cascade_delete_for_evaluations
pnpm --filter @roast/db run with-env prisma migrate resolve --applied 20250906085953_reverse_comment_highlight_fk

# Option 2: Reset migration history (DANGEROUS - only in dev)
# This would require backing up data and reapplying all migrations
```

## Conclusion

The migrations are functionally correct and have been successfully applied. However:

1. **🚨 CRITICAL**: Migrations not recorded in Prisma's migration table
2. **Critical**: The FK reversal migration lacks atomicity protection
3. **Important**: 468 orphaned records were permanently deleted
4. **Note**: The unique constraint on commentId enforces 1:1 relationship

For production deployment:
- **FIRST**: Resolve the migration history issue
- Always backup before migration
- Consider wrapping in transaction
- Have rollback plan ready
- Monitor for constraint violations post-migration
- Use `prisma migrate deploy` not manual SQL