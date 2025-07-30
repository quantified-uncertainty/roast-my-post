# What Happens to Existing Documents During Index Migration

## The Short Answer
**ALL existing documents benefit immediately**. The indexes are built on your current data and automatically maintained for future data.

## Detailed Timeline

### T=0: Before Migration
- You have 10,000 documents (example)
- Searching titles: ~200ms (full table scan)
- Searching by author: ~300ms (scanning arrays)
- Finding recent docs: ~150ms (sorting all rows)

### T+1min: Start Migration
```bash
./scripts/apply-search-indexes.sh
```
- PostgreSQL starts scanning existing tables
- NO locks on tables (CONCURRENTLY flag)
- Users can still search, insert, update normally
- Performance slightly degraded (~10-20%)

### T+5min: First Index Complete
- Title index finishes (smallest)
- Title searches on ALL 10,000 existing docs now take ~2ms
- New documents automatically added to index

### T+10min: GIN Indexes Building
- PostgreSQL building inverted indexes for arrays
- Reading every author and platform from existing docs
- Creating mappings like:
  - "John Doe" → [doc1, doc5, doc99, ...]
  - "LessWrong" → [doc2, doc7, doc101, ...]

### T+15min: All Indexes Complete
- All 7 indexes built
- Existing document searches now:
  - Title search: ~2ms (was 200ms) ✅
  - Author search: ~5ms (was 300ms) ✅
  - Recent docs: ~1ms (was 150ms) ✅
- Future documents automatically indexed on insert

## What PostgreSQL Does Behind the Scenes

### Building Phase
1. **Creates shadow index structure**
   - Doesn't touch main table
   - Builds in parallel

2. **Scans every row**
   ```
   For each document_version:
     - Extract LOWER(title) → Add to title index
     - Extract authors array → Add each to GIN index
     - Extract platforms array → Add each to GIN index
     - Extract first 1000 chars → Add to content index
   ```

3. **Handles ongoing changes**
   - New inserts during build: Added to both table and shadow index
   - Updates during build: Tracked and applied
   - Deletes during build: Marked in shadow index

4. **Atomic swap**
   - Shadow index becomes live
   - Old queries instantly use new index

### Maintenance Phase (Forever)
- Every INSERT: Automatically updates all relevant indexes
- Every UPDATE: Removes old values, adds new values
- Every DELETE: Removes from indexes
- No manual intervention needed

## Real Example

Let's say you have a document:
```
Title: "Machine Learning in Production"
Authors: ["Alice Smith", "Bob Jones"]
Platforms: ["LessWrong", "EA Forum"]
Content: "This article discusses..."
```

### Before Index
Search: `WHERE LOWER(title) LIKE '%machine%'`
- PostgreSQL reads all 10,000 rows
- Applies LOWER() to each title
- Compares each with '%machine%'
- Returns matches

### After Index
Same search:
- PostgreSQL uses idx_document_versions_title_lower
- Jumps directly to 'machine' entries
- Returns matches
- 100x faster

## Common Concerns

### "Will it miss my old documents?"
**No.** Indexes are built on ALL existing data. Every single existing document is included.

### "Do I need to reindex periodically?"
**No.** PostgreSQL maintains indexes automatically. They stay up-to-date forever.

### "What if I have millions of documents?"
- Build time longer (maybe hours)
- But still no downtime (CONCURRENTLY)
- Benefits even greater (1000x speedup possible)

### "What about documents added during index creation?"
**Handled automatically.** PostgreSQL tracks all changes during build and includes them.

## Verification After Migration

Check that existing documents are using indexes:
```sql
-- Pick a real document title from your database
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM document_versions 
WHERE LOWER(title) LIKE '%your actual title%';

-- Should show:
-- "Index Scan using idx_document_versions_title_lower"
-- NOT "Seq Scan"
```

## The Magic of Database Indexes

Think of it like a book:
- **Without index**: Read every page to find "PostgreSQL"
- **With index**: Look up "PostgreSQL" in the back, go to page 247

The "index at the back" includes EVERY word in the book, not just new chapters added after printing!