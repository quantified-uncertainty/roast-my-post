# Learnings from Search Index Implementation

## Key Discoveries

### 1. Prisma Table Naming
- Prisma uses PascalCase for table names (e.g., `DocumentVersion`)
- PostgreSQL traditionally uses snake_case
- Must use quoted identifiers in SQL: `"DocumentVersion"`

### 2. DATABASE_URL Schema Parameter
- Prisma adds `?schema=public` to DATABASE_URL
- psql and pg_dump don't understand this parameter
- Solution: Strip it before using with native PostgreSQL tools
```bash
DATABASE_URL_CLEAN=$(echo $DATABASE_URL | sed 's/?schema=public//')
```

### 3. Environment Variable Loading in Scripts
- Standard `export $(cat .env | xargs)` can fail with complex values
- Better approach:
```bash
DATABASE_URL=$(grep "^DATABASE_URL" .env | cut -d'=' -f2- | tr -d '"')
export DATABASE_URL
```

### 4. Array Types in PostgreSQL
- Prisma `String[]` maps to PostgreSQL `ARRAY` with `_text` UDT
- GIN indexes are perfect for array containment queries
- Use `= ANY(array_column)` for queries

### 5. Index Selection by Query Planner
- PostgreSQL won't use indexes on small tables (correct behavior)
- Sequential scan is faster for <100 rows
- Indexes become valuable as data grows

## Useful Commands

### Check Index Usage
```sql
-- See all indexes
SELECT indexname, tablename, pg_size_pretty(pg_relation_size(indexname::regclass)) as size 
FROM pg_indexes 
WHERE indexname LIKE 'idx_%';

-- Check if query uses index
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM "DocumentVersion" 
WHERE 'LessWrong' = ANY(platforms);
```

### Backup and Restore
```bash
# Backup with clean URL
DATABASE_URL_CLEAN=$(echo $DATABASE_URL | sed 's/?schema=public//')
pg_dump "$DATABASE_URL_CLEAN" > backup.sql

# Restore
psql "$DATABASE_URL_CLEAN" < backup.sql
```

## Security Considerations

### What We Checked
1. ✅ No exposed API keys or secrets
2. ✅ No unsafe database operations
3. ✅ Backup created before migration
4. ✅ Used CONCURRENTLY to avoid locks
5. ✅ Rollback plan in place

### Type Errors Found
- Need to fix before committing
- Mostly null vs undefined issues
- Some import name mismatches

## Performance Expectations

### Search Patterns That Will Improve
```sql
-- Author search (GIN index)
WHERE 'John Doe' = ANY(authors)

-- Platform filter (GIN index)
WHERE 'LessWrong' = ANY(platforms)

-- Import URL check (B-tree partial index)
WHERE importUrl = 'https://example.com/article'

-- Title search (functional B-tree index)
WHERE LOWER(title) LIKE 'machine%'

-- URL contains (GIN index)
WHERE 'example.com' = ANY(urls)
```

### Patterns That Won't Use Indexes
```sql
-- Leading wildcard (no B-tree support)
WHERE title LIKE '%test%'

-- Full text search in content (need different approach)
WHERE content LIKE '%keyword%'
```

## Future Improvements
1. Consider PostgreSQL full-text search for content
2. Add trigram indexes for fuzzy matching
3. Implement search result ranking
4. Add search query logging for optimization