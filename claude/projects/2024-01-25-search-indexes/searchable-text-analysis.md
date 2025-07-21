# Searchable Text Field Analysis

## Current Situation
- PostgreSQL arrays (authors, platforms, urls) don't support substring matching efficiently
- Local search can check substrings in joined author string, but server can't
- This creates inconsistent search results between local and server

## Proposed Solution: Add `searchableText` Field

### Option 1: Simple Concatenated Text Field

**Implementation:**
```typescript
searchableText = "title author1 author2 platform1 platform2 url1 importUrl"
```

**Pros:**
- Simple substring matching with `LIKE '%query%'`
- Consistent search between client and server
- Can use simple B-tree index
- Easy to understand and debug

**Cons:**
- Duplicates data already in other columns
- Must be updated whenever document version changes
- Takes additional storage space
- Not as efficient as specialized indexes

### Option 2: PostgreSQL Full-Text Search

**Implementation:**
```sql
searchableText = to_tsvector('english', title || ' ' || array_to_string(authors, ' '))
CREATE INDEX ... USING GIN(searchableText)
```

**Pros:**
- Built for text search
- Handles stemming, stop words
- Very efficient for word matching
- Supports ranking/relevance

**Cons:**
- Doesn't support substring matching (can't find "Ozz" in "Ozzie")
- More complex to implement
- Requires different query syntax
- May not match user expectations

### Option 3: Hybrid Approach

**Implementation:**
- Keep searchableText for substring matching
- Keep specific indexes for exact matches
- Use searchableText as fallback

**Pros:**
- Best of both worlds
- Can optimize specific queries
- Gradual migration path

**Cons:**
- More complex
- More indexes to maintain
- Potentially confusing which index is used when

## Version Management Considerations

### Problem: DocumentVersion Changes
When a new version is created, searchableText must be updated

**Solutions:**
1. **Database Trigger** (Recommended)
   ```sql
   CREATE OR REPLACE FUNCTION update_searchable_text()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.searchableText = LOWER(
       NEW.title || ' ' || 
       array_to_string(NEW.authors, ' ') || ' ' || 
       array_to_string(NEW.platforms, ' ')
     );
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER update_searchable_text_trigger
   BEFORE INSERT OR UPDATE ON "DocumentVersion"
   FOR EACH ROW EXECUTE FUNCTION update_searchable_text();
   ```

2. **Application Logic**
   - Update in Document.create()
   - Update in Document.update() (if it exists)
   - Risk: Easy to forget in new code paths

3. **Computed Column** (PostgreSQL 12+)
   ```sql
   searchableText TEXT GENERATED ALWAYS AS (
     LOWER(title || ' ' || array_to_string(authors, ' '))
   ) STORED
   ```

## Index Strategy

### Current Indexes to Keep:
1. **idx_documents_published_date_desc** - Still needed for sorting
2. **idx_document_versions_lookup** - Still needed for version queries
3. **idx_agent_versions_name_lower** - Agent search (separate table)
4. **idx_document_versions_import_url** - Exact URL duplicate checking

### Current Indexes to Drop:
1. **idx_document_versions_title_lower** ❌ - Replaced by searchableText
2. **idx_document_versions_content_prefix** ❌ - Not used, too expensive
3. **idx_document_versions_authors_gin** ❌ - Replaced by searchableText
4. **idx_document_versions_platforms_gin** ❌ - Replaced by searchableText
5. **idx_document_versions_urls_gin** ❌ - Replaced by searchableText
6. **idx_document_versions_intended_agents_gin** ❌ - Rarely searched

### New Index to Add:
1. **idx_document_versions_searchable_text** - Main search index

## Performance Analysis

### Before (Multiple Indexes):
- Storage: ~16KB per index × 6 indexes = ~96KB overhead per table
- Query planning: Must consider multiple indexes
- Write performance: Update 6 indexes on insert/update

### After (Single searchableText):
- Storage: ~16KB for one index + text field storage
- Query planning: Simple, one index to consider
- Write performance: Update 1 index + 1 field

### At Scale (1000 documents):
- **Before**: Complex query plans, multiple index scans
- **After**: Single index scan, predictable performance

## Migration Plan

### Phase 1: Add Field and Populate
```sql
-- Add column
ALTER TABLE "DocumentVersion" ADD COLUMN "searchableText" TEXT;

-- Create trigger for future updates
CREATE OR REPLACE FUNCTION update_searchable_text()...

-- Populate existing data
UPDATE "DocumentVersion" SET searchableText = ...

-- Add index
CREATE INDEX CONCURRENTLY idx_document_versions_searchable_text ON "DocumentVersion" ("searchableText");
```

### Phase 2: Update Application
1. Update Document.create() to populate searchableText
2. Update search queries to use searchableText
3. Test thoroughly

### Phase 3: Drop Old Indexes (After Verification)
```sql
DROP INDEX CONCURRENTLY idx_document_versions_title_lower;
DROP INDEX CONCURRENTLY idx_document_versions_authors_gin;
-- etc.
```

## Recommendation

**Go with Option 1 (Simple Concatenated Text) with a Database Trigger**

**Reasons:**
1. Solves the immediate problem (substring matching on arrays)
2. Simple to understand and maintain
3. Consistent with user expectations
4. Trigger ensures data stays in sync
5. Can evolve to full-text search later if needed

**Implementation Steps:**
1. Add searchableText column
2. Create database trigger for automatic updates
3. Populate existing data
4. Add single B-tree index
5. Update search to use new field
6. Drop redundant indexes after verification

**Storage Impact:**
- Additional ~100-200 bytes per document version
- Save ~80KB by dropping 5 indexes
- Net: Probably saves space!

**Query Simplification:**
- From: Complex OR with multiple conditions
- To: Single WHERE clause with substring match
- Much easier to reason about and optimize