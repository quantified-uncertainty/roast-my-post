# Index Migration Safety Analysis

## Pre-Migration Checklist

### 1. PostgreSQL Version Requirements
**Required**: PostgreSQL 9.5+ (for CONCURRENTLY IF NOT EXISTS)
**Recommended**: PostgreSQL 11+ (better GIN performance)

```sql
-- Check version:
SELECT version();
```

**GIN Index Support**: Available since PostgreSQL 8.2 ✅
**Array Support**: Native since PostgreSQL 7.4 ✅
**CONCURRENTLY**: Available since PostgreSQL 8.2 ✅

### 2. Potential Risks & Mitigations

#### Risk 1: Long Running Index Creation
**Issue**: Large tables might take hours to index
**Impact**: Increased CPU/IO during creation
**Mitigation**: 
- CONCURRENTLY prevents locking
- Can be cancelled safely with `SELECT pg_cancel_backend(pid)`
- Run during low-traffic periods

#### Risk 2: Disk Space
**Issue**: Indexes require additional disk space
**Check**:
```sql
-- Current DB size
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Table sizes
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('documents', 'document_versions', 'agent_versions')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Estimated Space Needed**: ~10-15% of table size
**Safe if**: You have 2x the estimated space free

#### Risk 3: GIN Index on Arrays
**Issue**: Prisma might store arrays as JSONB or TEXT
**Check**:
```sql
-- Verify array column types
SELECT 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns
WHERE table_name = 'document_versions' 
AND column_name IN ('authors', 'platforms');
```

**Expected**: `ARRAY` or `_text` (PostgreSQL array notation)
**If JSONB**: Need different index strategy

#### Risk 4: Application Impact
**During Creation**:
- Slight performance degradation (10-20%)
- No downtime or locks
- Queries continue working normally

**After Creation**:
- INSERT/UPDATE slightly slower (5-10%)
- SELECT much faster (10-100x)
- More memory usage for index caching

### 3. Validation Queries

#### Pre-Migration Performance Baseline
```sql
-- Save these timings for comparison
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM document_versions 
WHERE LOWER(title) LIKE '%test%' LIMIT 10;

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM document_versions 
WHERE 'John Doe' = ANY(authors) LIMIT 10;
```

#### Index Already Exists Check
```sql
-- List existing indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('documents', 'document_versions', 'agents', 'agent_versions')
ORDER BY tablename, indexname;
```

### 4. Safe Rollback Plan

If anything goes wrong, indexes can be safely removed:

```sql
-- Remove specific index
DROP INDEX CONCURRENTLY IF EXISTS idx_document_versions_title_lower;

-- Remove all new indexes (safe rollback)
DROP INDEX CONCURRENTLY IF EXISTS idx_document_versions_title_lower;
DROP INDEX CONCURRENTLY IF EXISTS idx_document_versions_content_prefix;
DROP INDEX CONCURRENTLY IF EXISTS idx_agent_versions_name_lower;
DROP INDEX CONCURRENTLY IF EXISTS idx_document_versions_authors_gin;
DROP INDEX CONCURRENTLY IF EXISTS idx_document_versions_platforms_gin;
DROP INDEX CONCURRENTLY IF EXISTS idx_document_versions_lookup;
DROP INDEX CONCURRENTLY IF EXISTS idx_documents_published_date_desc;
```

### 5. Step-by-Step Execution Plan

#### Phase 1: Preparation (You Are Here)
1. ✅ Create backup script
2. ✅ Analyze risks
3. ⏳ Run backup
4. ⏳ Check disk space
5. ⏳ Verify column types

#### Phase 2: Test Run (Recommended)
1. Create ONE index first as a test:
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_test_title" 
ON "document_versions" (LOWER("title"));
```
2. Monitor creation time and impact
3. Verify it works:
```sql
EXPLAIN SELECT * FROM document_versions WHERE LOWER(title) = 'test';
-- Should show "Index Scan" not "Seq Scan"
```
4. Drop test index:
```sql
DROP INDEX CONCURRENTLY idx_test_title;
```

#### Phase 3: Full Migration
1. Run during low traffic (nights/weekends)
2. Execute migration script
3. Monitor progress:
```sql
-- Watch index creation progress
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query 
FROM pg_stat_activity
WHERE query LIKE 'CREATE INDEX%';
```

### 6. Warning Signs to Stop

STOP the migration if you see:
- ❌ Disk usage above 90%
- ❌ CPU sustained above 80%
- ❌ Application timeouts
- ❌ Replication lag (if using replicas)

### 7. Success Criteria

After migration, verify:
- ✅ All indexes created (check pg_indexes)
- ✅ Query plans use indexes (EXPLAIN)
- ✅ Search queries faster
- ✅ No application errors
- ✅ Disk space reasonable

## Risk Assessment Summary

### Overall Risk: **LOW** ✅

**Why it's safe**:
1. CONCURRENTLY prevents any locking
2. IF NOT EXISTS makes it idempotent
3. Can be rolled back instantly
4. No data modifications
5. PostgreSQL handles crashes gracefully

**Biggest risks**:
1. Disk space (mitigated by checking first)
2. Time to complete (mitigated by CONCURRENTLY)
3. Array type mismatch (mitigated by checking)

## Recommended Action

1. **Run backup script first**
2. **Check disk space** (need ~500MB free minimum)
3. **Verify array columns** are actual arrays
4. **Run test index** on title first
5. **Execute full migration** during low traffic
6. **Monitor** for 24 hours

## Emergency Commands

```bash
# Cancel running index creation
psql $DATABASE_URL -c "
SELECT pg_cancel_backend(pid) 
FROM pg_stat_activity 
WHERE query LIKE 'CREATE INDEX%';"

# Full rollback
psql $DATABASE_URL < scripts/rollback-indexes.sql

# Restore from backup
psql $DATABASE_URL < backups/pre_index_migration_[timestamp].sql
```

## Final Safety Check

The migration is safe because:
- ✅ No data is modified
- ✅ No tables are locked  
- ✅ Can be cancelled anytime
- ✅ Can be rolled back instantly
- ✅ Backup provides full recovery option
- ✅ Indexes are a standard PostgreSQL feature
- ✅ Used by millions of production databases

The only real risk is disk space, which we check beforehand.