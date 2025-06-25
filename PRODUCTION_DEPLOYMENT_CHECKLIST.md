# Production Deployment Checklist for Search Feature

## Pre-deployment Checklist

### ✅ Code Changes Ready
- [x] Increased document limit from 20 to 50 in `/src/app/docs/page.tsx`
- [x] Added efficient query methods in `/src/models/Document.ts`
- [x] Updated search API to use `searchableText` field
- [x] Fixed Prisma schema to match database state
- [x] Added Prisma debugging guide to CLAUDE.md

### ✅ Migration Files Fixed
- [x] Renamed migrations from incorrect dates (20250125 → 20250625)
- [x] Added immutable wrapper function to migration
- [x] Migration files in correct order:
  - `20250625_add_search_indexes/`
  - `20250625_add_searchable_text/`
  - `20250625_drop_redundant_indexes/`

### ⚠️ Database Considerations
- The `searchableText` and `content_search_vector` are generated columns
- They will be automatically computed for all existing rows
- With ~28 documents: ~5-10 seconds migration time
- At 1000 documents: ~2-5 minutes migration time

## Production Deployment Steps

1. **Backup Production Database**
   ```bash
   pg_dump "$PRODUCTION_DATABASE_URL" > backup_before_search_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Deploy Code First**
   - Deploy the new code with updated search functionality
   - The old code will continue to work (it just won't use searchableText)

3. **Run Migrations**
   ```bash
   # Apply all pending migrations
   npx prisma migrate deploy
   ```

4. **Regenerate Prisma Client**
   ```bash
   npx prisma generate
   ```

5. **Verify Migration Success**
   ```sql
   -- Check searchableText is populated
   SELECT COUNT(*) FROM "DocumentVersion" WHERE "searchableText" IS NOT NULL;
   
   -- Test search query
   SELECT title FROM "DocumentVersion" 
   WHERE "searchableText" ILIKE '%test%' 
   LIMIT 5;
   ```

6. **Monitor Performance**
   - Check search response times
   - Monitor database CPU/memory during first few searches
   - Verify indexes are being used

## Rollback Plan

If issues occur:

1. **Keep the new code** (it's backwards compatible)
2. **Drop the generated columns if needed**:
   ```sql
   ALTER TABLE "DocumentVersion" DROP COLUMN IF EXISTS "searchableText";
   ALTER TABLE "DocumentVersion" DROP COLUMN IF EXISTS content_search_vector;
   DROP FUNCTION IF EXISTS immutable_array_to_string(text[], text);
   ```

## Post-Deployment Verification

- [ ] Search for common terms returns results
- [ ] Search performance is under 100ms for metadata search
- [ ] No errors in application logs
- [ ] Database performance metrics are normal

## Notes

- The migrations use `CREATE INDEX CONCURRENTLY` to avoid locking
- Generated columns mean no application code changes needed for maintaining search data
- The immutable wrapper function is required for PostgreSQL compatibility