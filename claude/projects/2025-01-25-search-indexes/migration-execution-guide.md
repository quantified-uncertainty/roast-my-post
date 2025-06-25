# Migration Execution Guide

## Pre-Migration Checklist

### 1. Review What Will Happen

**Adding to DocumentVersion table:**
- `searchableText` - Generated column combining all metadata
- `content_search_vector` - tsvector for full-text content search

**New Indexes:**
- `idx_document_versions_searchable_text` - B-tree for substring search
- `idx_document_versions_content_fts` - GIN for full-text search

**Indexes to Drop:**
- `idx_document_versions_title_lower`
- `idx_document_versions_authors_gin`
- `idx_document_versions_platforms_gin`
- `idx_document_versions_urls_gin`
- `idx_document_versions_intended_agents_gin`
- `idx_document_versions_content_prefix`

### 2. Estimate Impact

```sql
-- Check current DocumentVersion count and size
SELECT 
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('public."DocumentVersion"')) as table_size
FROM "DocumentVersion";

-- Estimate time: ~1-2 seconds per 1000 rows for generated columns
-- With 28 documents: ~5-10 seconds
-- With 1000 documents: ~1-2 minutes
```

### 3. Backup First!

```bash
# Create backup
./scripts/backup-before-indexes.sh

# Or manually:
DATABASE_URL_CLEAN=$(echo $DATABASE_URL | sed 's/?schema=public//')
pg_dump "$DATABASE_URL_CLEAN" > backups/pre_searchable_text_$(date +%Y%m%d_%H%M%S).sql
```

## Migration Steps

### Step 1: Apply Schema Changes (Prisma)

```bash
# First, push the schema changes to update Prisma
npx prisma db push

# This will:
# - Sync the schema.prisma changes
# - NOT run the SQL migrations yet
```

### Step 2: Apply the searchableText Migration

```bash
# Apply the generated columns migration
DATABASE_URL_CLEAN=$(echo $DATABASE_URL | sed 's/?schema=public//')
psql "$DATABASE_URL_CLEAN" < prisma/migrations/20250125_add_searchable_text/migration.sql
```

**What happens:**
1. Adds `searchableText` column (instant)
2. PostgreSQL automatically computes values for ALL existing rows
3. Adds `content_search_vector` column
4. PostgreSQL computes tsvector for all content (this takes time)
5. Creates indexes CONCURRENTLY (no locking)

### Step 3: Verify the Migration

```sql
-- Check that columns were added
\d "DocumentVersion"

-- Verify searchableText is populated
SELECT 
    title,
    LEFT(searchableText, 100) as searchable_preview
FROM "DocumentVersion"
LIMIT 5;

-- Check indexes were created
SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_indexes
WHERE tablename = 'DocumentVersion'
AND indexname LIKE 'idx_%searchable%' OR indexname LIKE 'idx_%content%';
```

### Step 4: Test Search Performance

```sql
-- Test metadata search (should use index)
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "DocumentVersion"
WHERE searchableText LIKE '%ozzie%'
LIMIT 10;

-- Test full-text search (should use GIN index)
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "DocumentVersion"
WHERE content_search_vector @@ plainto_tsquery('english', 'machine learning')
LIMIT 10;
```

### Step 5: Drop Redundant Indexes

```bash
# Only after verifying new indexes work!
psql "$DATABASE_URL_CLEAN" < prisma/migrations/20250125_drop_redundant_indexes/migration.sql
```

### Step 6: Update Application Code

The application code is already updated to use searchableText. Deploy the new code after migrations.

## Rollback Plan

### If Issues with searchableText:

```sql
-- Remove the generated columns
ALTER TABLE "DocumentVersion" DROP COLUMN IF EXISTS searchableText;
ALTER TABLE "DocumentVersion" DROP COLUMN IF EXISTS content_search_vector;

-- Drop the new indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_document_versions_searchable_text;
DROP INDEX CONCURRENTLY IF EXISTS idx_document_versions_content_fts;

-- Restore from backup if needed
psql "$DATABASE_URL_CLEAN" < backups/pre_searchable_text_[timestamp].sql
```

## Common Issues & Solutions

### Issue: "column content_search_vector contains null values"
PostgreSQL generates tsvector as NULL for NULL content. This is fine - the index handles it.

### Issue: Migration takes too long
The content_search_vector generation can be slow for large documents. Options:
1. Remove content search temporarily
2. Apply during low traffic
3. Use smaller content limit (5000 chars instead of 10000)

### Issue: Disk space concerns
Generated columns take space. Check with:
```sql
SELECT 
    pg_size_pretty(pg_total_relation_size('public."DocumentVersion"')) as total_size,
    pg_size_pretty(pg_relation_size('public."DocumentVersion"')) as table_size,
    pg_size_pretty(pg_indexes_size('public."DocumentVersion"')) as indexes_size;
```

## Post-Migration Verification

```bash
# Run the app locally
npm run dev

# Test search functionality:
# 1. Search for author name - should find documents
# 2. Search for platform - should find documents  
# 3. Search for partial words - should work
# 4. Check "Search All" gives same results as local search
```

## Production Deployment Order

1. **Backup production database**
2. **Apply migrations during low traffic**
3. **Verify indexes are working**
4. **Deploy new application code**
5. **Monitor for 24 hours**
6. **Drop old indexes after confirmation**

## Performance Expectations

### Before (with 6 separate indexes):
- Insert/Update: Updates 6 indexes
- Search: Complex query planning
- Storage: 6 indexes × ~16KB each

### After (with generated columns):
- Insert/Update: Auto-updates 2 columns, 2 indexes
- Search: Simple, predictable queries
- Storage: 2 columns + 2 indexes (likely less than before)

### At 1000 documents:
- Migration time: ~2-5 minutes
- Search performance: <10ms for metadata, <50ms for content
- Storage overhead: ~1-2MB for searchableText, ~5-10MB for content vectors